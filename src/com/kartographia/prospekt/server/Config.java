package com.kartographia.prospekt.server;
import java.util.*;

import javaxt.json.*;
import javaxt.sql.*;

import javaxt.express.utils.DbUtils;
import static javaxt.express.ConfigFile.*;
import static javaxt.utils.Console.console;


//******************************************************************************
//**  Config Class
//******************************************************************************
/**
 *   Provides thread-safe, static methods used to get and set application
 *   variables.
 *
 ******************************************************************************/

public class Config {

    private static javaxt.express.Config config = new javaxt.express.Config();
    private Config(){}


  //**************************************************************************
  //** load
  //**************************************************************************
  /** Used to load a config file (JSON) and update config settings
   */
    public static void load(javaxt.io.File configFile, javaxt.io.Jar jar) throws Exception {

      //Parse config file
        JSONObject json;
        if (configFile.exists()) {
            json = new JSONObject(configFile.getText());
        }
        else{
            json = new JSONObject();
        }


      //Update relative paths in the web config
        JSONObject webConfig = json.get("webserver").toJSONObject();
        if (webConfig!=null){
            updateDir("webDir", webConfig, configFile, false);
            updateDir("logDir", webConfig, configFile, true);
            updateDir("jobDir", webConfig, configFile, true);
            updateDir("scriptDir", webConfig, configFile, false);
            updateFile("keystore", webConfig, configFile);
        }


      //Get database config
        JSONObject dbConfig = json.get("database").toJSONObject();
        if (dbConfig==null || dbConfig.isEmpty()){
            dbConfig = new JSONObject();
            dbConfig.set("driver", "H2");
            dbConfig.set("maxConnections", "25");
            dbConfig.set("path", "data/database");
            dbConfig.set("schema", "models/schema.sql");
            json.set("database", dbConfig);
        }



      //Process path variable in the database config
        if (dbConfig.has("path")){
            updateFile("path", dbConfig, configFile);
            String path = dbConfig.get("path").toString().replace("\\", "/");
            dbConfig.set("host", path);
            dbConfig.remove("path");
        }


      //Get schema file from the database config
        javaxt.io.File schemaFile = null;
        if (dbConfig.has("schema")){
            updateFile("schema", dbConfig, configFile);
            schemaFile = new javaxt.io.File(dbConfig.get("schema").toString());
            dbConfig.remove("schema");
        }



      //Load config
        config.init(json);


      //Add additional properties to the config
        config.set("jar", jar);
        config.set("configFile", configFile);
        config.set("schemaFile", schemaFile);



      //Run validations
        Database database = config.getDatabase();
        if (database==null) throw new Exception("Invalid database");

    }


  //**************************************************************************
  //** load
  //**************************************************************************
  /** Used to load a json document and update config settings
   */
    public static void load(JSONObject json){
        config.init(json);
    }


  //**************************************************************************
  //** initDatabase
  //**************************************************************************
  /** Used to initialize the database
   */
    public static void initDatabase() throws Exception {

      //Get database status
        Boolean initialized = get("databaseInitialized").toBoolean();
        if (initialized!=null && initialized.booleanValue()==true) return;
        set("databaseInitialized", true);


        Database database = config.getDatabase();


      //Update database properties as needed
        if (database.getDriver().equals("H2")){

          //Set H2 to PostgreSQL mode
            Properties properties = database.getProperties();
            if (properties==null){
                properties = new java.util.Properties();
                database.setProperties(properties);
            }
            properties.setProperty("MODE", "PostgreSQL");
            properties.setProperty("DATABASE_TO_LOWER", "TRUE");
            properties.setProperty("DEFAULT_NULL_ORDERING", "HIGH");


          //Update list of reserved keywords to exclude "key" and "value"
          //that are used in the USER_PREFERENCE table as well as "hour"
          //and "minute" that are used in the USER_ACTIVITY table.
            Properties props = database.getProperties();
            props.setProperty("NON_KEYWORDS", "KEY,VALUE,HOUR,MINUTE");
        }



      //Get database schema
        String schema = null;
        JSONValue v = config.get("schemaFile");
        if (!v.isNull()){
            javaxt.io.File schemaFile = (javaxt.io.File) v.toObject();
            if (schemaFile.exists()){
                schema = schemaFile.getText();
            }
        }
        //if (schema==null) throw new Exception("Schema not found");


      //Initialize schema (create tables, indexes, etc)
        if (schema!=null) DbUtils.initSchema(database, schema, null);


      //Enable database caching
        database.enableMetadataCache(true);


      //Inititalize connection pool
        database.initConnectionPool();


      //Initialize models
        javaxt.io.Jar jar = (javaxt.io.Jar) config.get("jar").toObject();
        Model.init(jar, database.getConnectionPool());
    }


  //**************************************************************************
  //** getAwardsDatabase
  //**************************************************************************
    public static Database getAwardsDatabase() {

        JSONValue val = get("awardsDatabase");
        if (val.toObject() instanceof javaxt.sql.Database){
            return (javaxt.sql.Database) val.toObject();
        }
        else{
            Database awardsDatabase = config.getDatabase(Config.get("sources").get("usaspending.gov").get("database"));
            awardsDatabase.enableMetadataCache(true);
            try{
                awardsDatabase.initConnectionPool();
            }
            catch(Exception e){
                console.log("Failed to initialize connection pool to the awards database");
            }
            set("awardsDatabase", awardsDatabase);
            return awardsDatabase;
        }
    }


  //**************************************************************************
  //** has
  //**************************************************************************
  /** Returns true if the config has a given key.
   */
    public static boolean has(String key){
        return config.has(key);
    }


  //**************************************************************************
  //** get
  //**************************************************************************
  /** Returns the value for a given key.
   */
    public static JSONValue get(String key){
        return config.get(key);
    }


  //**************************************************************************
  //** set
  //**************************************************************************
    public static void set(String key, Object value){
        config.set(key, value);
    }


  //**************************************************************************
  //** save
  //**************************************************************************
    public static void save(){
        javaxt.io.File configFile = (javaxt.io.File) config.get("configFile").toObject();
        configFile.write(toJson().toString(4));
    }


  //**************************************************************************
  //** toJson
  //**************************************************************************
    public static JSONObject toJson(){

      //Get config file path
        javaxt.io.File configFile = (javaxt.io.File) config.get("configFile").toObject();
        String configPath = configFile.getDirectory().toString().replace("\\", "/");
        int len = configPath.length();


      //Get json formatted config data
        JSONObject json = config.toJson();


      //Remove keys that should not be saved
        json.remove("schemaFile");
        json.remove("configFile");
        json.remove("jar");


      //Update json for the database config
        JSONObject database = json.get("database").toJSONObject();
        if (database.get("driver").toString().equalsIgnoreCase("H2")){
            String host = database.get("host").toString().replace("\\", "/");
            if (host.startsWith(configPath)) host = host.substring(len);
            database.set("path", host);
            database.remove("host");
            JSONValue v = config.get("schemaFile");
            if (v!=null){
                javaxt.io.File schemaFile = (javaxt.io.File) v.toObject();
                String schema = schemaFile.toString().replace("\\", "/");
                if (schema.startsWith(configPath)) schema = schema.substring(len);
                database.set("schema", schema);
            }
        }



      //Update json for the web config
        JSONObject webConfig = json.get("webserver").toJSONObject();
        for (String key : new String[]{"webDir", "logDir", "jobDir", "keystore"}){
            String path = webConfig.get(key).toString();
            if (path!=null){
                path = path.replace("\\", "/");
                if (path.startsWith(configPath)) path = path.substring(len);
                webConfig.set(key, path);
            }
        }


        return json;
    }


  //**************************************************************************
  //** getDatabase
  //**************************************************************************
    public static javaxt.sql.Database getDatabase(){
        return config.getDatabase();
    }

}