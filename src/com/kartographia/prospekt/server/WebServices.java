package com.kartographia.prospekt.server;
import com.kartographia.prospekt.model.User;
import com.kartographia.prospekt.model.Person;
import com.kartographia.prospekt.service.*;
import com.kartographia.prospekt.source.*;

import java.util.*;
import java.io.IOException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;


import javaxt.sql.*;
import javaxt.json.*;
import javaxt.io.Jar;
import javaxt.encryption.BCrypt;
import static javaxt.express.WebService.console;

import javaxt.express.WebService;
import javaxt.express.ServiceRequest;
import javaxt.express.ServiceResponse;
import javaxt.express.services.QueryService.QueryJob;
import javaxt.express.notification.NotificationService;

import javaxt.http.servlet.HttpServletRequest;
import javaxt.http.servlet.HttpServletResponse;
import javaxt.http.servlet.ServletException;
import javaxt.http.websocket.WebSocketListener;


public class WebServices extends WebService {

    private ConcurrentHashMap<String, WebService> webservices;
    private ConcurrentHashMap<Long, WebSocketListener> listeners;
    private static AtomicLong webSocketID;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public WebServices(Jar jar) throws Exception {

      //Register classes that this service will support
        for (Class c : jar.getClasses()){
            if (javaxt.sql.Model.class.isAssignableFrom(c)){
                addModel(c);
            }
        }


      //Instantiate web services
        webservices = new ConcurrentHashMap<>();
        webservices.put("sql", new SQLService());
        //webservices.put("awards", new AwardService());


      //Websocket stuff
        webSocketID = new AtomicLong(0);
        listeners = new ConcurrentHashMap<>();


      //Route notifications to websocket listeners
        WebServices me = this;
        NotificationService.addListener((
            String event, String model, javaxt.utils.Value data, long timestamp)->{

          //Simulate notify(String action, Model model, User user)
          //notify(action+","+model.getClass().getSimpleName()+","+model.getID()+","+userID);
            long modelID = 0;
            long userID = -1;
            if (model.equals("SQL")){
                QueryJob queryJob = (QueryJob) data.toObject();
                userID = queryJob.getUserID();
                me.notify(event+","+model+","+queryJob.getID()+","+userID);
            }
            else if (model.equals("WebFile")){
                me.notify(event+","+model+","+modelID+","+userID);
            }
            else if (model.equals("WebRequest")){
                userID = data.toLong();
                me.notify(event+","+model+","+modelID+","+userID);
            }

        });
    }


  //**************************************************************************
  //** processRequest
  //**************************************************************************
  /** Used to process an HTTP request and generate an HTTP response.
   */
    protected void processRequest(String service, String path,
        HttpServletRequest httpRequest, HttpServletResponse httpResponse)
        throws ServletException, IOException {


        if (httpRequest.isWebSocket()){
            createWebSocket(service, path, httpRequest, httpResponse);
        }
        else{
            ServiceRequest serviceRequest = new ServiceRequest(httpRequest);
            serviceRequest.setPath(path);
            ServiceResponse serviceResponse = getServiceResponse(service, serviceRequest);
            serviceResponse.send(httpResponse, serviceRequest);
        }
    }


  //**************************************************************************
  //** getServiceResponse
  //**************************************************************************
    private ServiceResponse getServiceResponse(String service, ServiceRequest request)
        throws ServletException {


      //Authenticate request
        try{
            request.authenticate();
        }
        catch(Exception e){
            return new ServiceResponse(403, "Not Authorized");
        }


      //Update path to the webservice
        String path = request.getPath();
        if (path.startsWith("/")) path = path.substring(1);
        path = path.substring(service.length());


      //Parse payload
        request.parseJson();


      //Generate response
        if (webservices.containsKey(service)){
            request.setPath(path);
            return webservices.get(service).getServiceResponse(request);
        }
        else{
            return getServiceResponse(request, Config.getDatabase());
        }

    }


  //**************************************************************************
  //** getLastUpdate
  //**************************************************************************
  /** Returns date associated with the last update for a given data source
   */
    public ServiceResponse getLastUpdate(ServiceRequest request) throws ServletException {
        String source = request.getParameter("source").toString();
        if (source==null) source = "";
        if (source.equalsIgnoreCase("Awards") || source.equalsIgnoreCase("USASpending")){
            return new ServiceResponse(USASpending.getDate());
        }
        return new ServiceResponse(400);
    }



    public ServiceResponse getOpportunitiesV2(ServiceRequest request, Database database) throws ServletException {

        request.setPath("/opportunities"); //hack so we can call super
        byte[] b = (byte[]) super.getServiceResponse(request, database).getResponse();
        JSONObject json = new JSONObject(new String(b));

        JSONArray rows = json.get("rows").toJSONArray();
        JSONArray cols = json.get("cols").toJSONArray();


        JSONArray arr = new JSONArray();
        for (int i=0; i<rows.length(); i++){
            JSONArray row = rows.get(i).toJSONArray();

            json = new JSONObject();
            for (int j=0; j<row.length(); j++){
                JSONValue val = row.get(j);
                String field = cols.get(j).toString();
                json.set(field, val);
            }

            arr.add(json);
        }

        return new ServiceResponse(arr);
    }



  //**************************************************************************
  //** createWebSocket
  //**************************************************************************
    private void createWebSocket(String service, String path,
        HttpServletRequest request, HttpServletResponse response) throws IOException {

      //Authenticate request
        try{
            request.authenticate();
        }
        catch(Exception e){
            response.sendError(403, "Not Authorized");
            return;
        }


      //Check if the webservice associated with this request has its own
      //createWebSocket() method and invoke it
        WebService ws = webservices.get(service);
        if (ws!=null){
            for (Method m : ws.getClass().getDeclaredMethods()){
                if (Modifier.isPrivate(m.getModifiers())) continue;
                if (m.getName().equalsIgnoreCase("createWebSocket")){
                    Class<?>[] params = m.getParameterTypes();
                    if (params.length==2){

                        if (HttpServletRequest.class.isAssignableFrom(params[0]) &&
                            HttpServletResponse.class.isAssignableFrom(params[1])
                        ){
                            try{
                                m.setAccessible(true);
                                m.invoke(this, new Object[]{request, response});
                            }
                            catch(Exception e){
                                throw new IOException(e);
                            }

                            return;
                        }
                    }
                }
            }
        }


      //If we're still here, create web socket for this service
        new WebSocketListener(request, response){
            private Long id;
            public void onConnect(){
                id = webSocketID.incrementAndGet();
                synchronized(listeners){
                    listeners.put(id, this);
                }
            }
            public void onDisconnect(int statusCode, String reason){
                synchronized(listeners){
                    listeners.remove(id);
                }
            }
        };
    }


  //**************************************************************************
  //** onCreate
  //**************************************************************************
    public void onCreate(Object obj, ServiceRequest request){
        notify("create", (Model) obj, (User) request.getUser());
    };


  //**************************************************************************
  //** onUpdate
  //**************************************************************************
    public void onUpdate(Object obj, ServiceRequest request){
        notify("update", (Model) obj, (User) request.getUser());
    };


  //**************************************************************************
  //** onDelete
  //**************************************************************************
    public void onDelete(Object obj, ServiceRequest request){
        notify("delete", (Model) obj, (User) request.getUser());
    };


  //**************************************************************************
  //** notify
  //**************************************************************************
    private void notify(String action, Model model, User user){
        Long userID = user==null ? null : user.getID();
        notify(action+","+model.getClass().getSimpleName()+","+model.getID()+","+userID);
    }


  //**************************************************************************
  //** notify
  //**************************************************************************
    private void notify(String msg){
        synchronized(listeners){
            Iterator<Long> it = listeners.keySet().iterator();
            while(it.hasNext()){
                WebSocketListener ws = listeners.get(it.next());
                ws.send(msg);
            }
        }
    }


  //**************************************************************************
  //** getRecordset
  //**************************************************************************
  /** Used to update queries and modify payloads when executing CRUD
   *  operations on models.
   *  @param op Options include "list, "get", "save", and "delete"
   */
    protected Recordset getRecordset(ServiceRequest request, String op,
        Class c, String sql, Connection conn) throws Exception {


      //Get user and access level
        User user = (User) request.getUser();
        Integer accessLevel = user.getAccessLevel();



        String className = c.getSimpleName();
        if (className.equals("User")){

            if (op.equals("save") || op.equals("delete")){


              //Check permissions
                if (accessLevel<5){
                    Long userID = request.getParameter("id").toLong();
                    if (userID==null || user.getID()!=userID.longValue()){
                        throw new SecurityException();
                    }
                }


              //Make sure we don't delete the only admin
                if (op.equals("delete")){
                    Long userID = request.getParameter("id").toLong();
                    long numAdmins = getAdminCount(userID, conn);
                    if (numAdmins==0) throw new IllegalArgumentException(
                    "cannot delete only admin");
                }

            }
            else if (op.equals("list")){


              //Compile new sql statement. Join "user" to "person".
                javaxt.sql.Parser parser = new javaxt.sql.Parser(sql);
                String tableName = parser.getFromString();
                sql = request.getSelectStatement(User.class, Person.class) +
                " from " + tableName +
                " join person on " + tableName + ".person_id=person.id";


              //Add "where" statement. Since we are now joining two tables, we
              //need to generate a new where statement
                String where = request.getWhereStatement(User.class, Person.class);
                if (where!=null) sql += where;


              //Add orderby string
                String orderBy = parser.getOrderByString();
                if (orderBy!=null) sql += " order by " + orderBy;


              //Add limit and offset
                sql += request.getOffsetLimitStatement(conn.getDatabase().getDriver());
            }

        }
        else if (className.equals("UserPreference")){

            javaxt.sql.Parser parser = new javaxt.sql.Parser(sql);
            if (op.equals("get") || op.equals("list")){
                parser.setWhere("user_id=" + user.getID());
                sql = parser.toString();
            }
            else{
                sql = "select id from USER_PREFERENCE where " +
                "key='" + request.getParameter("key") + "' and " +
                "user_id=" + user.getID();


                if (op.equals("save")){
                    Record r = conn.getRecord(sql);
                    JSONObject payload = new JSONObject();
                    if (r!=null) payload.set("id", r.get("id"));
                    payload.set("key", request.getParameter("key"));
                    payload.set("value", request.getParameter("value"));
                    payload.set("userID", user.getID());
                    request.setPayload(payload.toString().getBytes("UTF-8"));
                }
            }

        }
        else if (className.equals("UserAuthentication")){

            if (op.equals("save") || op.equals("delete")){

              //Parse request
                Long userID = request.getParameter("userID").toLong();
                if (userID==null) throw new IllegalArgumentException("userID is required");

                String service = request.getParameter("service").toString();
                if (service==null) throw new IllegalArgumentException("service is required");
                service = service.toLowerCase();


              //Check permissions
                if (accessLevel<5){
                    if (user.getID()!=userID.longValue()) throw new SecurityException();
                }


              //Get tableName
                javaxt.sql.Parser parser = new javaxt.sql.Parser(sql);
                String tableName = parser.getFromString();


              //Update password as needed
                if (op.equals("save") && service.equals("database")){

                    JSONObject json = request.getJson();
                    String password = json.get("value").toString();
                    if (password==null){
                        javaxt.sql.Record record = conn.getRecord(
                        "select value from " + tableName +
                        " where user_id=" + userID +
                        " and service='" + service + "'");

                        if (record!=null){
                            password = record.get(0).toString();
                        }
                    }
                    else{
                        if (!BCrypt.hasSalt(password)){
                            password = BCrypt.hashpw(password);
                        }
                    }

                    json.set("value", password);
                }


              //Update query
                sql = "select id from " + tableName +
                " where user_id=" + userID +
                " and service='" + service + "'";


              //Update id
                setID(request, op, sql, conn);

            }

        }




      //Execute query and return recordset
        Recordset rs = new Recordset();
        if (op.equals("list")) rs.setFetchSize(1000);
        try{
            rs.open(sql, conn);
            return rs;
        }
        catch(Exception e){
            console.log(sql);
            throw e;
        }
    }

    private void setID(ServiceRequest request, String op, String sql, Connection conn) throws Exception {
        javaxt.sql.Record record = conn.getRecord(sql);
        Long id = record==null ? null : record.get(0).toLong();
        request.setParameter("id", id==null ? null : id.toString());
        if (op.equals("save")){
            request.getJson().set("id", id);
        }
    }


    /** Returns number of admins, excluding given userID */
    private long getAdminCount(long userID, Connection conn) throws Exception {
        String tableName = "user_access";
        javaxt.sql.Record record = conn.getRecord("select count(id) from " +
        tableName + " where level=5 and user_id <> " + userID);
        return record==null ? 0 : record.get(0).toLong();
    }


}