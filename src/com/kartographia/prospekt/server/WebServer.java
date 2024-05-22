package com.kartographia.prospekt.server;
import com.kartographia.prospekt.model.User;
import com.kartographia.prospekt.model.UserAuthentication;

import java.util.*;
import java.io.IOException;
import java.security.KeyStore;
import java.net.InetSocketAddress;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import javaxt.express.*;
import javaxt.express.notification.*;
import javaxt.express.utils.DateUtils;

import javaxt.http.servlet.*;

import javaxt.sql.*;
import javaxt.json.*;
import javaxt.io.Jar;
import javaxt.io.Directory;
import javaxt.utils.ThreadPool;
import javaxt.encryption.BCrypt;
import static javaxt.utils.Timer.*;
import static javaxt.utils.Console.*;


//******************************************************************************
//**  WebServer
//******************************************************************************
/**
 *   Used to start a server process that sends and receives socket connections
 *
 ******************************************************************************/

public class WebServer extends HttpServlet {

    private javaxt.io.Directory web;
    private javaxt.io.Directory logDir;
    private User defaultUser;
    private ArrayList<InetSocketAddress> addresses;
    private Integer maxThreads;
    private Logger logger;

    private WebServices ws;
    private FileManager fileManager;
    private EventProcessor eventProcessor;
    private Jar jar;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public WebServer() throws Exception {

      //Get config file
        Jar jar = new Jar(this.getClass());
        javaxt.io.File configFile =
            new javaxt.io.File(jar.getFile().getParentFile(), "config.json");


      //Initialize config
        Config.load(configFile, jar);
        Config.initDatabase();


      //Initialize this class
        JSONObject webConfig = Config.get("webserver").toJSONObject();
        init(webConfig, jar);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public WebServer(JSONObject config, Jar jar) throws Exception {
        init(config, jar);
    }


  //**************************************************************************
  //** init
  //**************************************************************************
  /** Used to initialize this class
   *  @param config webconfig from the config.json
   *  @param jar Jar file with domain models
   */
    private void init(JSONObject config, Jar jar) throws Exception {
        if (config==null) config = new JSONObject();
        this.jar = jar;


      //Set path to the web directory (required)
        if (config.has("webDir")){
            String webDir = config.get("webDir").toString();
            web = new javaxt.io.Directory(webDir);
            if (!web.exists() || webDir.length()==0){
                throw new IllegalArgumentException("Invalid \"webDir\" defined in config file");
            }
        }
        else{
            javaxt.io.Directory jarDir = new javaxt.io.Directory(jar.getFile().getParent());
            web = new javaxt.io.Directory(jarDir + "web");
            if (!web.exists()) web = new javaxt.io.Directory(jarDir.getParentDirectory() + "web");
            if (!web.exists()) throw new IllegalArgumentException("Failed to find web directory");
        }
        config.set("webDir", web.toString());


      //Get keystore (optional)
        KeyStore keystore = null;
        char[] keypass = null;
        if (config.has("keystore") && config.has("keypass")){
            try{
                keypass = config.get("keypass").toString().toCharArray();
                keystore = KeyStore.getInstance("JKS");
                keystore.load(new java.io.FileInputStream(config.get("keystore").toString()), keypass);
            }
            catch(Exception e){
                keystore = null;
                keypass = null;
            }
        }


      //Get default user (optional)
        if (config.has("disableAuth")){
            Boolean b = config.get("disableAuth").toBoolean();
            if (b==true){
                defaultUser = (User) config.get("defaultUser").toObject();
                if (defaultUser==null){
                    defaultUser = new User();
                }
            }
        }


      //Get logging info (optional)
        if (config.has("logDir")){
            try{
                logDir = new javaxt.io.Directory(config.get("logDir").toString());
                if (!logDir.exists()) logDir.create();
                if (!logDir.exists()) throw new Exception();
            }
            catch(Exception e){
                logDir = null;
                System.out.println("Invalid \"logDir\" defined in config file");
            }
        }
        if (logDir!=null) config.set("logDir", logDir.toString());


      //Generate list of socket addresses to bind to
        addresses = new ArrayList<>();
        Integer port = config.get("port").toInteger();
        addresses.add(new InetSocketAddress("0.0.0.0", port==null ? 80 : port));
        if (keystore!=null){
            try{
                setKeyStore(keystore, new String(keypass));
                setTrustStore(keystore);
                addresses.add(new InetSocketAddress("0.0.0.0", port==null ? 443 : port));
            }
            catch(Exception e){
                //e.printStackTrace();
            }
        }


      //Get max threads (optional)
        maxThreads = config.get("maxThreads").toInteger();
        if (maxThreads==null || maxThreads<0) maxThreads = 250;
    }


  //**************************************************************************
  //** start
  //**************************************************************************
  /** Used to start the web server and related services
   */
    public void start(){
        start(false);
    }


  //**************************************************************************
  //** start
  //**************************************************************************
  /** Used to start the web server and related services
   *  @param embedded If true, will not start an HTTP server. This method is
   *  used to embed the application in another web server.
   */
    public void start(boolean embedded){


      //Start the notification service
        NotificationService.start();


      //Start the EventProcessor
        eventProcessor = new EventProcessor();


      //Instantiate file manager
        fileManager = new FileManager(web);


      //Watch for changes to the web directory
        fileManager.getFileUpdates((Directory.Event event) -> {
            eventProcessor.processEvent(event);
        });



      //Instantiate web services
        try{
            ws = new WebServices(jar);
        }
        catch(Exception e){
            throw new RuntimeException(e);
        }


      //Start web logger
        if (logDir!=null){
            logger = new Logger(logDir.toFile());
            new Thread(logger).start();
        }


      //Instantiate authenticator
        setAuthenticator(new javaxt.express.Authenticator(){

            public java.security.Principal getPrinciple(){

                User user = (User) getUser();
                if (user!=null) return user;

                if (defaultUser!=null) user = defaultUser;
                else
                try{

                    String[] credentials = getCredentials();
                    String username = credentials[0];
                    String password = credentials[1];

                    if (username!=null && password!=null){

                        UserAuthentication userAuth = UserAuthentication.get(
                        "service=", "database", "key=", username);

                        String passwordHash = userAuth.getValue();

                        if (passwordHash!=null){
                            if (BCrypt.checkpw(password, passwordHash)){
                                user = userAuth.getUser();
                                if (user.getStatus()!=1) user = null;
                            }
                        }
                    }
                }
                catch(Exception e){
                }

                setUser(user);
                return user;
            }

        });


      //Start web server
        if (embedded || addresses==null || addresses.isEmpty()) return;
        new javaxt.http.Server(addresses, maxThreads, this).start();
    }



  //**************************************************************************
  //** processRequest
  //**************************************************************************
  /** Used to process an HTTP request and generate an HTTP response
   */
    public void processRequest(HttpServletRequest request, HttpServletResponse response)
        throws ServletException, IOException {


      //Check if the server support HTTPS
        if (this.supportsHttps()){

          //Set "Content-Security-Policy"
            response.setHeader("Content-Security-Policy", "upgrade-insecure-requests");


          //Redirect http request to https as needed
            javaxt.utils.URL url = new javaxt.utils.URL(request.getURL());
            if (!url.getProtocol().equalsIgnoreCase("https")){
                url.setProtocol("https");
                response.sendRedirect(url.toString(), true);
                return;
            }
        }


      //Add CORS support
        response.addHeader("Access-Control-Allow-Origin", "*");
        response.addHeader("Access-Control-Allow-Headers","*");
        response.addHeader("Access-Control-Allow-Methods", "*");



      //Log the request
        eventProcessor.processEvent(request);



      //Get path from url, excluding servlet path and leading "/" character
        String path = request.getPathInfo();
        if (path!=null) path = path.substring(1);


      //Get first "directory" in the path
        String service = path==null ? "" : path.toLowerCase();
        if (service.contains("/")) service = service.substring(0, service.indexOf("/"));



      //Special case for when authentication is disabled
        if (service.equals("user") && defaultUser!=null){
            response.write(defaultUser.toJson().toString());
            return;
        }


      //Pass the request to the authenticator. If it can handle the request, return early.
        javaxt.express.Authenticator authenticator = (javaxt.express.Authenticator) getAuthenticator(request);
        if (authenticator.handleRequest(service, response)) return;



      //Send static file if we can
        if (!request.isWebSocket()){

            if (service.length()==0){

              //If the service is empty, send welcome file (e.g. index.html)
                fileManager.sendFile(request, response);
                return;
            }
            else{

              //Check if the service matches a file or folder in the web
              //directory. If so, send the static file as requested.
                for (Object obj : web.getChildren()){
                    String name;
                    if (obj instanceof javaxt.io.File){
                        name = ((javaxt.io.File) obj).getName();
                    }
                    else{
                        name = ((javaxt.io.Directory) obj).getName();
                    }
                    if (service.equalsIgnoreCase(name)){
                        sendFile(path, request, response);
                        return;
                    }
                }

            }
        }


      //If we're still here, we either have a bad file request or a web
      //service request. In either case, send the request to the
      //webservices endpoint to process.
        ws.processRequest(service, path, request, response);

    }


  //**************************************************************************
  //** sendFile
  //**************************************************************************
    private void sendFile(String path, HttpServletRequest request, HttpServletResponse response)
        throws ServletException, IOException {


      //Special case for Certbot. When generating certificates using the
      //certonly command, Certbot creates a hidden directory in the web root.
      //The web server must return the files in this hidden directory. However,
      //the filemanager does not allow access to hidden directories so we need
      //to handle these requests manually.
        if (path.startsWith(".well-known")){
            console.log(path);
            java.io.File file = new java.io.File(web + path);
            console.log(file + "\t" + file.exists());

          //Send file
            if (file.exists()){
                response.write(file, javaxt.io.File.getContentType(file.getName()), true);
            }
            else{
                response.setStatus(404);
                response.setContentType("text/plain");
            }
            return;
        }


        fileManager.sendFile(path, request, response);

    }


  //**************************************************************************
  //** EventProcessor
  //**************************************************************************
  /** Used to process changes to the web directory and log web requests
   */
    private class EventProcessor{

        private final ConcurrentHashMap<String, Long>
        fileUpdates = new ConcurrentHashMap<>();
        private int len = web.getPath().length();

        private ThreadPool pool;
        private final ConcurrentHashMap<Long, HashMap<Long, AtomicInteger>>
        userActivity = new ConcurrentHashMap<>();


        public EventProcessor(){


          //Create timer task to periodically update the NotificationService
          //when files in the web directory have been created, edited, moved,
          //or deleted. Instead of broadcasting every single file change, this
          //timer task will wait for the directory to "settle down" and simply
          //broadcast the fact that something has changed.
            setInterval(()->{
                synchronized(fileUpdates){
                    if (!fileUpdates.isEmpty()){

                        long currTime = System.currentTimeMillis();
                        long lastUpdate = Integer.MAX_VALUE;

                        Iterator<String> it = fileUpdates.keySet().iterator();
                        while (it.hasNext()){
                            String key = it.next();
                            long t = fileUpdates.get(key);
                            if (t>lastUpdate) lastUpdate = t;
                        }

                        if (currTime-lastUpdate>2000){
                            NotificationService.notify("update", "WebFile", null);
                            fileUpdates.clear();
                            fileUpdates.notify();
                        }
                    }
                }
            }, 250);




          //Create timer task to periodically save user activity
            setInterval(()->{

              //Get current time as a "yyyyMMddHHmm" long
                long currTime = DateUtils.getMilliseconds(DateUtils.getCurrentTime());
                javaxt.utils.Date date = new javaxt.utils.Date(currTime);
                currTime = Long.parseLong(date.toString("yyyyMMddHHmm", DateUtils.getUTC()));


              //Insert records
                synchronized(userActivity){

                    HashSet<Long> oldKeys = new HashSet<>();
                    Connection conn = null;
                    Recordset rs = null;


                    Iterator<Long> it = userActivity.keySet().iterator();
                    while (it.hasNext()){
                        long key = it.next();
                        if (key<currTime){

                            String time = key + "";
                            int l = time.length();
                            int hour = Integer.parseInt(time.substring(0, l-2));
                            int minute = Integer.parseInt(time.substring(l-2));
                            HashMap<Long, AtomicInteger> ua = userActivity.get(key);

                            HashSet<Long> inserts = new HashSet<>();
                            Iterator<Long> i2 = ua.keySet().iterator();
                            while (i2.hasNext()){
                                long userID = i2.next();
                                int hits = ua.get(userID).get();

                                try{
                                    if (rs==null){
                                        conn = Config.getDatabase().getConnection();
                                        rs = conn.getRecordset("select * from user_activity where id=-1", false);
                                    }
                                    rs.addNew();
                                    rs.setValue("hour", hour);
                                    rs.setValue("minute", minute);
                                    rs.setValue("count", hits);
                                    rs.setValue("user_id", userID);
                                    rs.update();
                                    inserts.add(userID);
                                }
                                catch(Exception e){
                                }
                            }

                            for (long userID : inserts) ua.remove(userID);
                            if (ua.isEmpty()) oldKeys.add(key);
                        }
                    }

                  //Clean up
                    if (rs!=null) rs.close();
                    if (conn!=null) conn.close();

                    for (long key : oldKeys) userActivity.remove(key);

                    userActivity.notifyAll();
                }


            }, 2*60*1000); //2 minutes



          //Start thread pool used to update user activity
            pool = new ThreadPool(4){
                public void process(Object obj){
                    Object[] arr = (Object[]) obj;
                    Long userID = (Long) arr[0];
                    Long timestamp = DateUtils.getMilliseconds((Long) arr[1]);
                    javaxt.utils.Date date = new javaxt.utils.Date(timestamp);
                    String time = date.toString("yyyyMMddHHmm", DateUtils.getUTC());
                    long key = Long.parseLong(time);

                    synchronized(userActivity){
                        HashMap<Long, AtomicInteger> ua = userActivity.get(key);
                        if (ua==null){
                            ua = new HashMap<>();
                            userActivity.put(key, ua);
                        }
                        AtomicInteger hits = ua.get(userID);
                        if (hits==null){
                            hits = new AtomicInteger(0);
                            ua.put(userID, hits);
                        }
                        hits.incrementAndGet();
                        userActivity.notifyAll();
                    }
                }
            }.start();
        }


        public void processEvent(Directory.Event event){
            java.io.File f = new java.io.File(event.getFile());
            String path = f.toString().substring(len).replace("\\", "/");
            synchronized(fileUpdates){
                fileUpdates.put(path, event.getDate().getTime());
                fileUpdates.notify();
            }
        }

        
        public void processEvent(HttpServletRequest request){
            if (logger!=null) logger.log(request);
            if (!request.isWebSocket()){
                User user = (User) request.getUserPrincipal();
                if (user!=null){
                    long userID = user.getID();
                    long timestamp = DateUtils.getCurrentTime();
                    String event = "";
                    String model = "WebRequest";
                    javaxt.utils.Value data = new javaxt.utils.Value(userID);
                    NotificationService.notify(event, model, data);
                    pool.add(new Object[]{userID, timestamp});
                }
            }
        }
    }

}