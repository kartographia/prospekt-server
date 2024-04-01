package com.kartographia.prospekt.services;
import com.kartographia.prospekt.server.Config;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import javaxt.sql.*;
import javaxt.json.*;

import javaxt.express.*;
import javaxt.express.services.QueryService;
import static javaxt.express.Config.getDatabase;
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


        javaxt.io.Directory jobDir = getDirectory("jobDir");
        if (jobDir==null || !jobDir.exists()){
            throw new IllegalArgumentException("Invalid \"jobDir\" defined in config file");
        }
        javaxt.io.Directory logDir = getDirectory("logDir");



      //Instantiate query service for the local database
        queryServices = new ConcurrentHashMap<>();
        queryServices.put("local", new QueryService(Config.getDatabase(), jobDir, logDir){
            public void notify(QueryService.QueryJob job){
                NotificationService.notify(job.getStatus(), "SQL", new javaxt.utils.Value(job));
            }
        });


      //Instantiate query service for the awards database
        Database awardsDatabase = getDatabase(Config.get("sources").get("usaspending.gov").get("database"));
        if (awardsDatabase!=null){
            awardsDatabase.enableMetadataCache(true);
            awardsDatabase.initConnectionPool();
            queryServices.put("awards", new QueryService(awardsDatabase, jobDir, logDir){
                public void notify(QueryService.QueryJob job){
                    NotificationService.notify(job.getStatus(), "SQL", new javaxt.utils.Value(job));
                }
            });
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
    private static javaxt.io.Directory getDirectory(String key){
        javaxt.io.Directory dir = null;
        JSONObject config = Config.get("webserver").toJSONObject();

        String path;
        if (config.has(key)){
            path = config.get(key).toString();
        }
        else{
            javaxt.io.Directory web = new javaxt.io.Directory(config.get("webDir").toString());
            if (key.endsWith("Dir")){
                key = key.substring(0, key.length()-3) + "s";
            }
            path = web.getParentDirectory() + key;
        }




        if (path!=null && !path.isEmpty()){
            dir = new javaxt.io.Directory(path);
            if (!dir.exists()) dir.create();
            if (dir.exists()){
                dir = new javaxt.io.Directory(dir.toString() + "sql");
                if (!dir.exists()) dir.create();
            }
            if (!dir.exists()) dir = null;
        }

        return dir;
    }
}