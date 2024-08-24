package com.kartographia.prospekt.server;
import com.kartographia.prospekt.model.User;
import com.kartographia.prospekt.model.Person;
import com.kartographia.prospekt.model.Company;
import com.kartographia.prospekt.service.*;
import com.kartographia.prospekt.source.*;

import java.util.*;
import java.io.IOException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.stream.Collectors;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;


import javaxt.sql.*;
import javaxt.json.*;
import javaxt.io.Jar;
import javaxt.encryption.BCrypt;
import static javaxt.utils.Timer.*;

import javaxt.express.*;
import javaxt.express.notification.*;
import javaxt.express.utils.DbUtils;
import javaxt.express.utils.DateUtils;
import javaxt.express.services.QueryService.QueryJob;

import javaxt.http.servlet.ServletException;
import javaxt.http.servlet.HttpServletRequest;
import javaxt.http.servlet.HttpServletResponse;
import javaxt.http.websocket.WebSocketListener;


//******************************************************************************
//**  WebServices
//******************************************************************************
/**
 *   Used to route HTTP requests to web services
 *
 ******************************************************************************/

public class WebServices extends WebService {

    private ConcurrentHashMap<Long, Long> activeUsers;
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
        webservices.put("report", new ReportService());
        webservices.put("files", new FileService(jar));


      //Create list of active users
        createActiveUsers();


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
            else if (model.equals("File")){
                me.notify(event+","+model+","+data+","+userID);
            }
            else if (model.equals("WebFile")){
                me.notify(event+","+model+","+modelID+","+userID);
            }
            else if (model.equals("WebRequest")){
                javaxt.utils.Record webRequest = (javaxt.utils.Record) data.toObject();
                userID = webRequest.get("userID").toLong();
                updateActiveUsers(webRequest, timestamp);
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
            ServiceResponse serviceResponse = getServiceResponse(service, serviceRequest, Config.getDatabase());
            serviceResponse.send(httpResponse, serviceRequest);
        }
    }


  //**************************************************************************
  //** getServiceResponse
  //**************************************************************************
  /** Used when this service is hosted in another service
   */
    public ServiceResponse getServiceResponse(ServiceRequest request, Database database)
        throws ServletException {

        HttpServletRequest httpRequest = request.getRequest();
        //if (httpRequest.isWebSocket()){} ??


      //Get path from url, excluding servlet path and leading "/" character
        String path = httpRequest.getPathInfo();
        if (path!=null) path = path.substring(1);


      //Get first "directory" in the path
        String service = path==null ? "" : path.toLowerCase();
        if (service.contains("/")) service = service.substring(0, service.indexOf("/"));


        return getServiceResponse(service, request, database);
    }


  //**************************************************************************
  //** getServiceResponse
  //**************************************************************************
    private ServiceResponse getServiceResponse(String service,
        ServiceRequest request, Database database) throws ServletException {


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


      //Parse payload as needed
        boolean parseJson = true;
        String contentType = request.getRequest().getContentType();
        if (contentType!=null){
            if (contentType.startsWith("multipart/form-data")){
                parseJson = false;
            }
        }
        if (parseJson) request.parseJson();


      //Generate response
        if (webservices.containsKey(service)){
            request.setPath(path);
            return webservices.get(service).getServiceResponse(request, database);
        }
        else{
            return super.getServiceResponse(request, database);
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


  //**************************************************************************
  //** getBusinessTypes
  //**************************************************************************
  /** Returns a distinct list of business type codes found in the company
   *  table.
   */
    public ServiceResponse getBusinessTypes(ServiceRequest request, Database database) throws Exception {

        try (Connection conn = database.getConnection()){
            JSONArray arr = new JSONArray();

            if (database.getDriver().equals("PostgreSQL")){

                for (Record r : conn.getRecords(
                    "SELECT DISTINCT(unnest(business_type)) as business_types FROM company")){
                    String tag = r.get(0).toString();
                    if (tag==null || tag.isBlank()) continue;
                    arr.add(tag);
                }
                return new ServiceResponse(arr);

            }
            else if (database.getDriver().equals("H2")){

                TreeSet<String> tags = new TreeSet<>();
                for (Record r : conn.getRecords(
                    "SELECT DISTINCT(business_type) as business_types FROM company where business_type is not null")){
                    for (Object obj : (Object[]) r.get(0).toArray()){
                        tags.add(obj.toString());
                    }
                }
                for (String tag : tags){
                    arr.add(tag);
                }

                return new ServiceResponse(arr);
            }
            else{
                return new ServiceResponse(501);
            }
        }
    }


  //**************************************************************************
  //** getTags
  //**************************************************************************
  /** Returns a distinct list of tags for a given table
   */
    public ServiceResponse getTags(ServiceRequest request, Database database) throws Exception {
        String source = request.getParameter("source").toString();
        if (source==null) source = "";
        if (source.equalsIgnoreCase("companies")){
            try (Connection conn = database.getConnection()){
                JSONArray arr = new JSONArray();

                if (database.getDriver().equals("PostgreSQL")){

                    for (Record r : conn.getRecords(
                        "SELECT DISTINCT(unnest(tags)) as tags FROM company")){
                        String tag = r.get(0).toString();
                        if (tag==null || tag.isBlank()) continue;
                        arr.add(tag);
                    }
                    return new ServiceResponse(arr);

                }
                else if (database.getDriver().equals("H2")){

                    TreeSet<String> tags = new TreeSet<>();
                    for (Record r : conn.getRecords(
                        "SELECT DISTINCT(tags) as tags FROM company where tags is not null")){
                        for (Object obj : (Object[]) r.get(0).toArray()){
                            tags.add(obj.toString());
                        }
                    }
                    for (String tag : tags){
                        arr.add(tag);
                    }

                    return new ServiceResponse(arr);
                }
                else{
                    return new ServiceResponse(501);
                }
            }
        }
        return new ServiceResponse(400);
    }


  //**************************************************************************
  //** updateCompanyInfo
  //**************************************************************************
  /** Used to update the "info" attribute for a company. Unlike the default
   *  "save" method, the caller doesn't need to provide the full json
   *  representation of a company. Instead, the caller can simply provide the
   *  company ID with json info.
   */
    public ServiceResponse updateCompanyInfo(ServiceRequest request) throws ServletException {
        try{
            javaxt.express.User user = (javaxt.express.User) request.getUser();
            //if (user.getAccessLevel()<3) return new ServiceResponse(403, "Not Authorized");
            long userID = user.getID();

            Company company = new Company(request.getID());
            JSONObject info = company.getInfo();
            if (info==null) info = new JSONObject();


            JSONObject json = request.getJson();
            for (String key : json.keySet()){
                if (key.equals("id") || key.equals("monthlyRevenue")) continue;

                if (key.equals("likes")){

                    JSONObject likes = info.get("likes").toJSONObject();
                    if (likes==null) likes = new JSONObject();

                    Integer val = json.get(key).toInteger();
                    if (val!=null){
                        if (val<0){
                            likes.remove(userID+"");
                        }
                        else{
                            likes.set(userID+"", new javaxt.utils.Date().toISOString());
                        }
                    }

                    company.setLikes((long) likes.length());
                    info.set("likes", likes);
                }
                else if (key.equals("tags")){

                    String tags = request.getParameter("tags").toString().trim();
                    if (tags.equals("-")) company.setTags(null);
                    else {
                        LinkedHashSet<String> uniqueTags = new LinkedHashSet<>();
                        for (String tag : tags.split(",")){
                            tag = tag.trim();
                            if (tag.equals("-")) continue;
                            if (tag.length()>0){
                                boolean addTag = true;
                                for (String t : uniqueTags){
                                    if (t.equalsIgnoreCase(tag)){
                                        addTag = false;
                                        break;
                                    }
                                }
                                if (addTag) uniqueTags.add(tag);
                            }
                        }
                        if (uniqueTags.isEmpty()) company.setTags(null);
                        else{
                            company.setTags(uniqueTags.toArray(new String[uniqueTags.size()]));
                        }
                    }

                }
                else if (key.equals("description")){
                    String description = request.getParameter("description").toString().trim();
                    if (description.equals("-")) description = null;
                    company.setDescription(description);
                }
                else{
                    info.set(key, json.get(key));
                }
            }

            company.setInfo(info);
            company.save();

            notify("update", company, user);

            return new ServiceResponse(company.toJson());
        }
        catch(Exception e){
            return new ServiceResponse(e);
        }
    }


  //**************************************************************************
  //** getCompanyGroup
  //**************************************************************************
  /** Overrides the native getCompanyGroup method by checking permissions and
   *  customizing the JSON response.
   */
    public ServiceResponse getCompanyGroup(ServiceRequest request, Database database)
        throws Exception {

        javaxt.express.User user = (javaxt.express.User) request.getUser();
        //if (user.getAccessLevel()<3) return new ServiceResponse(403, "Not Authorized");
        long userID = user.getID();

        Long groupID = request.getID();
        if (groupID==null) groupID = request.getParameter("groupID").toLong();
        if (groupID==null) return new ServiceResponse(400, "id or groupID is required");


        try (Connection conn = database.getConnection()){

          //Check permissions
            Record record = conn.getRecord("select * from COMPANY_GROUP_ACCESS " +
            "where COMPANY_GROUP_ID=" + groupID + " AND USER_ID=" + userID);
            if (record==null) return new ServiceResponse(403, "Access Denied");
            int accessLevel = record.get("access_level").toInteger();

            record = conn.getRecord("select * from COMPANY_GROUP where id="+groupID);
            if (record==null) return new ServiceResponse(404);
            JSONObject group = DbUtils.getJson(record);
            group.set("accessLevel", accessLevel);

          //Get companyIDs associated with the group
            for (Record r : conn.getRecords(
            "select * from COMPANY_GROUP_COMPANY where COMPANY_GROUP_ID="+groupID)){
                long companyID = r.get("COMPANY_ID").toLong();
                JSONArray companies = group.get("companies").toJSONArray();
                if (companies==null){
                    companies = new JSONArray();
                    group.set("companies", companies);
                }
                companies.add(companyID);
            }


          //Get users associated with the group
            for (Record r : conn.getRecords(
            "select * from COMPANY_GROUP_ACCESS where COMPANY_GROUP_ID=" + groupID)){
                JSONObject usr = new JSONObject();
                usr.set("userID", r.get("USER_ID"));
                usr.set("accessLevel", r.get("ACCESS_LEVEL"));

                JSONArray users = group.get("users").toJSONArray();
                if (users==null){
                    users = new JSONArray();
                    group.set("users", users);
                }
                users.add(usr);
            }


            return new ServiceResponse(group);
        }
    }


  //**************************************************************************
  //** getCompanyGroups
  //**************************************************************************
  /** Overrides the native getCompanyGroups method by checking permissions and
   *  customizing the JSON response.
   */
    public ServiceResponse getCompanyGroups(ServiceRequest request, Database database) throws Exception {

        javaxt.express.User user = (javaxt.express.User) request.getUser();
        long userID = user.getID();


        LinkedHashMap<Long, JSONObject> groups = new LinkedHashMap<>();
        try (Connection conn = database.getConnection()){


          //Get groups that the user has access to
            for (Record record : conn.getRecords(
            "select COMPANY_GROUP.*, ACCESS_LEVEL from COMPANY_GROUP " +
            "join COMPANY_GROUP_ACCESS on COMPANY_GROUP.ID=COMPANY_GROUP_ACCESS.COMPANY_GROUP_ID " +
            "where USER_ID="+userID)){
                long groupID = record.get("id").toLong();
                JSONObject group = DbUtils.getJson(record);
                groups.put(groupID, group);
            }


          //Update groups with additional metadata (e.g. companyIDs and users)
            if (!groups.isEmpty()){
                String groupIDs = groups.keySet().stream().map(Object::toString).collect(Collectors.joining(","));


              //Get companyIDs associated with the group
                for (Record record : conn.getRecords(
                "select * from COMPANY_GROUP_COMPANY where COMPANY_GROUP_ID in (" + groupIDs + ")")){
                    long groupID = record.get("COMPANY_GROUP_ID").toLong();
                    long companyID = record.get("COMPANY_ID").toLong();

                    JSONObject group = groups.get(groupID);

                    JSONArray companies = group.get("companies").toJSONArray();
                    if (companies==null){
                        companies = new JSONArray();
                        group.set("companies", companies);
                    }
                    companies.add(companyID);
                }


              //Get users associated with the group
                for (Record record : conn.getRecords(
                "select * from COMPANY_GROUP_ACCESS where COMPANY_GROUP_ID in (" + groupIDs + ")")){
                    long groupID = record.get("COMPANY_GROUP_ID").toLong();

                    JSONObject usr = new JSONObject();
                    usr.set("userID", record.get("USER_ID"));
                    usr.set("accessLevel", record.get("ACCESS_LEVEL"));

                    JSONObject group = groups.get(groupID);
                    JSONArray users = group.get("users").toJSONArray();
                    if (users==null){
                        users = new JSONArray();
                        group.set("users", users);
                    }
                    users.add(usr);

                }
            }
        }


      //Generate response
        JSONArray arr = new JSONArray();
        Iterator<Long> it = groups.keySet().iterator();
        while (it.hasNext()){
            Long groupID = it.next();
            JSONObject group = groups.get(groupID);
            arr.add(group);
        }
        return new ServiceResponse(arr);
    }


  //**************************************************************************
  //** saveCompanyGroup
  //**************************************************************************
  /** Overrides the native saveCompanyGroup method by ensuring all the group
   *  tables are accessed and updated correctly.
   */
    public ServiceResponse saveCompanyGroup(ServiceRequest request, Database database)
        throws Exception {

      //Get user
        javaxt.express.User user = (javaxt.express.User) request.getUser();
        //if (user.getAccessLevel()<3) return new ServiceResponse(403, "Not Authorized");
        long userID = user.getID();


      //Get payload
        JSONObject group = request.getJson();
        if (group==null) group = new JSONObject();


      //Get groupID
        Long groupID = group.get("id").toLong();
        if (groupID==null) groupID = request.getParameter("groupID").toLong();
        String action = groupID==null ? "create" : "update";


      //Get companies
        HashSet<Long> companyIDs = new HashSet<>();
        JSONArray companies = group.get("companies").toJSONArray();
        if (companies==null) companies = new JSONArray();
        for (JSONValue v : companies){
            Long companyID = v.toLong();
            companyIDs.add(companyID);
        }
        if (groupID==null && companyIDs.isEmpty()){
            return new ServiceResponse(400, "companies required");
        }


      //Get users
        HashMap<Long, Integer> permissions = new HashMap<>();
        JSONArray users = group.get("users").toJSONArray();
        if (users==null) users = new JSONArray();
        if (users.isEmpty()){
            permissions.put(userID, 3);
        }
        else{
            for (JSONValue u : users){
                Long uid = u.get("userID").toLong();
                if (uid==null) continue;
                Integer accessLevel = u.get("accessLevel").toInteger();
                if (accessLevel==null) accessLevel = 1;
                permissions.put(uid, accessLevel);
            }
        }



      //Create new group as needed
        if (groupID==null){
            String name = request.getParameter("name").toString();
            if (name==null || name.isBlank()) return new ServiceResponse(400, "name or groupID is required");
            try (Connection conn = database.getConnection()){
                try (Recordset rs = conn.getRecordset("select * from COMPANY_GROUP where UPPER(name)='" +
                    name.replace("'", "''").toUpperCase() + "'", false)){
                    if (rs.EOF){
                        rs.addNew();
                        rs.setValue("name", name);
                        rs.update();
                        groupID = rs.getGeneratedKey().toLong();
                    }
                    else{
                        groupID = rs.getValue("id").toLong();
                        action = "update";
                    }
                }
            }
        }



      //Update group
        try (Connection conn = database.getConnection()){


          //Check permissions
            if (action.equals("update")){
                Record r = conn.getRecord("select id from COMPANY_GROUP_ACCESS " +
                "where COMPANY_GROUP_ID=" + groupID + " AND USER_ID=" + userID +
                " AND ACCESS_LEVEL>1");
                if (r==null) return new ServiceResponse(403, "Access Denied");
            }



          //Update group properties
            try (Recordset rs = conn.getRecordset(
                "select * from COMPANY_GROUP where id="+groupID, false)){

                String name = request.getParameter("name").toString();
                if (!(name==null || name.isBlank())) rs.setValue("name", name);

                JSONObject info = group.get("info").toJSONObject();
                if (info==null) info = new JSONObject();

                JSONObject currInfo = new JSONObject();
                String str = rs.getValue("info").toString();
                if (str!=null) currInfo = new JSONObject(str);

                if (!currInfo.equals(info)){
                    rs.setValue("info", new javaxt.sql.Function(
                        "?::jsonb", info.toString()
                    ));
                }

                rs.update();
            }




          //Create/update lists of companyIDs to add or remove
            HashSet<Long> deletions = new HashSet<>();
            for (Record record : conn.getRecords(
            "select COMPANY_ID from COMPANY_GROUP_COMPANY where COMPANY_GROUP_ID=" + groupID)){
                Long companyID = record.get("COMPANY_ID").toLong();
                if (companyIDs.contains(companyID)){
                    companyIDs.remove(companyID);
                }
                else{
                    deletions.add(companyID);
                }
            }


          //Add company IDs to group
            if (!companyIDs.isEmpty()){
                try (Recordset rs = conn.getRecordset(
                    "select * from COMPANY_GROUP_COMPANY where COMPANY_GROUP_ID=-1", false)){
                    for (Long companyID : companyIDs){
                        rs.addNew();
                        rs.setValue("COMPANY_GROUP_ID", groupID);
                        rs.setValue("COMPANY_ID", companyID);
                        rs.update();
                    }
                }
            }


          //Remove company IDs from group
            for (Long companyID : deletions){
                conn.execute(
                "delete from COMPANY_GROUP_COMPANY " +
                "where COMPANY_GROUP_ID=" + groupID +
                " and COMPANY_ID=" + companyID);
            }
            deletions.clear();




          //Create/update lists of users to add or remove
            for (Record record : conn.getRecords(
            "select USER_ID, ACCESS_LEVEL from COMPANY_GROUP_ACCESS " +
            "where COMPANY_GROUP_ID=" + groupID)){
                Long uid = record.get("USER_ID").toLong();
                Integer accessLevel = record.get("ACCESS_LEVEL").toInteger();

                if (permissions.containsKey(uid)){
                    if (accessLevel.equals(permissions.get(uid))){
                        permissions.remove(uid);
                    }
                }
                else{
                    deletions.add(uid);
                }
            }


          //Add or update users to the group
            Iterator<Long> it = permissions.keySet().iterator();
            while (it.hasNext()){
                Long uid = it.next();
                Integer accessLevel = permissions.get(uid);
                try (Recordset rs = conn.getRecordset(
                    "select * from COMPANY_GROUP_ACCESS " +
                    "where COMPANY_GROUP_ID=" + groupID +
                    " AND USER_ID=" + uid, false)){
                    if (rs.EOF){
                        rs.addNew();
                        rs.setValue("COMPANY_GROUP_ID", groupID);
                        rs.setValue("USER_ID", uid);
                    }
                    rs.setValue("ACCESS_LEVEL", accessLevel);
                    rs.update();
                }
            }


          //Remove users from the group
            for (Long uid : deletions){
                conn.execute(
                "delete from COMPANY_GROUP_ACCESS " +
                "where COMPANY_GROUP_ID=" + groupID +
                " and USER_ID=" + uid);
            }
            deletions.clear();

        }


      //Return response
        notify(action+",CompanyGroup,"+groupID+","+userID);
        return new ServiceResponse(200);
    }


  //**************************************************************************
  //** deleteCompanyGroup
  //**************************************************************************
  /** Overrides the native deleteCompanyGroup method by checking user
   *  permissions before deleting the group.
   */
    public ServiceResponse deleteCompanyGroup(ServiceRequest request, Database database)
        throws Exception {

        javaxt.express.User user = (javaxt.express.User) request.getUser();
        long userID = user.getID();

        Long groupID = request.getID();
        if (groupID==null) groupID = request.getParameter("groupID").toLong();
        if (groupID==null) return new ServiceResponse(400, "id or groupID is required");


        try (Connection conn = database.getConnection()){

          //Check permissions
            Record record = conn.getRecord("select * from COMPANY_GROUP_ACCESS " +
            "where COMPANY_GROUP_ID=" + groupID + " AND USER_ID=" + userID);
            if (record==null) return new ServiceResponse(403, "Access Denied");
            int accessLevel = record.get("access_level").toInteger();
            if (accessLevel<3) return new ServiceResponse(403, "Access Denied");

          //If we're still here, delete the group
            conn.execute("delete from COMPANY_GROUP where ID="+groupID);
        }


      //Return response
        notify("delete,CompanyGroup,"+groupID+","+userID);
        return new ServiceResponse(200,groupID+"");
    }


  //**************************************************************************
  //** getActiveUsers
  //**************************************************************************
    public ServiceResponse getActiveUsers(ServiceRequest request, Database database)
        throws Exception {

        JSONObject json = new JSONObject();
        synchronized(activeUsers){
            Iterator<Long> it = activeUsers.keySet().iterator();
            while (it.hasNext()){
                long userID = it.next();
                long lastEvent = DateUtils.getMilliseconds(activeUsers.get(userID));
                json.set(userID+"", lastEvent);
            }
        }
        return new ServiceResponse(json);
    }


  //**************************************************************************
  //** createActiveUsers
  //**************************************************************************
    private void createActiveUsers(){

        activeUsers = new ConcurrentHashMap<>();

      //Create timer task to periodically clean up activeUsers
        setInterval(()->{
            long currTime = DateUtils.getCurrentTime();
            long maxIdle = 5*60*1000; //5 minutes
            ArrayList<Long> inactiveUsers = new ArrayList<>();
            synchronized(activeUsers){
                Iterator<Long> it = activeUsers.keySet().iterator();
                while (it.hasNext()){
                    long userID = it.next();
                    long lastEvent = activeUsers.get(userID);
                    if (DateUtils.getMilliseconds(currTime-lastEvent)>maxIdle){
                        inactiveUsers.add(userID);
                    }
                }

                for (long userID : inactiveUsers){
                    activeUsers.remove(userID);
                    notify("inactive,User,"+userID+","+userID);
                }
                activeUsers.notify();
            }
        }, 30*1000); //30 seconds
    }


  //**************************************************************************
  //** updateActiveUsers
  //**************************************************************************
    private void updateActiveUsers(javaxt.utils.Record webRequest, long timestamp){

        Long userID = webRequest.get("userID").toLong();
        if (userID==null) return;

        String path = webRequest.get("path").toString();
        if (path==null) path = "";
        if (path.startsWith("/")) path = path.substring(1);

        String service = path.toLowerCase();
        if (service.contains("/")) service = service.substring(0, service.indexOf("/"));


        synchronized(activeUsers){
            if (service.equals("logoff")){
                activeUsers.remove(userID);
                notify("inactive,User,"+userID+","+userID);
            }
            else{
                Long t = activeUsers.get(userID);
                if (t==null) t = 0L;
                if (t>=timestamp) return;
                activeUsers.put(userID, timestamp);
            }
            activeUsers.notify();
        }
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
            public void onText(String str){
                if (str==null || str.isBlank()) return; //ping messages
                javaxt.express.User user = (javaxt.express.User) request.getUserPrincipal();
                //console.log(user.getID(), str);

                if (str.startsWith("userActivity")){
                    javaxt.utils.Record info = new javaxt.utils.Record();
                    info.set("method", "websocket");
                    info.set("path", "");
                    info.set("userID", user.getID());
                    javaxt.utils.Value data = new javaxt.utils.Value(info);
                    String event = "websocket";
                    String model = "WebRequest";
                    NotificationService.notify(event, model, data);
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
    protected void notify(String action, Model model, javaxt.express.User user){
        Long userID = user==null ? null : user.getID();
        notify(action+","+model.getClass().getSimpleName()+","+model.getID()+","+userID);
    }


  //**************************************************************************
  //** notify
  //**************************************************************************
    protected void notify(String msg){
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