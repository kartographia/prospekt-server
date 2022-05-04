package com.kartographia.prospekt.server;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;
import javaxt.express.utils.DbUtils;
import static javaxt.utils.Console.console;
import javaxt.json.*;
import javaxt.sql.*;


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
        JSONObject json = new JSONObject(configFile.getText());


      //Get database config
        JSONObject dbConfig = json.get("database").toJSONObject();


      //Update path to the database (H2 only)
        if (dbConfig.has("path")){
            updateFile("path", dbConfig, configFile);
            String path = dbConfig.get("path").toString().replace("\\", "/");
            dbConfig.set("host", path);
            dbConfig.remove("path");
        }


      //Get schema
        javaxt.io.File schemaFile = null;
        if (dbConfig.has("schema")){
            updateFile("schema", dbConfig, configFile);
            schemaFile = new javaxt.io.File(dbConfig.get("schema").toString());
            dbConfig.remove("schema");
        }


      //Update relative paths in the web config
        JSONObject webConfig = json.get("webserver").toJSONObject();
        updateDir("webDir", webConfig, configFile, false);
        updateDir("logDir", webConfig, configFile, true);
        updateDir("jobDir", webConfig, configFile, true);
        updateDir("scriptDir", webConfig, configFile, false);
        updateFile("keystore", webConfig, configFile);


      //Load config
        config.init(json);


      //Add additional properties to the config
        config.set("jar", jar);
        config.set("configFile", configFile);
        Properties props = config.getDatabase().getProperties();
        if (props==null){
            props = new Properties();
            config.getDatabase().setProperties(props);
        }

        if (schemaFile!=null) props.put("schema", schemaFile);
    }


  //**************************************************************************
  //** initDatabase
  //**************************************************************************
  /** Used to initialize the database
   */
    public static void initDatabase() throws Exception {
        Database database = config.getDatabase();


      //Get database schema
        String schema = null;
        Object obj = config.getDatabase().getProperties().get("schema");
        if (obj!=null){
            javaxt.io.File schemaFile = (javaxt.io.File) obj;
            if (schemaFile.exists()){
                schema = schemaFile.getText();
            }
        }
        if (schema==null) throw new Exception("Schema not found");


      //Initialize schema (create tables, indexes, etc)
        DbUtils.initSchema(database, schema, null);


      //Inititalize connection pool
        database.initConnectionPool();


      //Initialize models
        javaxt.io.Jar jar = (javaxt.io.Jar) config.get("jar").toObject();
        Model.init(jar, database.getConnectionPool());
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
        json.remove("schema");
        json.remove("jar");


      //Update json for the database config
        JSONObject database = json.get("database").toJSONObject();
        if (database.get("driver").toString().equalsIgnoreCase("H2")){
            String host = database.get("host").toString().replace("\\", "/");
            if (host.startsWith(configPath)) host = host.substring(len);
            database.set("path", host);
            database.remove("host");
            Object obj = config.getDatabase().getProperties().get("schema");
            if (obj!=null){
                javaxt.io.File schemaFile = (javaxt.io.File) obj;
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


  //**************************************************************************
  //** getDirectory
  //**************************************************************************
  /** Simple helper class used to get a directory specified in the config file
   *  javaxt.io.Directory jobDir = Config.getDirectory("webserver", "jobDir");
   */
    public static javaxt.io.Directory getDirectory(String... keys){
        try{
            JSONValue config = null;
            for (String key : keys){
                if (config==null) config = Config.get(key);
                else config = config.get(key);
            }

            String dir = config.toString().trim();
            return new javaxt.io.Directory(dir);
        }
        catch(Exception e){
            return null;
        }
    }


  //**************************************************************************
  //** getFile
  //**************************************************************************
  /** Returns a File for a given path
   *  @param path Full canonical path to a file or a relative path (relative
   *  to the jarFile)
   */
    public static javaxt.io.File getFile(String path, javaxt.io.File jarFile){
        javaxt.io.File file = new javaxt.io.File(path);
        if (!file.exists()){
            file = new javaxt.io.File(jarFile.MapPath(path));
        }
        return file;
    }


  //**************************************************************************
  //** updateDir
  //**************************************************************************
  /** Used to update a path to a directory defined in a config file. Resolves
   *  both canonical and relative paths (relative to the configFile).
   */
    public static void updateDir(String key, JSONObject config, javaxt.io.File configFile, boolean create){
        if (config!=null && config.has(key)){
            String path = config.get(key).toString();
            if (path==null){
                config.remove(key);
            }
            else{
                path = path.trim();
                if (path.length()==0){
                    config.remove(key);
                }
                else{

                    javaxt.io.Directory dir = new javaxt.io.Directory(path);
                    if (dir.exists()){
                        try{
                            java.io.File f = new java.io.File(path);
                            javaxt.io.Directory d = new javaxt.io.Directory(f.getCanonicalFile());
                            if (!dir.toString().equals(d.toString())){
                                dir = d;
                            }
                        }
                        catch(Exception e){
                        }
                    }
                    else{
                        dir = new javaxt.io.Directory(new java.io.File(configFile.MapPath(path)));
                    }


                    if (!dir.exists() && create) dir.create();


                    if (dir.exists()){
                        config.set(key, dir.toString());
                    }
                    else{
                        config.remove(key);
                    }
                }
            }
        }
    }


  //**************************************************************************
  //** updateFile
  //**************************************************************************
  /** Used to update a path to a file defined in a config file. Resolves
   *  both canonical and relative paths (relative to the configFile).
   */
    public static void updateFile(String key, JSONObject config, javaxt.io.File configFile){
        if (config.has(key)){
            String path = config.get(key).toString();
            if (path==null){
                config.remove(key);
            }
            else{
                path = path.trim();
                if (path.length()==0){
                    config.remove(key);
                }
                else{

                    javaxt.io.File file = new javaxt.io.File(path);
                    if (file.exists()){
                        try{
                            java.io.File f = new java.io.File(path);
                            javaxt.io.File _file = new javaxt.io.File(f.getCanonicalFile());
                            if (!file.toString().equals(_file.toString())){
                                file = _file;
                            }
                        }
                        catch(Exception e){
                        }
                    }
                    else{
                        file = new javaxt.io.File(configFile.MapPath(path));
                    }

                    config.set(key, file.toString());
//                    if (file.exists()){
//                        config.set(key, file.toString());
//                    }
//                    else{
//                        config.remove(key);
//                    }
                }
            }
        }
    }

}