package com.kartographia.prospekt.server;
import com.kartographia.prospekt.User;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.security.KeyStore;
import java.util.*;

import javaxt.express.*;
import javaxt.http.servlet.*;
import javaxt.io.Jar;
import javaxt.json.*;
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
    private ArrayList<InetSocketAddress> addresses;
    private Logger logger;

    private WebServices ws;
    private FileManager fileManager;


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

      //Set path to the web directory (required)
        if (config.has("webDir")){
            String webDir = config.get("webDir").toString();
            web = new javaxt.io.Directory(webDir);
            if (!web.exists() || webDir.length()==0){
                throw new IllegalArgumentException("Invalid \"webDir\" defined in config file");
            }
        }


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



      //Instantiate file manager
        fileManager = new FileManager(web);


      //Instantiate web services
        ws = new WebServices(jar);


      //Instantiate authenticator
        setAuthenticator(new Authenticator());

    }


  //**************************************************************************
  //** start
  //**************************************************************************
  /** Used to start the HTTP server and logger
   */
    public void start(){

      //Start web logger
        if (logDir!=null){
            logger = new Logger(logDir.toFile());
            new Thread(logger).start();
        }


      //Start the server
        int threads = 250;
        javaxt.http.Server server = new javaxt.http.Server(addresses, threads, this);
        server.start();
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


        
      //Log the request
        if (logger!=null) logger.log(request);



      //Get path from url, excluding servlet path and leading "/" character
        String path = request.getPathInfo();
        if (path!=null) path = path.substring(1);


      //Get first "directory" in the path
        String service = path==null ? "" : path.toLowerCase();
        if (service.contains("/")) service = service.substring(0, service.indexOf("/"));


      //Get credentials
        String[] credentials = request.getCredentials();




      //Generate response
        if (service.equals("login")){
            if (credentials==null){
                response.setStatus(401, "Access Denied");
                response.setHeader("WWW-Authenticate", "Basic realm=\"Access Denied\""); //<--Prompt the user for thier credentials
                response.setHeader("Cache-Control", "no-cache, no-transform");
                response.setContentType("text/plain");
                response.write("Unauthorized");
            }
            else{
                try{
                    request.authenticate();
                    response.setContentType("application/json");
                    response.write(getUser(request).toJson().toString());
                }
                catch(Exception e){
                    response.setStatus(403, "Not Authorized");
                    response.setHeader("Cache-Control", "no-cache, no-transform");
                    response.setContentType("text/plain");
                    response.write("Unauthorized");
                }
            }
        }
        else if (service.equals("logoff") || service.equalsIgnoreCase("logout")){
            String username = (credentials!=null) ? credentials[0] : null;
            Authenticator.updateCache(username, null);

            response.setStatus(401, "Access Denied");
            Boolean prompt = new javaxt.utils.Value(request.getParameter("prompt")).toBoolean(); //<--Hack for Firefox
            if (prompt!=null && prompt==true){
                response.setHeader("WWW-Authenticate", "Basic realm=\"" +
                "This site is restricted. Please enter your username and password.\"");
            }
            response.setHeader("Cache-Control", "no-cache, no-transform");
            response.setContentType("text/plain");
            response.write("Unauthorized");
        }
        else if (service.equals("whoami")){
            String username = (credentials!=null) ? credentials[0] : null;
            if (username==null || username.equals("logout")) throw new ServletException(400);
            else{
                response.setHeader("Cache-Control", "no-cache, no-transform");
                response.setContentType("text/plain");
                response.write(username);
            }
        }
        else if (service.equals("user")){
            response.setContentType("application/json");
            response.write(getUser(request).toJson().toString());
        }
        else{

          //Send static file if we can
            if (service.length()==0){

              //If the service is empty, send welcome file (e.g. index.html)
                fileManager.sendFile(request, response);
                return;
            }
            else{

              //Check if the service matches a file or folder in the web directory.
              //If so, send the static file as requested. Note that the current
              //implementation searches the web directory for each http request,
              //which is terribly inefficient. We need some sort of caching with
              //a file watcher...
                for (Object obj : web.getChildren()){
                    String name = null;
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


          //If we're still here, we either have a bad file request or a web
          //service request. In either case, send the request to the
          //webservices endpoint to process.
            ws.processRequest(service, request, response);

        }
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
  //** getUser
  //**************************************************************************
    private User getUser(HttpServletRequest request){
        return (User) request.getUserPrincipal();
    }
}