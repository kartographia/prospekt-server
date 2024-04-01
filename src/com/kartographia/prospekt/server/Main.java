package com.kartographia.prospekt.server;
import com.kartographia.prospekt.source.*;
import com.kartographia.prospekt.*;

import java.util.*;

import javaxt.sql.*;
import javaxt.json.*;
import javaxt.io.Jar;
import javaxt.encryption.BCrypt;
import javaxt.express.ConfigFile;
import static javaxt.utils.Console.*;

//******************************************************************************
//**  Main
//******************************************************************************
/**
 *  Command line interface used to start the web server or to run specialized
 *  functions (e.g. create users, load data, etc).
 *
 *  The web server will start by default if a given set of command line
 *  arguments is not mapped to specialty function.
 *
 ******************************************************************************/

public class Main {

  //**************************************************************************
  //** main
  //**************************************************************************
  /** Entry point for the application.
   */
    public static void main(String[] arguments) throws Exception {
        HashMap<String, String> args = parseArgs(arguments);


      //Get jar file and schema
        Jar jar = new Jar(Main.class);
        javaxt.io.File jarFile = new javaxt.io.File(jar.getFile());


      //Get config file
        javaxt.io.File configFile = (args.containsKey("-config")) ?
            ConfigFile.getFile(args.get("-config"), jarFile) :
            new javaxt.io.File(jarFile.getDirectory(), "config.json");

        if (!configFile.exists()) {
            System.out.println("Could not find config file. Use the \"-config\" parameter to specify a path to a config");
            return;
        }


      //Initialize config
        Config.load(configFile, jar);


      //Process command line args
        if (args.containsKey("-create")){
            create(args);
        }
        else if (args.containsKey("-update")){
            update(args);
        }
        else if (args.containsKey("-delete")){
            delete(args);
        }
        else if (args.containsKey("-test")){
            test(args);
        }
        else{ //start web server


          //Initialize the database
            Config.initDatabase();


          //Prompt user to create an admin account if one doesn't exist
            User admin = null;
            boolean missingAuth = true;
            for (User user : User.find("access_level=", 5)){
                Integer accessLevel = user.getAccessLevel();
                if (accessLevel!=null && accessLevel==5){
                    if (user.getStatus()==1){
                        UserAuthentication[] auth = UserAuthentication.find("user_id=", user.getID());
                        if (auth!=null && auth.length>0){
                            admin = user;
                            missingAuth = false;
                            break;
                        }
                    }
                }
            }
            if (admin==null) {
                System.out.println("Missing admin user.");
                HashMap<String, String> props = new HashMap<>();
                props.put("-accessLevel", "5");
                addUser(props);
            }
            else{
                if (missingAuth){
                    System.out.println("Missing authentication info.");
                    addUserName(admin);
                }
            }


          //Get web config
            JSONObject webConfig = Config.get("webserver").toJSONObject();
            if (webConfig==null){
                webConfig = new JSONObject();
                Config.set("webserver", webConfig);
            }


          //Get port (optional)
            if (args.containsKey("-port")){
                Integer port = Integer.parseInt(args.get("-port"));
                if (port!=null) webConfig.set("port", port);
            }


          //Start the server
            WebServer server = new WebServer(webConfig, jar);
            server.start();
        }
    }


  //**************************************************************************
  //** create
  //**************************************************************************
    private static void create(HashMap<String, String> args) throws Exception {
        String str = args.get("-create");
        if (str==null) str = "";
        str = str.toLowerCase();

        if (str.equals("user")){
            addUser(args);
        }
    }


  //**************************************************************************
  //** update
  //**************************************************************************
    private static void update(HashMap<String, String> args) throws Exception {
        String str = args.get("-update");
        if (str==null) str = "";
        str = str.toLowerCase();

        if (str.equals("password")){
            updatePassword(args);
        }
        else if (str.equals("database")){
            updateDatabase(args);
        }
        else if (str.equals("company")){
            updateCompany(args);
        }
        else if (str.equals("companies")){
            updateCompanies(args);
        }
        else if (str.equals("awards")){
            updateAwards(args);
        }
    }


  //**************************************************************************
  //** delete
  //**************************************************************************
    private static void delete(HashMap<String, String> args) throws Exception {
        String str = args.get("-delete");
        if (str==null) str = "";
        str = str.toLowerCase();

    }


  //**************************************************************************
  //** addUser
  //**************************************************************************
    private static void addUser(HashMap<String, String> args) throws Exception {

      //Get name
        String name = args.get("-name");
        String firstName = null;
        String lastName = null;
        if (name==null){
            firstName = console.getInput("First Name: ");
            lastName = console.getInput("Last Name: ");
            name = firstName + " " + lastName;
        }
        else{
            String[] arr = name.split(" ");
            console.log(arr);
        }


      //Get username and password
        String username = args.get("-username");
        if (username==null){
            username = console.getUserName("Username: ");
        }

        String password = args.get("-password");
        if (password==null){
            password = getPassword();
        }


      //Get access level
        int accessLevel = 3;
        if (args.containsKey("-accessLevel")){
            try{
                accessLevel = Integer.parseInt(args.get("-accessLevel"));
                if (accessLevel<1 || accessLevel>5) accessLevel = 3;
            }
            catch(Exception e){}
        }


      //Initialize the database
        Config.initDatabase();


      //Save contact
        Person person = Person.get("first_name=", firstName, "last_name=", lastName);
        if (person==null){
            person = new Person();
            person.setFirstName(firstName);
            person.setLastName(lastName);
            person.setFullName(name);
            person.save();
        }


      //Save user
        User user = User.get("person_id=", person.getID());
        if (user==null){
            user = new User();
            user.setPerson(person);
            user.setStatus(1);
            user.setAccessLevel(accessLevel);
        }


      //Save user auth
        UserAuthentication userAuth = new UserAuthentication();
        userAuth.setService("database");
        userAuth.setKey(username);
        userAuth.setValue(BCrypt.hashpw(password));
        userAuth.setUser(user);
        userAuth.save();


        System.out.println("User created");
    }


  //**************************************************************************
  //** addUserName
  //**************************************************************************
    private static void addUserName(User user) throws Exception {

      //Get username and password
        String username = console.getUserName("Username: ");
        String password = getPassword();


      //Save user auth
        UserAuthentication userAuth = new UserAuthentication();
        userAuth.setService("database");
        userAuth.setKey(username);
        userAuth.setValue(BCrypt.hashpw(password));
        userAuth.setUser(user);
        userAuth.save();
    }


  //**************************************************************************
  //** updatePassword
  //**************************************************************************
    private static void updatePassword(HashMap<String, String> args) throws Exception {
        String username = args.get("-username");

        Config.initDatabase();
        UserAuthentication userAuth = UserAuthentication.get("service=", "database", "key=", username);


        if (userAuth==null){
            System.out.println("User not found");
            return;
        }

//        String currentPassword = console.getPassword("Current password >");
//        if (!user.authenticate(currentPassword)){
//            System.out.println("Sorry, incorrect password");
//            return;
//        }

        String password = getPassword();
        userAuth.setValue(BCrypt.hashpw(password));
        userAuth.save();

        System.out.println("Password changed");
    }


  //**************************************************************************
  //** getPassword
  //**************************************************************************
    private static String getPassword() throws Exception {
        String pw = console.getPassword("Enter password: ");
        String pw2 = console.getPassword("Confirm password: ");
        if (!pw.equals(pw2)) {
            System.out.println("Passwords do not match. Please try again");
            getPassword();
        }
        return pw;
    }


  //**************************************************************************
  //** updateDatabase
  //**************************************************************************
    private static void updateDatabase(HashMap<String, String> args) throws Exception {
        String name = args.get("-name");
        if (name==null || name.isEmpty()) {
            System.out.println("-name is required");
            return;
        }
        name = name.toLowerCase();

        if (name.startsWith("usaspending")){
            updateUSASpending(args);
        }
        else if (name.startsWith("sam")){

        }
    }


  //**************************************************************************
  //** updateUSASpending
  //**************************************************************************
    private static void updateUSASpending(HashMap<String, String> args) throws Exception {

        JSONObject config = Config.get("sources").get("usaspending.gov").toJSONObject();
        String url = config.get("url").toString();
        String dir = config.get("dir").toString();
        Database database = javaxt.express.Config.getDatabase(config.get("database"));

        USASpending.updateDatabase(url, dir, database);
    }


  //**************************************************************************
  //** updateCompany
  //**************************************************************************
    private static void updateCompany(HashMap<String, String> args) throws Exception {

      //Get UEI
        String uei = args.get("-uei"); //P8T9JZVLSXA3
        if (uei==null || uei.isEmpty()) {
            System.out.println("-uei is required");
            return;
        }

      //Get input database (i.e. usaspending.gov)
        javaxt.sql.Database in = javaxt.express.Config.getDatabase(
        Config.get("sources").get("usaspending.gov").get("database"));


      //Get output database
        Config.initDatabase();
        javaxt.sql.Database out = Config.getDatabase();


      //Update company
        try(Connection c1 = in.getConnection()){
            try(Connection c2 = out.getConnection()){
                USASpending.updateCompany(uei, c1, c2);
            }
        }
    }


  //**************************************************************************
  //** updateCompanies
  //**************************************************************************
    private static void updateCompanies(HashMap<String, String> args) throws Exception {

      //Get UEI
        Integer numThreads = console.getValue(args, "-t", "-threads").toInteger();
        if (numThreads==null) numThreads = 4;

      //Get input database (i.e. usaspending.gov)
        javaxt.sql.Database in = javaxt.express.Config.getDatabase(
        Config.get("sources").get("usaspending.gov").get("database"));


      //Get output database
        Config.initDatabase();
        javaxt.sql.Database out = Config.getDatabase();


      //Update company
        USASpending.updateCompanies(in, out, numThreads);
    }



  //**************************************************************************
  //** updateAwards
  //**************************************************************************
    private static void updateAwards(HashMap<String, String> args) throws Exception {

      //Get UEI
        String uei = args.get("-uei"); //P8T9JZVLSXA3
        if (uei==null || uei.isEmpty()) {
            System.out.println("-uei is required");
            return;
        }

      //Get input database (i.e. usaspending.gov)
        javaxt.sql.Database in = javaxt.express.Config.getDatabase(
        Config.get("sources").get("usaspending.gov").get("database"));


      //Get output database
        Config.initDatabase();
        javaxt.sql.Database out = Config.getDatabase();


      //Update company
        try(Connection c1 = in.getConnection()){
            try(Connection c2 = out.getConnection()){
                USASpending.updateAwards(uei, c1, c2);
            }
        }
    }


  //**************************************************************************
  //** test
  //**************************************************************************
    private static void test(HashMap<String, String> args) throws Exception {

        String test = args.get("-test").toLowerCase();
        if (test.equals("database")){

            Config.initDatabase();

            try (Connection conn = Config.getDatabase().getConnection()){
                for (Table table : Database.getTables(conn)){
                    System.out.println(table);
                }
            }

        }
        else if (test.equals("query")){

            String folder = args.get("-folder");
            String file = args.get("-file");

            String q = com.kartographia.prospekt.queries.Index.getQuery(folder, file).getSQL();
            console.log(q);
        }
        else if (test.equals("usaspending")){
            testUSASpending(args);
        }
        else{
            System.out.println("\"" + test + "\" test not found");
        }
    }


  //**************************************************************************
  //** testUSASpending
  //**************************************************************************
    private static void testUSASpending(HashMap<String, String> args) throws Exception {

        JSONObject config = Config.get("sources").get("usaspending.gov").toJSONObject();

    }


}