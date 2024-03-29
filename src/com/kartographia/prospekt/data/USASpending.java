package com.kartographia.prospekt.data;
import com.kartographia.prospekt.Address;
import static com.kartographia.prospekt.data.Utils.*;
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
   */
    public static void updateCompany(String uei, Connection in, Connection out) throws Exception {
        String sql = getQuery("usaspending", "company_info").getSQL().replace("{uei}", uei);


        LinkedHashMap<String, LinkedHashMap<String, javaxt.utils.Date>> companies = new LinkedHashMap<>();
        LinkedHashMap<String, LinkedHashMap<String, javaxt.utils.Date>> companyAddresses = new LinkedHashMap<>();
        LinkedHashMap<String, LinkedHashMap<String, javaxt.utils.Date>> companyOfficers = new LinkedHashMap<>();
        LinkedHashMap<String, LinkedHashMap<Integer, javaxt.utils.Date>> salaries = new LinkedHashMap<>();

        for (javaxt.sql.Record record : in.getRecords(sql)){
            String id = record.get("uei").toString();
            javaxt.utils.Date lastUpdate = record.get("l").toDate();



          //Update company names
            String[] companyName = getCompanyName(record.get("name").toString());
            String name = companyName[0];
            String suffix = companyName[1];

            LinkedHashMap<String, javaxt.utils.Date> names = companies.get(id);
            if (names==null){
                names = new LinkedHashMap<>();
                companies.put(id, names);
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
            String companyAddress = getAddress(address);

            LinkedHashMap<String, javaxt.utils.Date> addresses = companyAddresses.get(id);
            if (addresses==null){
                addresses = new LinkedHashMap<>();
                companyAddresses.put(id, addresses);
            }

            if (companyAddress!=null && !companyAddress.isBlank()){
                companyAddress = companyAddress.toUpperCase();
                if (!addresses.containsKey(companyAddress)){
                    addresses.put(companyAddress, lastUpdate);
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
                        fullName = arr[0];
                        if (arr.length>1) fullName += " " + arr[arr.length-1];


                      //Update salaries
                        LinkedHashMap<Integer, javaxt.utils.Date> sal = salaries.get(fullName);
                        if (sal==null){
                            sal = new LinkedHashMap<>();
                            salaries.put(fullName, sal);
                        }

                        if (salary!=null){
                            if (!sal.containsKey(salary)){
                                sal.put(salary, lastUpdate);
                            }
                        }

                        LinkedHashMap<String, javaxt.utils.Date> officers = companyOfficers.get(id);
                        if (officers==null){
                            officers = new LinkedHashMap<>();
                            companyOfficers.put(id, officers);
                        }

                        if (!officers.containsKey(fullName)){
                            officers.put(fullName, lastUpdate);
                        }
                    }
                }
            }
        }



      //Process company info
        Iterator<String> it = companies.keySet().iterator();
        while (it.hasNext()){
            String id = it.next();


          //Company names
            LinkedHashMap<String, javaxt.utils.Date> names = companies.get(id);
            Iterator<String> i2 = names.keySet().iterator();
            while (i2.hasNext()){
                String name = i2.next();
                javaxt.utils.Date lastUpdate = names.get(name);
                console.log(id, name, lastUpdate.toString("M/d/yyyy"));
            }


          //Company addresses
            console.log("Addresses:");
            LinkedHashMap<String, javaxt.utils.Date> addresses = companyAddresses.get(id);
            i2 = addresses.keySet().iterator();
            while (i2.hasNext()){
                String address = i2.next();
                javaxt.utils.Date lastUpdate = addresses.get(address);
                console.log("-", address, lastUpdate.toString("M/d/yyyy"));
            }


          //Company officers
            console.log("Officers:");
            LinkedHashMap<String, javaxt.utils.Date> officers = companyOfficers.get(id);
            i2 = officers.keySet().iterator();
            while (i2.hasNext()){
                String fullName = i2.next();
                javaxt.utils.Date lastUpdate = officers.get(fullName);
                console.log("-", fullName, lastUpdate.toString("M/d/yyyy"));
            }

        }


      //Process salary info
        console.log("\r\nSalaries:");
        it = salaries.keySet().iterator();
        while (it.hasNext()){
            String fullName = it.next();
            console.log(fullName);

            LinkedHashMap<Integer, javaxt.utils.Date> sal = salaries.get(fullName);
            Iterator<Integer> i2 = sal.keySet().iterator();
            while (i2.hasNext()){
                Integer salary = i2.next();
                javaxt.utils.Date lastUpdate = sal.get(salary);
                console.log("-", salary, lastUpdate.toString("M/d/yyyy"));
            }
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