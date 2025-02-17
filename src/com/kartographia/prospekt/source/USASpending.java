package com.kartographia.prospekt.source;
import com.kartographia.prospekt.model.*;
import static com.kartographia.prospekt.source.Utils.*;
import static com.kartographia.prospekt.query.Index.getQuery;

import java.util.*;
import java.util.zip.*;
import java.math.BigDecimal;
import static java.lang.Integer.parseInt;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import javaxt.sql.*;
import javaxt.json.*;
import javaxt.utils.ThreadPool;
import static javaxt.utils.Console.console;

import javaxt.express.utils.StatusLogger;
import static javaxt.express.utils.StringUtils.*;


public class USASpending {

    private static ConcurrentHashMap<String, Long> addresses = new ConcurrentHashMap<>(1000000);
    private static ConcurrentHashMap<String, Long> people = new ConcurrentHashMap<>(1000000);


  //**************************************************************************
  //** updateDatabase
  //**************************************************************************
  /** Used to download a database backup from usaspending.gov and restore it
   *  in a local database
   *  @param url Download page on usaspending.gov
   *  @param dir Directory where to download the database backup
   *  @param db Database where to restore the backup
   */
    public static void updateDatabase(String url, String dir, Database db) throws Exception {

        String html = new javaxt.http.Request(url).getResponse().getText();
        for (javaxt.html.Element el : new javaxt.html.Parser(html).getElementsByTagName("a")){
            String relPath = el.getAttribute("href");
            if (relPath.contains("usaspending-db_")){
                String date = relPath.substring(relPath.lastIndexOf("_")+1, relPath.lastIndexOf("."));
                String path = javaxt.html.Parser.getAbsolutePath(relPath, url);
                String year = date.substring(0, 4);
                String month = date.substring(4, 6);
                String day = date.substring(6);
                console.log(date, year + "-" + month + "-" + day);
                console.log(path);


                javaxt.io.Directory localDir = new javaxt.io.Directory(dir);
                localDir = new javaxt.io.Directory(localDir + year + "-" + month + "-" + day);
                console.log(localDir);


                if (!localDir.exists()){


                  //Download the zip file as needed
                    String localFileName = "usaspending-db_" + date + ".zip";
                    javaxt.io.File zipFile = new javaxt.io.File(localDir, localFileName);
                    if (!zipFile.exists()){
                        try (java.io.InputStream is = new javaxt.http.Request(path).getResponse().getInputStream()){
                            zipFile.write(is);
                        }
                    }


                  //Unzip the file
                    byte[] buffer = new byte[1024];
                    try (ZipInputStream is = new ZipInputStream(zipFile.getInputStream())){
                        ZipEntry zipEntry = is.getNextEntry();
                        while (zipEntry != null) {
                            java.io.File file = new java.io.File(localDir.toFile(), zipEntry.getName());
                            if (!file.exists()){
                                if (zipEntry.isDirectory()) {
                                    if (!file.isDirectory() && !file.mkdirs()) {
                                        throw new Exception("Failed to create directory " + file);
                                    }
                                }
                                else {
                                    // fix for Windows-created archives
                                    java.io.File parent = file.getParentFile();
                                    if (!parent.isDirectory() && !parent.mkdirs()) {
                                        throw new Exception("Failed to create directory " + parent);
                                    }

                                    // write file content
                                    try (java.io.FileOutputStream out = new java.io.FileOutputStream(file)){
                                        int len;
                                        while ((len = is.read(buffer)) > 0) {
                                            out.write(buffer, 0, len);
                                        }
                                    }
                                }
                            }
                            zipEntry = is.getNextEntry();
                        }

                        is.closeEntry();
                    }
                }


                //Create new database

                //Create roles

                //Restore the backup


                //Create table with unique UEI numbers
                //create table distinct_uei as select distinct(awardee_or_recipient_uei) as uei from raw.source_procurement_transaction;


                //TODO: store database date somewhere in the database
            }
        }

    }


  //**************************************************************************
  //** getDate
  //**************************************************************************
  /** Returns the last update associated with the database
   */
    public static String getDate() {
        return getDate(null);
    }

    public static String getDate(Database db){
        if (db==null) db = com.kartographia.prospekt.server.Config.getAwardsDatabase();
        String name = db.getName();
        int idx = name.indexOf("_");
        if (idx==-1) throw new IllegalArgumentException();
        String date = name.substring(idx+1);
        String year = date.substring(0, 4);
        String month = date.substring(4, 6);
        String day = date.substring(6);
        return year+"-"+month+"-"+day; //"2024-02-08";
    }


  //**************************************************************************
  //** updateCodes
  //**************************************************************************
  /** Used to populate the code look-up table
   */
    public static void updateCodes(Connection in, Connection out) throws Exception {

        long sourceID = getOrCreateSource(out);

        for (String type : new String[]{"action", "competition", "contract"}){


          //Get existing codes
            HashMap<String, JSONObject> codes = new HashMap<>();
            for (javaxt.sql.Record record : out.getRecords(
                "select id, key, value from code where source_id=" + sourceID +
                " and type='" + type + "'")){
                codes.put(record.get("key").toString(), record.toJson());
            }


          //Get codes from the source database
            String sql = getQuery("usaspending", type + "_code");
            for (javaxt.sql.Record record : in.getRecords(sql)){
                String str = record.get(0).toString();
                int idx = str.indexOf(":");
                String key = str.substring(0, idx).trim();
                String val = str.substring(idx+1).trim();


                JSONObject code = codes.get(key);
                if (code==null){
                    code = new JSONObject();
                    code.set("key", key);
                    code.set("value", val);
                    codes.put(key, code);
                }
                else{
                    String v = code.get("value").toString();
                    if (v.equalsIgnoreCase(val)){
                        codes.remove(key);
                    }
                    else{
                        if (val.length()>v.length()){
                            code.set("value", val);
                        }
                    }
                }
            }


          //Create or update codes in our database
            Iterator<String> it = codes.keySet().iterator();
            while (it.hasNext()){
                JSONObject code = codes.get(it.next());
                Long id = code.get("id").toLong();


                try (Recordset rs = out.getRecordset(
                    "select * from code where id=" + (id==null ? -1 : id), false)){
                    if (id==null){
                        rs.addNew();
                        rs.setValue("source_id", sourceID);
                        rs.setValue("category", type);
                    }
                    rs.setValue("key", code.get("key"));
                    rs.setValue("value", code.get("value"));
                    rs.update();
                }

            }

        }
    }


  //**************************************************************************
  //** updateCompanies
  //**************************************************************************
  /** Used to update all the companies in the database
   */
    public static void updateCompanies(Database in, Database out, int numThreads) throws Exception {


        AtomicLong recordCounter = new AtomicLong(0);
        StatusLogger statusLogger = new StatusLogger(recordCounter);
        long startTime = System.currentTimeMillis();


      //Get sourceID
        long sourceID;
        try (Connection conn = out.getConnection()){
            sourceID = getOrCreateSource(conn);
        }


      //Start thread pool
        ThreadPool pool = new ThreadPool(numThreads){
            public void process(Object obj){
                String uei = (String) obj;

                Connection conn = (Connection) get("conn", () -> {
                    return in.getConnection();
                });

                Connection c2 = (Connection) get("c2", () -> {
                    return out.getConnection();
                });

                try{
                    updateCompany(uei, sourceID, conn, c2);
                    recordCounter.incrementAndGet();
                }
                catch(Exception e){
                    e.printStackTrace();
                }
            }

            public void exit(){
                Connection conn = (Connection) get("conn");
                if (conn!=null) conn.close();

                Connection c2 = (Connection) get("c2");
                if (c2!=null) c2.close();
            }

        }.start();


      //Add UEIs to the pool to process
        long t = 0;
        String sql = getQuery("usaspending", "distinct_uei");
        try (Connection conn = in.getConnection()){
            for (javaxt.sql.Record record : conn.getRecords(sql)){
                String uei = record.get(0).toString();
                if (uei!=null){
                    pool.add(uei);
                    t++;
                }
            }
        }
        statusLogger.setTotalRecords(t);

        pool.done();
        pool.join();

        statusLogger.shutdown();
        console.log("Updated " + format(t) + " companies in " + getElapsedTime(startTime));
    }


  //**************************************************************************
  //** updateCompany
  //**************************************************************************
  /** Used to update company name, addresses, and officers
   *  @param uei Company ID
   *  @param in Input database (usaspending.gov)
   *  @param out Output database (prospekt database)
   */
    public static void updateCompany(String uei, Connection in, Connection out)
        throws Exception {

      //Get sourceID
        long sourceID = getOrCreateSource(out);
        updateCompany(uei, sourceID, in, out);
    }


    private static void updateCompany(String uei, long sourceID,
        Connection in, Connection out) throws Exception {

        String sql = getQuery("usaspending", "company_info").replace("{uei}", uei);


        LinkedHashMap<String, LinkedHashMap<String, javaxt.utils.Date>> companyNames = new LinkedHashMap<>();
        LinkedHashMap<String, LinkedHashMap<String, CompanyAddress>> companyAddresses = new LinkedHashMap<>();
        LinkedHashMap<String, LinkedHashMap<String, CompanyOfficer>> companyOfficers = new LinkedHashMap<>();


        for (javaxt.sql.Record record : in.getRecords(sql)){
            String id = record.get("uei").toString();
            javaxt.utils.Date lastUpdate = record.get("l").toDate();


            if (id==null || !id.equals(uei)) continue;


          //Update company names
            String[] companyName = getCompanyName(record.get("name").toString());
            String name = companyName[0];
            String suffix = companyName[1];

            LinkedHashMap<String, javaxt.utils.Date> names = companyNames.get(id);
            if (names==null){
                names = new LinkedHashMap<>();
                companyNames.put(id, names);
            }

            if (name!=null){
                name = name.toUpperCase();
                if (!names.containsKey(name)){
                    names.put(name, lastUpdate);
                }
            }


          //Update company addresses
            Address address = new Address();
            address.setStreet(record.get("address").toString());
            address.setCity(record.get("city").toString());
            address.setState(record.get("state").toString());
            address.setCountry(record.get("country").toString()); //fallback for missing state
            String addressKey = null;
            try{
                addressKey = getAddress(address); //exclude zip!
            }
            catch(Exception e){}
            address.setPostalCode(record.get("zip").toString());



            LinkedHashMap<String, CompanyAddress> addresses = companyAddresses.get(id);
            if (addresses==null){
                addresses = new LinkedHashMap<>();
                companyAddresses.put(id, addresses);
            }

            if (addressKey!=null && !addressKey.isBlank()){
                addressKey = addressKey.toUpperCase();
                if (!addresses.containsKey(addressKey)){
                    CompanyAddress companyAddress = new CompanyAddress();
                    companyAddress.setAddress(address);
                    companyAddress.setDate(lastUpdate);
                    address.setSearchTerm(addressKey);
                    addresses.put(addressKey, companyAddress);
                }
            }


          //Update officers
            for (int i=1; i<5; i++){
                String key = "o" + i + "_";
                String fullName = record.get(key+"name").toString();
                Integer salary = record.get(key+"sal").toInteger();

                if (fullName!=null){
                    while (fullName.contains("  ")) fullName = fullName.replace("  ", " ").trim();
                    String[] arr = fullName.trim().split(" ");
                    if (arr.length>0){
                        String firstName = arr[0];
                        String lastName = arr.length>1 ? arr[arr.length-1] : null;

                        Person person = new Person();
                        person.setFirstName(firstName);
                        person.setLastName(lastName);
                        person.setFullName(fullName);


                        String searchTerm = getFirstName(firstName).toUpperCase();
                        if (lastName!=null) searchTerm += " " + lastName.toUpperCase();
                        person.setSearchTerm(searchTerm);



                        LinkedHashMap<String, CompanyOfficer> officers = companyOfficers.get(id);
                        if (officers==null){
                            officers = new LinkedHashMap<>();
                            companyOfficers.put(id, officers);
                        }


                        CompanyOfficer officer = officers.get(searchTerm);
                        if (officer==null){
                            officer = new CompanyOfficer();
                            officer.setPerson(person);
                            officers.put(searchTerm, officer);
                        }


                      //Update salary history
                        if (salary!=null){

                            JSONObject info = officer.getInfo();
                            if (info==null){
                                info = new JSONObject();
                                officer.setInfo(info);
                            }

                            JSONArray salaryHistory = info.get("salaryHistory").toJSONArray();
                            if (salaryHistory==null) salaryHistory = new JSONArray();



                            String date = lastUpdate.toString("yyyy-MM-dd");
                            boolean addSalary = true;
                            for (JSONValue v : salaryHistory){

                                String d = v.get("date").toString();
                                Integer s = v.get("salary").toInteger();

                                if (date.equals(d)){
                                    addSalary = false;
                                    if (salary>s){
                                        //v.toJSONObject().set("salary", salary);
                                    }
                                    break;
                                }
                            }

                            if (addSalary){
                                JSONObject json = new JSONObject();
                                json.set("date", date);
                                json.set("salary", salary);
                                salaryHistory.add(json);
                            }

                            info.set("salaryHistory", salaryHistory);
                        }
                    }
                }
            }
        }


        Iterator<String> it, i2;



      //Process company info
        it = companyNames.keySet().iterator();
        while (it.hasNext()){
            uei = it.next();


          //Get or create company
            Long companyID = null;
            try (Recordset rs = out.getRecordset(
                "select * from company where uei='" + uei + "'", false)){

                JSONObject info;
                if (rs.EOF){
                    rs.addNew();
                    rs.setValue("uei", uei);
                    info = new JSONObject();
                }
                else{
                    companyID = rs.getValue("id").toLong();
                    info = new JSONObject(rs.getValue("info").toString());
                }

              //Set name
                LinkedHashMap<String, javaxt.utils.Date> names = companyNames.get(uei);
                if (!names.isEmpty()){
                    String name = names.keySet().iterator().next();
                    rs.setValue("name", name);


                  //Update metadata
                    JSONArray arr = new JSONArray();
                    info.set("names", arr);
                    i2 = names.keySet().iterator();
                    while (i2.hasNext()){
                        String companyName = i2.next();
                        javaxt.utils.Date lastUpdate = names.get(companyName);

                        JSONObject json = new JSONObject();
                        json.set("name", companyName);
                        json.set("date", lastUpdate.toString("M/d/yyyy"));
                        arr.add(json);
                    }
                }
                else{
                    rs.setValue("name", "n/a");
                }

              //Update record
                rs.update();


              //Set companyID as needed
                if (companyID==null) companyID = rs.getGeneratedKey().toLong();
            }



          //Get or create addresses
            //console.log("Addresses:");
            LinkedHashMap<String, CompanyAddress> addresses = companyAddresses.get(uei);
            i2 = addresses.keySet().iterator();
            while (i2.hasNext()){
                String addressKey = i2.next();
                CompanyAddress companyAddress = addresses.get(addressKey);
                javaxt.utils.Date lastUpdate = companyAddress.getDate();

                //console.log("-", addressKey, lastUpdate.toString("M/d/yyyy"));


              //Get or create address
                Long addressID = getOrCreateAddress(companyAddress, addressKey, out);


              //Get or create company address
                String date = lastUpdate.toString("yyyy-MM-dd");
                try (Recordset rs = out.getRecordset(
                    "select * from company_address where company_id=" +
                    companyID + " and address_id=" + addressID +
                    " and date='" + date + "'", false)){

                    if (rs.EOF){
                        rs.addNew();
                        rs.setValue("company_id", companyID);
                        rs.setValue("address_id", addressID);
                        rs.setValue("date", lastUpdate);
                        rs.update();
                    }
                }
            }



          //Get or create officers
            //console.log("Officers:");
            LinkedHashMap<String, CompanyOfficer> officers = companyOfficers.get(uei);
            if (officers!=null){
                i2 = officers.keySet().iterator();
                while (i2.hasNext()){
                    String searchTerm = i2.next();
                    CompanyOfficer officer = officers.get(searchTerm);
                    Person person = officer.getPerson();


                  //Parse metadata
                    Integer salary = null;
                    javaxt.utils.Date lastUpdate = null;
                    JSONObject info = officer.getInfo();
                    if (info!=null){
                        JSONArray salaryHistory = info.get("salaryHistory").toJSONArray();
                        if (salaryHistory!=null){


                          //Create an ordered list of salaries
                            TreeMap<String, TreeSet<Integer>> salaries = new TreeMap<>();
                            for (JSONValue a : salaryHistory){
                                String date = a.get("date").toString();
                                Integer sal = a.get("salary").toInteger();
                                TreeSet<Integer> s = salaries.get(date);
                                if (s==null){
                                    s = new TreeSet<>();
                                    salaries.put(date, s);
                                }
                                s.add(sal);
                            }


                          //Update salaryHistory
                            salaryHistory = new JSONArray();
                            info.set("salaryHistory", salaryHistory);
                            Integer prevSal = null;
                            Iterator<String> i3 = salaries.keySet().iterator();
                            while (i3.hasNext()){
                                String date = i3.next();
                                TreeSet<Integer> s = salaries.get(date);
                                Integer sal = s.last(); //biggest value

                                if (!sal.equals(prevSal) || date.equals(salaries.lastKey())){
                                    //console.log(date, sal);
                                    JSONObject json = new JSONObject();
                                    json.set("date", date);
                                    json.set("salary", sal);
                                    salaryHistory.add(json);
                                }

                                prevSal = sal;
                            }


                          //Set salary
                            salary = prevSal;


                          //Set lastUpdate
                            javaxt.utils.Date lastDate = new javaxt.utils.Date(salaries.lastKey());
                            if (lastUpdate==null || lastDate.isAfter(lastUpdate)) lastUpdate = lastDate;

                        }
                    }


                    //console.log("-", person.getFullName(), lastUpdate.toString("M/d/yyyy"), salary);



                  //Get or create person
                    Long personID = getOrCreatePerson(person, searchTerm, out);



                  //Get or create company officer
                    try (Recordset rs = out.getRecordset(
                        "select * from company_officer where company_id=" +
                        companyID + " and person_id=" + personID, false)){

                        if (rs.EOF){
                            rs.addNew();
                            rs.setValue("company_id", companyID);
                            rs.setValue("person_id", personID);
                        }


                        if (salary!=null){
                            Integer prevSalary = rs.getValue("salary").toInteger();
                            if (!salary.equals(prevSalary)) rs.setValue("salary", salary);
                        }


                        if (lastUpdate!=null){
                            rs.setValue("last_update", lastUpdate);
                        }


                        if (info!=null){
                            rs.setValue("info", new javaxt.sql.Function(
                                "?::jsonb", info.toString()
                            ));
                        }

                        rs.update();
                    }
                }
            }


          //Update awards associated with the company
            ArrayList<JSONObject> awards = getAwards(uei, in);
            saveAwards(awards, companyID, sourceID, out);


          //Update company profile
            updateCompanyProfile(awards, companyID, out);
        }
    }


  //**************************************************************************
  //** getOrCreateAddress
  //**************************************************************************
    private static synchronized Long getOrCreateAddress(CompanyAddress companyAddress, String addressKey, Connection conn) throws Exception {
        Long addressID;
        synchronized(addresses){
            addressID = addresses.get(addressKey);
        }
        if (addressID!=null) return addressID;


        try (Recordset rs = conn.getRecordset(
            "select * from address where search_term='" + addressKey.replace("'", "''") + "'", false)){ //lazy key search

            if (rs.EOF){
                rs.addNew();
                rs.setValue("search_term", addressKey);
                JSONObject address = companyAddress.getAddress().toJson();
                for (String key : address.keySet()){
                    if (key.equals("info")){
                        if (!address.isNull(key)){
                            rs.setValue(key, new javaxt.sql.Function(
                                "?::jsonb", new Object[]{
                                    address.get(key).toString()
                                }
                            ));
                        }
                    }
                    else{
                        rs.setValue(key, address.get(key));
                    }
                }
                rs.update();
                addressID = rs.getGeneratedKey().toLong();
            }
            else{
                addressID = rs.getValue("id").toLong();
            }
        }

        if (addressID!=null){
            synchronized(addresses){
                addresses.put(addressKey, addressID);
                addresses.notify();
            }
        }

        return addressID;
    }


  //**************************************************************************
  //** getOrCreatePerson
  //**************************************************************************
    private static synchronized Long getOrCreatePerson(Person person, String searchTerm, Connection conn) throws Exception {
        Long personID;
        synchronized(people){
            personID = people.get(searchTerm);
        }
        if (personID!=null) return personID;


        try (Recordset rs = conn.getRecordset(
            "select * from person where search_term='" + searchTerm.replace("'", "''") + "'", false)){ //lazy key search

            if (rs.EOF){
                rs.addNew();
                rs.setValue("search_term", searchTerm);

                JSONObject json = person.toJson();
                for (String key : json.keySet()){
                    if (key.equals("info")){
                        if (!json.isNull(key)){
                            rs.setValue(key, new javaxt.sql.Function(
                                "?::jsonb", new Object[]{
                                    json.get(key).toString()
                                }
                            ));
                        }
                    }
                    else{
                        rs.setValue(camelCaseToUnderScore(key), json.get(key));
                    }
                }

                rs.update();
                personID = rs.getGeneratedKey().toLong();
            }
            else{
                personID = rs.getValue("id").toLong();
            }
        }

        if (personID!=null){
            synchronized(people){
                people.put(searchTerm, personID);
                people.notify();
            }
        }

        return personID;
    }


  //**************************************************************************
  //** getAwards
  //**************************************************************************
  /** Returns an ordered list of awards for a given company
   *  @param uei Company ID
   *  @param conn Connection to the awards database
   */
    private static ArrayList<JSONObject> getAwards(String uei, Connection conn) throws Exception {
        JSONObject prevAward = new JSONObject();
        ArrayList<JSONObject> awards = new ArrayList<>();
        String sql = getQuery("usaspending", "awards_by_company").replace("{uei}", uei);
        for (javaxt.sql.Record record : conn.getRecords(sql)){


          //Get award ID (sourceKey)
            String awardID = getString(record.get("piid"));


          //Get descriptive name of the award
            String name = getString(record.get("award_description"));


          //Build description
            String description = "";
            for (String key : new String[]{
                "product_or_service_description",
                "naics_description",
                "commercial_item_acqui_desc"}){
                String d = record.get(key).toString();
                if (d!=null){
                    d = d.trim();
                    if (!d.isEmpty()){
                        if (!d.endsWith(".")) d += ".";
                        if (description.length()>0) description += " ";
                        description += d;
                    }
                }
            }
            if (description.isEmpty()) description = null;



          //Get type of award
            String type = null;
            if (in(record.get("type_of_contract_pricing"), "A,B,J,K,L,M")){
                type = "Fixed Price";
            }
            else if (in(record.get("type_of_contract_pricing"), "S,T")){
                type = "Cost";
            }
            else if (in(record.get("type_of_contract_pricing"), "R,U,V")){
                type = "Cost Plus";
            }
            else if (in(record.get("type_of_contract_pricing"), "Y,Z")){
                type = "T&M";
            }


          //Get value of the award
            Double awardedValue = record.get("awarded_value").toDouble();
            Double fundedValue = record.get("funded_value").toDouble();
            Double extendedValue = record.get("extended_value").toDouble();




          //Get naics code of the award
            String naics = getString(record.get("naics"));



          //Get customer and office
            String customer = getString(record.get("customer"));
            if (customer!=null){
                if (customer.contains("(") && customer.endsWith(")")){
                    String abbr = customer.substring(customer.lastIndexOf("(")+1, customer.length()-1).trim();
                    if (!abbr.isEmpty()){
                        if (!(abbr.equalsIgnoreCase("null") || abbr.equalsIgnoreCase("nan"))){
                            customer = abbr.toUpperCase();
                        }
                    }
                }
            }
            String office = getString(record.get("office"));


          //Get dates
            javaxt.utils.Date startDate = record.get("start_date").toDate();
            javaxt.utils.Date endDate = record.get("end_date").toDate();
            javaxt.utils.Date extendedDate = record.get("extended_date").toDate();


          //Get competed
            boolean competed = in(record.get("extent_competed"), "A,D,E,F,CDO");



          //Create/update award
            JSONObject award;
            if (awardID==null) awardID = ""; //very rare NPE
            if (awardID.equals(prevAward.get("source_key").toString())){
                award = prevAward;

                //setIfNull("name", name, award);
                setIfNull("description", description, award);
                //setIfNull("date", date, award);
                setIfNull("type", type, award);
                setIfNull("naics", naics, award);


                if (awardedValue!=null){
                    Double v = award.get("value").toDouble();
                    if (v!=null) award.set("value", Math.max(v, awardedValue));
                }

                if (extendedValue!=null){
                    Double v = award.get("extended_value").toDouble();
                    if (v!=null) award.set("extended_value", Math.max(v, extendedValue));
                }

                setIfNull("customer", customer, award);
                setIfNull("office", office, award);

                setIfNull("start_date", startDate, award);
                javaxt.utils.Date s = award.get("start_date").toDate();
                if (s!=null && s.isAfter(startDate)) award.set("start_date", startDate);

                setIfNull("end_date", endDate, award);
                javaxt.utils.Date e = award.get("end_date").toDate();
                if (e!=null && e.isBefore(endDate)) award.set("end_date", endDate);

                setIfNull("extended_date", extendedDate, award);
                javaxt.utils.Date x = award.get("extended_date").toDate();
                if (x!=null && x.isBefore(extendedDate)) award.set("extended_date", extendedDate);

            }
            else{


                award = new JSONObject();
                //award.set("name", name);
                award.set("description", description);
                //award.set("date", date);
                award.set("type", type);
                award.set("value", awardedValue);
                //award.set("funded", fundedValue);
                award.set("extended_value", extendedValue);
                award.set("naics", naics);
                award.set("customer", customer);
                award.set("office", office);
                award.set("start_date", startDate);
                award.set("end_date", endDate);
                award.set("extended_date", extendedDate);
                award.set("competed", competed);
                award.set("source_key", awardID);


                JSONObject info = new JSONObject();
                award.set("info", info);

                JSONArray actions = new JSONArray();
                info.set("actions", actions);

                awards.add(award);
            }



          //Update award metadata
            JSONObject info = award.get("info").toJSONObject();
            info.set("solicitation_identifier", record.get("solicitation_identifier"));
            String solicitationDate = record.get("solicitation_date").toString();
            if (solicitationDate!=null){
                solicitationDate = solicitationDate.replace("00:00:00", "").trim();
                info.set("solicitation_date", solicitationDate);
            }
            info.set("award_key", record.get("unique_award_key"));
            javaxt.utils.Date actionDate = record.get("action_date").toDate();
            if (actionDate!=null){

                String actionType = record.get("action_type").toString();
                if (actionType==null) actionType = "-";

                JSONObject action = new JSONObject();
                action.set("date", actionDate.toString("yyyy-MM-dd"));
                action.set("type", actionType);
                action.set("desc", name);
                action.set("funding", fundedValue);
                JSONArray actions = info.get("actions").toJSONArray();
                actions.add(action);
            }


            prevAward = award;
        }



      //Update award name, date, type, and funded value
        for (JSONObject award : awards){

            JSONObject info = award.get("info").toJSONObject();
            JSONArray actions = info.get("actions").toJSONArray();
            TreeMap<String, String> titles = new TreeMap<>();
            boolean foundIDIQ = false;
            for (JSONValue a : actions){
                String date = a.get("date").toString();
                String desc = a.get("desc").toString();
                if (desc!=null && desc.contains("IDIQ")) foundIDIQ = true;

                if (titles.containsKey(date)){
                    String t = titles.get(date);
                    if (t==null && desc!=null) titles.put(date, desc);
                }
                else{
                    titles.put(date, desc);
                }
            }

            String firstDate = titles.firstKey(); //date in yyyy-mm-dd format
            javaxt.utils.Date awardDate = new javaxt.utils.Date(firstDate);
            javaxt.utils.Date startDate = award.get("start_date").toDate();
            if (startDate!=null && startDate.isBefore(awardDate)) awardDate = startDate;
            award.set("date", awardDate);

            String title = titles.get(firstDate);
            if (title==null) title = "n/a";
            award.set("name", title);

            if (foundIDIQ){
                award.set("type", "IDIQ");
            }

            BigDecimal totalFunding = new BigDecimal(0);
            Iterator<String> it = titles.keySet().iterator();
            while (it.hasNext()){
                String date = it.next();
                String desc = titles.get(date);

                if (desc!=null && award.isNull("name")){
                    award.set("name", desc);
                }

                for (JSONValue a : actions){
                    if (a.get("date").toString().equals(date)){
                        BigDecimal d = a.get("funding").toBigDecimal();
                        if (d!=null){
                            totalFunding = totalFunding.add(d);
                        }
                    }
                }
            }
            award.set("funded", totalFunding);
        }


        return awards;
    }


  //**************************************************************************
  //** saveAwards
  //**************************************************************************
  /** Used to save awards for a given company
   *  @param awards An ordered list of awards for a given company. See getAwards()
   *  @param companyID Database key associated with the company
   *  @param conn Connection to the prospekt database
   */
    private static void saveAwards(ArrayList<JSONObject> awards, Long companyID, long sourceID, Connection conn) throws Exception {
        if (companyID==null) throw new Exception();


        for (JSONObject award : awards){

            String sourceKey = award.get("source_key").toString();
            try (Recordset rs = conn.getRecordset(
                "select * from award where recipient_id=" + companyID +
                " and source_id=" + sourceID +
                " and source_key='" + sourceKey + "'", false)){

                if (rs.EOF){
                    rs.addNew();
                    rs.setValue("recipient_id", companyID);
                    rs.setValue("source_id", sourceID);
                    rs.setValue("source_key", sourceKey);
                }

                for (String key : award.keySet()){
                    if (key.equals("info")){
                        JSONObject info = award.get("info").toJSONObject();
                        rs.setValue("info", new javaxt.sql.Function(
                            "?::jsonb", info.toString()
                        ));
                    }
                    else{
                        rs.setValue(key, award.get(key));
                    }
                }
                rs.update();
            }
        }
    }


  //**************************************************************************
  //** updateCompanyProfile
  //**************************************************************************
  /** Used to update a company profile including estimated revenue, backlog,
   *  recent customers, etc using awards data
   *  @param awards An ordered list of awards for a given company. See getAwards()
   *  @param companyID Database key associated with the company
   *  @param conn Connection to the prospekt database
   */
    private static void updateCompanyProfile(ArrayList<JSONObject> awards, Long companyID, Connection conn) throws Exception {


        var dbDate = getDate();
        dbDate = new javaxt.utils.Date(dbDate).subtract(1, "month").format("YYYY-MM-") + "01";
        javaxt.utils.Date lastUpdate = new javaxt.utils.Date(dbDate).add(1, "month").subtract(1, "second");


        javaxt.utils.Date prevYear = lastUpdate.clone().add(-1, "year");
        HashSet<String> recentCustomers = new HashSet<>();
        HashSet<String> recentNaics = new HashSet<>();
        int recentAwards = 0;
        int competedAwards = 0;
        double totalValue = 0.0;
        double annualRevenue = 0.0;
        double totalBacklog = 0.0;
        var revenue = new TreeMap<String, Double>();


        for (JSONObject award : awards){

            Double awardValue = award.get("value").toDouble();
            Double awardFunded = award.get("funded").toDouble();
            String awardType = award.get("type").toString();
            if (awardType==null) awardType = "";


          //Update awardValue as needed
            if (awardValue==null || awardValue==0) awardValue = awardFunded;
            if (awardValue==null || awardValue==0){
                awardValue = award.get("extended_value").toDouble();
            }



          //Use the funded value if the award "value" is null or if the
          //award "type" is an IDIQ
            if (awardType.equals("IDIQ")){
                if (awardFunded!=null) awardValue = awardFunded;
            }



          //Estimate monthly revenue for the award
            javaxt.utils.Date startDate = award.get("start_date").toDate();
            if (startDate!=null && awardValue!=null){


              //Come up with a reasonable end date
                javaxt.utils.Date endDate = startDate.clone();
                javaxt.utils.Date m = award.get("end_date").toDate();
                if (m!=null){
                    if (m.isAfter(endDate)) endDate = m;
                }
                m = award.get("extended_date").toDate();
                if (m!=null){
                    if (m.isAfter(endDate)) endDate = m;
                }
                var t = lastUpdate.clone().add(1, "year");
                if (endDate.isAfter(t)){
                    endDate = t;
                }


              //Calculate monthly revenue
                var diff = javaxt.utils.Date.getMonthsBetween(startDate, endDate);
                var totalMonths = (int) Math.ceil(diff);
                var monthlyRevenue = awardValue/totalMonths;


                var d = startDate.clone();
                var ttl = 0;

                for (var i=0; i<totalMonths; i++){

                  //Generate key using the last day of the month
                    var nextMonth = d.clone().add(1, "month");
                    nextMonth.setDate(nextMonth.getYear(), nextMonth.getMonth(), 1).removeTimeStamp();
                    var key = nextMonth.add(-1, "day").toString("yyyy-MM-dd");


                  //Compute revenue for the current month
                  //Ensure that it does not exceed total revenue
                    var currRevenue = 0.0;
                    if (ttl+monthlyRevenue>awardValue){
                        currRevenue = awardValue-ttl;
                    }
                    else{
                        currRevenue = monthlyRevenue;
                    }
                    ttl += currRevenue;



                  //Update all revenue
                    var val = revenue.get(key);
                    if (val!=null) val += currRevenue;
                    else val = currRevenue;
                    revenue.put(key, val);




                  //Increment date by one month
                    d.add(1, "month");
                }

            }



          //Update recent customers and naics codes
            javaxt.utils.Date endDate = award.get("end_date").toDate();
            if (endDate==null) endDate = award.get("extended_date").toDate();
            if (endDate==null) endDate = startDate;
            if (endDate!=null && endDate.isAfter(prevYear)){

              //Update total value of recent awards
                if (awardValue!=null) totalValue += awardValue;

              //Update count of recent and competed awards
                recentAwards++;
                if (award.get("competed").toBoolean()) competedAwards++;

              //Update customers
                String customer = award.get("customer").toString();
                if (customer!=null) recentCustomers.add(customer);

              //Update naics
                String naics = award.get("naics").toString();
                if (naics!=null) recentNaics.add(naics);
            }

        }



      //Compute annual revenue and total backlog
        var today = parseInt(lastUpdate.toString("yyyyMMdd"));
        var lastYear = parseInt(prevYear.toString("yyyyMMdd"));
        Iterator<String> it = revenue.keySet().iterator();
        while (it.hasNext()){
            String date = it.next();
            var d = parseInt(date.replaceAll("-",""));

            if (d>today){
                totalBacklog+=revenue.get(date);
                continue;
            }
            else{
                if (d>=lastYear){
                    annualRevenue+=revenue.get(date);
                }
            }

        }




        try (Recordset rs = conn.getRecordset(
            "select * from company where id=" + companyID, false)){

            if (recentAwards>0){
                rs.setValue("recent_awards", recentAwards);
                rs.setValue("recent_award_val", Math.round(totalValue));
                rs.setValue("recent_award_mix", Math.round((((double)competedAwards/(double)recentAwards))*100.0));

                if (recentCustomers.isEmpty()) rs.setValue("recent_customers", null);
                else rs.setValue("recent_customers",recentCustomers.toArray(new String[recentCustomers.size()]));

                if (recentNaics.isEmpty()) rs.setValue("recent_naics", null);
                else rs.setValue("recent_naics",recentNaics.toArray(new String[recentNaics.size()]));

                rs.setValue("estimated_revenue", Math.round(annualRevenue));
                rs.setValue("estimated_backlog", Math.round(totalBacklog));
            }
            else{
                rs.setValue("recent_awards", 0);
                rs.setValue("recent_award_val", 0);
                rs.setValue("recent_award_mix", 0);
                rs.setValue("recent_customers", null);
                rs.setValue("recent_naics", null);
                rs.setValue("estimated_revenue", 0);
                rs.setValue("estimated_backlog", 0);
            }



            JSONObject monthlyRevenue = new JSONObject();
            it = revenue.keySet().iterator();
            while (it.hasNext()){
                String date = it.next();
                monthlyRevenue.set(date, revenue.get(date));
            }

            JSONObject info;
            try{ info = new JSONObject(rs.getValue("info").toString()); }
            catch(Exception e){ info = new JSONObject(); }
            info.set("monthlyRevenue", monthlyRevenue);
            rs.setValue("info", new javaxt.sql.Function(
                "?::jsonb", info.toString()
            ));


            rs.update();
        }
    }


    private static boolean in(javaxt.utils.Value v, String str){
        String[] arr = str.split(",");
        for (String s : arr) if (v.equals(s)) return true;
        return false;
    }


    private static void setIfNull(String key, Object val, JSONObject json){
        if (json.has(key)){
            if (!json.isNull(key)) return;
        }
        json.set(key, val);
    }


    private static String getString(javaxt.utils.Value val){
        String str = val.toString();
        if (str!=null){
            str = str.trim();
            if (str.isEmpty()) str = null;
        }
        return str;
    }


  //**************************************************************************
  //** getOrCreateSource
  //**************************************************************************
  /** Returns the id associated with "usaspending.gov" in the source table
   *  @param conn Connection to the prospekt database
   */
    private static Long getOrCreateSource(Connection conn) throws Exception {
        String name = "usaspending.gov";

        javaxt.sql.Record r = conn.getRecord(
        "select id from source where name='" + name + "'");

        if (r==null){
            try (Recordset rs = conn.getRecordset(
                "select * from source where id=-1", false)){
                rs.addNew();
                rs.setValue("name", name);
                rs.update();
                return rs.getGeneratedKey().toLong();
            }
        }
        else{
            return r.get(0).toLong();
        }
    }
}