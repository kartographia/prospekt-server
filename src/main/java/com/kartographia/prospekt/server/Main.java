package com.kartographia.prospekt.server;
import com.kartographia.prospekt.data.*;
import com.kartographia.prospekt.*;

import java.util.*;

import javaxt.io.Jar;
import javaxt.sql.*;
import javaxt.json.*;
import static javaxt.utils.Console.*;

public class Main {

  //**************************************************************************
  //** main
  //**************************************************************************
  /** Entry point for the application.
   */
    public static void main(String[] arr) throws Exception {
        HashMap<String, String> args = parseArgs(arr);


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


      //Initialize config
        Config.load(configFile, jar);


      //Process command line args
        if (args.containsKey("-addUser")){
            Config.initDatabase();
            addUser(args);
        }
        else if (args.containsKey("-updatePassword")){
            Config.initDatabase();
            updatePassword(args);
        }
        else if (args.containsKey("-test")){
            test(args);
        }
        else{
            Config.initDatabase();
            JSONObject webConfig = Config.get("webserver").toJSONObject();
            WebServer server = new WebServer(webConfig, jar);
            server.start();
        }
    }


  //**************************************************************************
  //** addUser
  //**************************************************************************
    private static void addUser(HashMap<String, String> args) throws Exception {
        String name = args.get("-addUser");

        int accessLevel = 3;
        if (args.containsKey("-accessLevel")){
            try{
                accessLevel = Integer.parseInt(args.get("-accessLevel"));
                if (accessLevel<1 || accessLevel>5) accessLevel = 3;
            }
            catch(Exception e){}
        }

        System.out.println("Create new user \"" + name + "\"");
        String pw = getPassword(args);

        User user = new User();
        user.setUsername(name);
        user.setPassword(pw);
        user.setActive(true);
        user.setAccessLevel(accessLevel);
        user.save();
        System.out.println("User created");
    }


  //**************************************************************************
  //** updatePassword
  //**************************************************************************
    private static void updatePassword(HashMap<String, String> args) throws Exception {
        String name = args.get("-updatePassword");

        User user = User.get("username=", name);
        if (user==null){
            System.out.println("User not found");
            return;
        }

//        String currentPassword = console.getPassword("Current password >");
//        if (!user.authenticate(currentPassword)){
//            System.out.println("Sorry, incorrect password");
//            return;
//        }

        String pw = getPassword(args);
        user.setPassword(pw);
        user.save();
        System.out.println("Password changed");
    }


  //**************************************************************************
  //** getPassword
  //**************************************************************************
    private static String getPassword(HashMap<String, String> args) throws Exception {
        String pw = console.getPassword("Enter password: ");
        String pw2 = console.getPassword("Confirm password: ");
        if (!pw.equals(pw2)) {
            System.out.println("Passwords do not match. Please try again");
            getPassword(args);
        }
        return pw;
    }


  //**************************************************************************
  //** test
  //**************************************************************************
    private static void test(HashMap<String, String> args) throws Exception {

        String test = args.get("-test").toLowerCase();
        if (test.equals("database")){

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