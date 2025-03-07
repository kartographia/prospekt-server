package com.kartographia.prospekt.server;
import com.kartographia.prospekt.source.*;
import com.kartographia.prospekt.model.*;
import com.kartographia.prospekt.utils.*;

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
        javaxt.io.File configFile;
        if (args.containsKey("-config")){
            configFile = ConfigFile.getFile(args.get("-config"), jarFile);
            if (!configFile.exists()) {
                System.out.println("Could not find config file. " +
                "Use the \"-config\" parameter to specify a path to a config");
                return;
            }
        }
        else{
            javaxt.io.Directory dir = jarFile.getDirectory();
            configFile = new javaxt.io.File(dir, "config.json");
            if (!configFile.exists() && dir.getName().equals("dist")) {
                configFile = new javaxt.io.File(dir.getParentDirectory(), "config.json");
            }
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


          //Check whether to disable authentication
            Boolean disableAuth = new javaxt.utils.Value(args.get("-disableAuth")).toBoolean();
            disableAuth = (disableAuth!=null && disableAuth==true);
            User defaultUser = null;
            if (disableAuth){
                int id = Integer.parseInt(args.get("-defaultUser"));
                defaultUser = new User();
                javaxt.sql.Record r = Config.getDatabase().getRecord(
                "select * from \"user\" where id=" + id);
                if (r!=null){
                    JSONObject json = javaxt.express.utils.DbUtils.getJson(r);
                    defaultUser.update(json);
                }
                defaultUser.setID((long)id);
                defaultUser.setAccessLevel(5);
            }


          //Prompt user to create an admin account if one doesn't exist
            if (!disableAuth){
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


          //Get default user (optional)
            if (disableAuth){
                webConfig.set("disableAuth", disableAuth);
                webConfig.set("defaultUser", defaultUser);
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
        else if (str.equals("index")){
            updateIndex(args);
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
  //** updateIndex
  //**************************************************************************
    private static void updateIndex(HashMap<String, String> args) throws Exception {
        Config.initDatabase();
        javaxt.sql.Database database = Config.getDatabase();
        LuceneIndex index = Config.getIndex("companies");
        Maintenance.updateCompanyIndex(index, database);
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


      //Update company using data from USASpending
        USASpending.updateCompany(uei, in, out);

      //Update company using data from SAM
        SAM.updateCompany(uei, out);
    }


  //**************************************************************************
  //** updateCompanies
  //**************************************************************************
    private static void updateCompanies(HashMap<String, String> args) throws Exception {

      //Get
        Integer numThreads = console.getValue(args, "-t", "-threads").toInteger();
        if (numThreads==null) numThreads = 4;


        String source = args.get("-source").toLowerCase();
        if (source.equals("sam.gov")){

            javaxt.io.File input;
            try{
                input = new javaxt.io.File(args.get("-input"));
            }
            catch(Exception e){
                System.out.println("Invalid -input");
                return;
            }


          //Initialize prospekt database
            Config.initDatabase();
            Database database = Config.getDatabase();

          //Update companies
            SAM.updateCompanies(input, database, numThreads);

        }
        else if (source.equals("usaspending.gov")){


          //Get input database (i.e. usaspending.gov)
            javaxt.sql.Database in = Config.getAwardsDatabase();


          //Get output database
            Config.initDatabase();
            javaxt.sql.Database out = Config.getDatabase();


          //Update company
            USASpending.updateCompanies(in, out, numThreads);

        }
        else{
            System.out.println("Invalid -source");
        }
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
                //USASpending.updateAwards(uei, c1, c2);
            }
        }
    }


  //**************************************************************************
  //** test
  //**************************************************************************
    private static void test(HashMap<String, String> args) throws Exception {

        String test = args.get("-test").toLowerCase();
        if (test==null) test = "";
        else test = test.toLowerCase();

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

            String q = com.kartographia.prospekt.query.Index.getQuery(folder, file);
            console.log(q);
        }
        else if (test.equals("usaspending") || test.equals("awards")){
            testUSASpending(args);
        }
        else if (test.equals("sam")){
            testSAM(args);
        }
        else if (test.equals("index")){
            testIndex(args);
        }
        else{
            System.out.println("Test not found. Check -test argument.");
        }
    }


  //**************************************************************************
  //** testSAM
  //**************************************************************************
    private static void testSAM(HashMap<String, String> args) throws Exception {
        Config.initDatabase();

        String get = args.get("-get");
        if (get==null) get = "";
        else get = get.toLowerCase();

        if (get.equals("opportunity")){
            //Opportunity opp = SAM.getOpportunity(null, null);
            //console.log(opp.toJson().toString(4));
        }
        else if (get.equals("opportunities")){
            for (Opportunity opp : SAM.getOpportunities()){
                console.log(opp.getName(), opp.getNaics());
            }
        }
        else if (get.equals("entity")){
            JSONObject entity = SAM.getEntity(args.get("-uei"));

            System.out.println(entity.toString(4));

            JSONArray arr = entity.get("coreData").get("businessTypes").get("businessTypeList").toJSONArray();
            System.out.println(arr.toString(4));
        }
        else{
            System.out.println("Test not found. Check -get argument.");
        }
    }


  //**************************************************************************
  //** testUSASpending
  //**************************************************************************
    private static void testUSASpending(HashMap<String, String> args) throws Exception {

        JSONObject config = Config.get("sources").get("usaspending.gov").toJSONObject();


        Database database = Config.getAwardsDatabase();
        console.log(USASpending.getDate(database));
        try (Connection conn = database.getConnection()){
            for (Table table : Database.getTables(conn)){
                System.out.println(table);
            }
        }
    }


  //**************************************************************************
  //** testIndex
  //**************************************************************************
    private static void testIndex(HashMap<String, String> args) throws Exception {

        String company = args.get("-company");
        if (company!=null){
            LuceneIndex index = Config.getIndex("companies");
            List<String> searchTerms = new ArrayList<>();
            searchTerms.add(company);
            for (javaxt.utils.Record record : index.getRecords(searchTerms, 10)){
                console.log(new JSONObject(record));
            }
        }
        else{
            System.out.println("Test not found.");
        }
    }


}