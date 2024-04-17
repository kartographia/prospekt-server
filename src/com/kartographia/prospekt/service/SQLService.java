package com.kartographia.prospekt.service;
import com.kartographia.prospekt.server.Config;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import javaxt.sql.*;
import javaxt.json.*;

import javaxt.express.*;
import javaxt.express.services.QueryService;
import javaxt.express.notification.NotificationService;


//******************************************************************************
//**  SQLService
//******************************************************************************
/**
 *   WebService used to query a database
 *
 ******************************************************************************/

public class SQLService extends WebService {

    private ConcurrentHashMap<String, QueryService> queryServices;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public SQLService() throws Exception {


        javaxt.io.Directory jobDir = getDirectory("jobDir", true);
        if (jobDir==null || !jobDir.exists()){
            throw new IllegalArgumentException("Invalid \"jobDir\" defined in config file");
        }
        javaxt.io.Directory logDir = getDirectory("logDir", false);



      //Instantiate query service for the local database
        queryServices = new ConcurrentHashMap<>();
        queryServices.put("local", new QueryService(Config.getDatabase(), jobDir, logDir){
            public void notify(QueryService.QueryJob job){
                NotificationService.notify(job.getStatus(), "SQL", new javaxt.utils.Value(job));
            }
        });


      //Instantiate query service for the awards database
        try {
            queryServices.put("awards", new QueryService(Config.getAwardsDatabase(), jobDir, logDir){
                public void notify(QueryService.QueryJob job){
                    NotificationService.notify(job.getStatus(), "SQL", new javaxt.utils.Value(job));
                }
            });
        }
        catch(Exception e){
            console.log("Failed to initialize awards database");
        }
    }


  //**************************************************************************
  //** getServiceResponse
  //**************************************************************************
    public ServiceResponse getServiceResponse(ServiceRequest request, Database database) {
        String db = request.getParameter("database").toString();
        if (db==null) db = "";

        if (db.equalsIgnoreCase("awards")){
            return queryServices.get("awards").getServiceResponse(request, database);
        }
        else{
            return queryServices.get("local").getServiceResponse(request, database);
        }
    }


  //**************************************************************************
  //** getDirectory
  //**************************************************************************
    private static javaxt.io.Directory getDirectory(String key, boolean create){
        javaxt.io.Directory dir = null;
        JSONObject config = Config.get("webserver").toJSONObject();


      //Set path (string)
        String path;
        if (config.has(key)){
            path = config.get(key).toString();
        }
        else{
            javaxt.io.Directory web = new javaxt.io.Directory(config.get("webDir").toString());
            if (key.endsWith("Dir")){ //e.g. jobDir, logDir
                key = key.substring(0, key.length()-3) + "s"; //e.g. jobs, logs

              //Update "jobs" key. Rename to "temp". Looks a little cleaner...
                if (key.endsWith("jobs")) key = key.substring(0, key.length()-4) + "temp";
            }

            path = web.getParentDirectory() + key;
        }



      //Set directory. Create new one as needed
        if (path!=null && !path.isEmpty()){
            dir = new javaxt.io.Directory(path);
            if (!dir.exists() && create) dir.create();
            if (dir.exists()){
                dir = new javaxt.io.Directory(dir.toString() + "sql");
                if (!dir.exists() && create) dir.create();
            }
            if (!dir.exists()) dir = null;
        }

        return dir; //may return null, which is ok for logs
    }
}