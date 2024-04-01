package com.kartographia.prospekt.source;
import com.kartographia.prospekt.*;
import static com.kartographia.prospekt.source.Utils.*;
import static com.kartographia.prospekt.queries.Index.getQuery;

import java.util.*;
import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicLong;

import javaxt.sql.*;
import javaxt.json.*;
import javaxt.utils.ThreadPool;
import static javaxt.utils.Console.console;

import javaxt.express.utils.StatusLogger;
import static javaxt.express.utils.StringUtils.*;


public class USASpending {


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
                    if (true) return;

                  //Download and unzip the file as needed
                    String localFileName = "usaspending-db_" + date + ".zip";
                    javaxt.io.File file = new javaxt.io.File(new javaxt.io.Directory(dir), localFileName);
                    if (!file.exists()){
                        try (java.io.InputStream is = new javaxt.http.Request(path).getResponse().getInputStream()){
                            file.write(is);
                        }
                    }

                    //TODO: Unzip the file
                }


                //Create new database

                //Create roles

                //Restore the backup

            }
        }

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
            String sql = getQuery("usaspending", type + "_code").getSQL();
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

        ThreadPool pool = new ThreadPool(numThreads){
            public void process(Object obj){
                String uei = (String) obj;

                Connection conn = (Connection) get("conn", () -> {
                    return in.getConnection();
                });

                try{
                    //updateCompany(uei, conn, c2);
                    recordCounter.incrementAndGet();
                }
                catch(Exception e){
                    e.printStackTrace();
                }
            }

            public void exit(){
                Connection conn = (Connection) get("conn");
                if (conn!=null) conn.close();
            }

        }.start();


        long t = 0;
        String sql = getQuery("usaspending", "distinct_uei").getSQL();
        try (Connection conn = in.getConnection()){
            for (javaxt.sql.Record record : conn.getRecords(sql)){
                pool.add(record.get(0).toString());
                t++;
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
   *  @param in Input database (usaspending.gov)
   *  @param out Output database (prospekt database)
   */
    public static void updateCompany(String uei, Connection in, Connection out) throws Exception {
        String sql = getQuery("usaspending", "company_info").getSQL().replace("{uei}", uei);


        LinkedHashMap<String, LinkedHashMap<String, javaxt.utils.Date>> companyNames = new LinkedHashMap<>();
        LinkedHashMap<String, LinkedHashMap<String, CompanyAddress>> companyAddresses = new LinkedHashMap<>();
        LinkedHashMap<String, LinkedHashMap<String, CompanyOfficer>> companyOfficers = new LinkedHashMap<>();

        for (javaxt.sql.Record record : in.getRecords(sql)){
            String id = record.get("uei").toString();
            javaxt.utils.Date lastUpdate = record.get("l").toDate();



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
            String addressKey = getAddress(address); //exclude zip!
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
                        fullName = firstName;
                        if (lastName!=null) fullName += " " + lastName;
                        String personKey = fullName.toUpperCase();


                        Person person = new Person();
                        person.setFirstName(firstName);
                        person.setLastName(lastName);
                        person.setFullName(fullName);
                        person.setSearchTerm(personKey);



                        LinkedHashMap<String, CompanyOfficer> officers = companyOfficers.get(id);
                        if (officers==null){
                            officers = new LinkedHashMap<>();
                            companyOfficers.put(id, officers);
                        }


                        CompanyOfficer officer = officers.get(personKey);
                        if (officer==null){
                            officer = new CompanyOfficer();
                            officer.setPerson(person);
                            officers.put(personKey, officer);
                        }


                        JSONObject info = officer.getInfo();
                        if (info==null){
                            info = new JSONObject();
                            officer.setInfo(info);
                        }

                        JSONArray salaryHistory = info.get("salaryHistory").toJSONArray();
                        if (salaryHistory==null) salaryHistory = new JSONArray();



                        TreeMap<String, Integer> salaries = new TreeMap<>();
                        for (JSONValue v : salaryHistory){
                            salaries.put(v.get("date").toString(), v.get("salary").toInteger());
                        }
                        String date = lastUpdate.toString("yyyy-MM-dd");
                        if (salaries.containsKey(date)){
                            Integer prevSal = salaries.get(date);
                            if (prevSal<salary) salaries.put(date, salary);
                        }
                        else{
                            salaries.put(date, salary);
                        }


                        salaryHistory = new JSONArray();
                        Iterator<String> it = salaries.keySet().iterator();
                        while (it.hasNext()){
                            date = it.next();
                            salary = salaries.get(date);
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



      //Process company info
        Iterator<String> it = companyNames.keySet().iterator();
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
                String name = names.keySet().iterator().next();
                rs.setValue("name", name);


              //Update metadata
                JSONArray arr = new JSONArray();
                info.set("names", arr);
                Iterator<String> i2 = names.keySet().iterator();
                while (i2.hasNext()){
                    String companyName = i2.next();
                    javaxt.utils.Date lastUpdate = names.get(companyName);

                    JSONObject json = new JSONObject();
                    json.set("name", companyName);
                    json.set("date", lastUpdate.toString("M/d/yyyy"));
                    arr.add(json);
                }

              //Update record
                rs.update();


              //Set companyID as needed
                if (companyID==null) companyID = rs.getGeneratedKey().toLong();
            }




          //Get or create addresses
            console.log("Addresses:");
            LinkedHashMap<String, CompanyAddress> addresses = companyAddresses.get(uei);
            Iterator<String> i2 = addresses.keySet().iterator();
            while (i2.hasNext()){
                String addressKey = i2.next();
                CompanyAddress companyAddress = addresses.get(addressKey);
                javaxt.utils.Date lastUpdate = companyAddress.getDate();

                console.log("-", addressKey, lastUpdate.toString("M/d/yyyy"));


              //Get or create address
                Long addressID = null;
                try (Recordset rs = out.getRecordset(
                    "select * from address where search_term='" + addressKey + "'", false)){ //lazy key search

                    if (rs.EOF){
                        rs.addNew();
                        rs.setValue("search_term", addressKey);
                        JSONObject address = companyAddress.getAddress().toJson();
                        for (String key : address.keySet()){
                            if (key.equals("info")){

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
            console.log("Officers:");
            LinkedHashMap<String, CompanyOfficer> officers = companyOfficers.get(uei);
            i2 = officers.keySet().iterator();
            while (i2.hasNext()){
                String fullName = i2.next();
                CompanyOfficer officer = officers.get(fullName);
                Person person = officer.getPerson();

                //Add person as needed

                //Get or create office with latest salary

                //console.log("-", fullName, lastUpdate.toString("M/d/yyyy"));
            }


          //Update awards associated with the company
            //updateAwards(uei, in, out);
        }
    }


  //**************************************************************************
  //** updateAwards
  //**************************************************************************
  /** Used to update awards associated with a company
   */
    public static void updateAwards(String uei, Connection in, Connection out) throws Exception {

        JSONObject prevAward = new JSONObject();
        ArrayList<JSONObject> awards = new ArrayList<>();
        String sql = getQuery("usaspending", "awards_by_company").getSQL().replace("{uei}", uei);
        for (javaxt.sql.Record record : in.getRecords(sql)){


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
            String office = getString(record.get("office"));


          //Get dates
            javaxt.utils.Date startDate = record.get("start_date").toDate();
            javaxt.utils.Date endDate = record.get("end_date").toDate();
            javaxt.utils.Date extendedDate = record.get("extended_date").toDate();


          //Get competed
            boolean competed = in(record.get("extent_competed"), "A,D,E,F,CDO");



          //Create/update award
            JSONObject award;
            if (awardID.equals(prevAward.get("source_key").toString())){
                award = prevAward;

                //setIfNull("name", name, award);
                setIfNull("description", description, award);
                //setIfNull("date", date, award);
                setIfNull("type", type, award);
                setIfNull("naics", naics, award);


                if (awardedValue!=null){
                    Double v = award.get("awarded_value").toDouble();
                    if (v!=null) award.set("awarded_value", Math.max(v, awardedValue));
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

              //Save previous award
                if (prevAward.has("source_key")){
                    awards.add(prevAward);
                }


                award = new JSONObject();
                //award.set("name", name);
                award.set("description", description);
                //award.set("date", date);
                award.set("type", type);
                award.set("awarded_value", awardedValue);
                //award.set("funded_value", fundedValue);
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
        console.log("Found " + format(awards.size()) + " awards");



      //Save awards
        long sourceID = getOrCreateSource(out);
        Long companyID;
        javaxt.sql.Record r = out.getRecord("select id from company where uei='" + uei + "'");
        if (r!=null) companyID = r.get(0).toLong();

        for (JSONObject award : awards){
            award.set("source_id", sourceID);


            //Update title
            JSONObject info = award.get("info").toJSONObject();
            JSONArray actions = info.get("actions").toJSONArray();
            TreeMap<String, String> titles = new TreeMap<>();
            for (JSONValue a : actions){
                String date = a.get("date").toString();
                String desc = a.get("desc").toString();
                titles.put(date, desc);
            }
            String firstDate = titles.firstKey();
            award.set("name", titles.get(firstDate));
            award.set("date", new javaxt.utils.Date(firstDate));
            BigDecimal totalFunding = new BigDecimal(0);
            Iterator<String> it = titles.keySet().iterator();
            while (it.hasNext()){
                String date = it.next();
                for (JSONValue a : actions){
                    if (a.get("date").toString().equals(date)){
                        BigDecimal d = a.get("funding").toBigDecimal();
                        if (d!=null){
                            totalFunding = totalFunding.add(d);
                        }
                    }
                }
            }
            award.set("funded_value", totalFunding);

            System.out.println(award.toString(4));

            if (true) continue;


            String sourceKey = award.get("source_key").toString();
            try (Recordset rs = out.getRecordset(
                "select * from award where RECIPIENT_ID=" + companyID +
                " and source_id=" + sourceID +
                " and source_key='" + sourceKey + "'", false)){

                if (rs.EOF) rs.addNew();
                for (String key : award.keySet()){
                    if (key.equals("info")){

                    }
                    else{
                        rs.setValue(key, award.get(key));
                    }
                }
                rs.update();
            }
        }

        //Update company

/*
            {name: 'name',              type: 'string'},
            {name: 'description',       type: 'string'},
            {name: 'uei',               type: 'string'},
            {name: 'recent_awards',     type: 'int'},      //total awards in the last 12 months
            {name: 'recent_award_val',  type: 'decimal'},  //total value of awards in the last 12 months
            {name: 'recent_award_mix',  type: 'decimal'},  //percent competative awards in the last 12 months
            {name: 'recent_customers',  type: 'string[]'}, //awarding agencies in the last 12 months
            {name: 'recent_naics',      type: 'string[]'}, //naics codes associated with recent awards
            {name: 'estimated_revenue', type: 'decimal'},
            {name: 'estimated_backlog', type: 'decimal'},
            {name: 'info',              type: 'json'}
        */



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


    private static String getString(javaxt.sql.Value val){
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

  //**************************************************************************
  //** getOrCreateSource
  //**************************************************************************
    private static Long getOrCreateCompany(Connection conn) throws Exception {
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