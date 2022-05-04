package com.kartographia.prospekt.server;
import java.util.*;
import javaxt.io.Jar;
import javaxt.sql.*;
import static javaxt.utils.Console.console;

public class Main {

  //**************************************************************************
  //** main
  //**************************************************************************
  /** Entry point for the application.
   */
    public static void main(String[] arr) throws Exception {
        HashMap<String, String> args = console.parseArgs(arr);


      //Get jar file and schema
        Jar jar = new Jar(Main.class);
        javaxt.io.File jarFile = new javaxt.io.File(jar.getFile());


      //Get config file
        javaxt.io.File configFile = (args.containsKey("-config")) ?
            Config.getFile(args.get("-config"), jarFile) :
            new javaxt.io.File(jar.getFile().getParentFile(), "config.json");

        if (!configFile.exists()) {
            System.out.println("Could not find config file. Use the \"-config\" parameter to specify a path to a config");
            return;
        }


//      //Run update scripts as needed
//        if (args.containsKey("-updateSchema")){
//            String updates = new javaxt.io.File(args.get("-updateSchema")).getText();
//            updateSchema(updates, configFile);
//            System.out.println("Successfully updated schema!");
//            return;
//        }



      //Initialize config
        Config.load(configFile, jar);


      //Process command line args
        if (args.containsKey("-test")){

            Config.initDatabase();

            Connection conn = null;
            try{
                conn = Config.getDatabase().getConnection();
                for (Table table : Database.getTables(conn)){
                    System.out.println(table);
                }
                conn.close();
            }
            catch(Exception e){
                if (conn!=null) conn.close();
                throw e;
            }

        }
    }

}