package com.kartographia.prospekt.server;
import com.kartographia.prospekt.User;
import com.kartographia.prospekt.UserAuthentication;

import java.util.*;
import java.io.IOException;
import java.security.KeyStore;
import java.net.InetSocketAddress;

import javaxt.express.*;
import javaxt.express.notification.*;
import javaxt.express.Authenticator;

import javaxt.http.servlet.*;

import javaxt.json.*;
import javaxt.io.Jar;
import javaxt.encryption.BCrypt;
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
        setAuthenticator(new javaxt.express.Authenticator(){

            public java.security.Principal getPrinciple(){

                User user = (User) getUser();
                if (user!=null) return user;

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



      //Add CORS support
        response.addHeader("Access-Control-Allow-Origin", "*");
        response.addHeader("Access-Control-Allow-Headers","*");
        response.addHeader("Access-Control-Allow-Methods", "*");



      //Log the request
        if (logger!=null) logger.log(request);



      //Get path from url, excluding servlet path and leading "/" character
        String path = request.getPathInfo();
        if (path!=null) path = path.substring(1);


      //Get first "directory" in the path
        String service = path==null ? "" : path.toLowerCase();
        if (service.contains("/")) service = service.substring(0, service.indexOf("/"));



      //Generate response
        Authenticator authenticator = (Authenticator) getAuthenticator(request);
        if (!authenticator.handleRequest(service, response)){

          //Send static file if we can
            if (service.length()==0){

              //If the service is empty, send welcome file (e.g. index.html)
                fileManager.sendFile(request, response);
                return;
            }
            else{

              //Check if the service matches a file or folder in the web
              //directory. If so, send the static file as requested.
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
}