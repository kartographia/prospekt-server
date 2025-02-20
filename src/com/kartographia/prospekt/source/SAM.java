package com.kartographia.prospekt.source;
import com.kartographia.prospekt.model.*;
import com.kartographia.prospekt.server.Config;
import static com.kartographia.prospekt.source.Utils.*;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import javaxt.sql.*;
import javaxt.json.*;
import javaxt.utils.ThreadPool;
import static javaxt.utils.Console.console;

import javaxt.express.utils.*;


//******************************************************************************
//**  SAM
//******************************************************************************
/**
 *   Used to download and parse data from sam.gov
 *
 ******************************************************************************/

public class SAM {

    private static Source source;


  //**************************************************************************
  //** getOpportunities
  //**************************************************************************
  /** Used to download and parse opportunities from sam.gov using the public
   *  API. More info here:
   *  https://open.gsa.gov/api/get-opportunities-public-api/
   */
    public static ArrayList<Opportunity> getOpportunities() throws Exception {
        String apiKey = Config.get("sources").get("sam.gov").get("key").toString();
        String startDate = "06/01/2024";
        String endDate = "08/01/2024";
        String url = "https://api.sam.gov/opportunities/v2/search?api_key=" + apiKey +
        "&postedFrom=" + startDate + "&postedTo=" + endDate +
        "&ncode=541511&ptype=p,o,k" +
        "&limit=10";
        javaxt.http.Response response =
        new javaxt.http.Request(url).getResponse();
        if (response.getStatus()==200){
            return getOpportunities(new JSONObject(response.getText()));
        }
        else{
            System.out.println(response);
            throw new Exception("Failed to download opportunities from " + getSource().getName());
        }
    }


  //**************************************************************************
  //** getEntity
  //**************************************************************************
    public static JSONObject getEntity(String uei) throws Exception {
        String apiKey = Config.get("sources").get("sam.gov").get("key").toString();
        String url = "https://api.sam.gov/entity-information/v2/entities?" +
        "api_key=" + apiKey +
        //"&registrationStatus=E" + //A or E
        "&ueiSAM=" + uei; //PC7QYEAPKGA7


        javaxt.http.Response response = new javaxt.http.Request(url).getResponse();
        if (response.getStatus()==200){
            String text = response.getText();
            return new JSONObject(text).get("entityData").get(0).toJSONObject();
        }
        else if (response.getStatus()==429){
            throw new Exception("Rate Limit");
        }
        else{
            System.out.println(response);
            throw new Exception("Failed to download entity for " + uei);
        }

    }


  //**************************************************************************
  //** getOpportunities
  //**************************************************************************
    public static ArrayList<Opportunity> getOpportunities(JSONObject searchResults){
        JSONArray opportunitiesData = searchResults.get("opportunitiesData").toJSONArray();
        return getOpportunities(opportunitiesData);
    }


  //**************************************************************************
  //** getOpportunities
  //**************************************************************************
    public static ArrayList<Opportunity> getOpportunities(JSONArray opportunitiesData){

        String apiKey = Config.get("sources").get("sam.gov").get("key").toString();

        ArrayList<Opportunity> opportunities = new ArrayList<>();
        for (int i=0; i<opportunitiesData.length(); i++){
            JSONObject json = opportunitiesData.get(i).toJSONObject();
            Opportunity opportunity = new Opportunity();

            opportunity.setName(json.get("title").toString());

            String description = json.get("description").toString();
            if (description!=null){
                if (description.toLowerCase().startsWith("http")){
                    javaxt.utils.URL url = new javaxt.utils.URL(description);
                    url.setParameter("api_key", apiKey);
                    javaxt.http.Response response =
                    new javaxt.http.Request(url.toString()).getResponse();
                    if (response.getStatus()==200){
                        description = response.getText();
                    }
                    else{
                        //System.out.println(response);
                    }
                }
            }
            opportunity.setDescription(description);



            String type = json.get("type").toString();
            String baseType = json.get("baseType").toString();
            if (type==null) type = baseType;
            else{
                if (baseType!=null){
                    if (!baseType.equals(type)){
                        type += "/" + baseType;
                    }
                }
            }
            opportunity.setAnnouncement(type);


            opportunity.setOrganization(json.get("fullParentPathName").toString());
            opportunity.setNaics(json.get("naicsCode").toString());
            opportunity.setSetAside(json.get("typeOfSetAside").toString());

            opportunity.setClassification(json.get("classificationCode").toString());
            opportunity.setPostedDate(json.get("postedDate").toDate());
            opportunity.setResponseDate(json.get("responseDeadLine").toDate());

            opportunity.setSource(getSource());
            opportunity.setSourceKey(json.get("noticeId").toString());
            opportunity.setActive(json.get("active").toBoolean());
            opportunity.setInfo(json);

            opportunities.add(opportunity);
        }
        return opportunities;
    }


  //**************************************************************************
  //** updateCompanies
  //**************************************************************************
  /** Used to update companies in the prospekt database using entity
   *  information from sam.gov
   *  @param input Pipe delimited file ("|") downloaded from sam.gov:
   *  https://sam.gov/data-services/Entity%20Registration/Public%20V2?privacy=Public
   *  Note that this parameter is optional. If no input file is given, we'll
   *  use the sam.gov api. Note that the api requires a valid key.
   *  @param database Prospekt database
   */
    public static void updateCompanies(javaxt.io.File input, Database database, int numThreads) throws Exception {


        AtomicLong recordCounter = new AtomicLong(0);
        StatusLogger statusLogger = new StatusLogger(recordCounter);
        long startTime = System.currentTimeMillis();


        if (input==null){

          //Start threads
            ThreadPool pool = new ThreadPool(numThreads){
                public void process(Object obj){

                    try{
                        String uei = obj.toString();
                        JSONObject entity = SAM.getEntity(uei);
                        if (entity!=null) updateCompany(entity, database);
                    }
                    catch(Exception e){
                        e.printStackTrace();
                        //if (entity==null) console.log("entity is null");
                        //else console.log(entity.toString(4));
                    }
                    recordCounter.incrementAndGet();
                }
            }.start();


            long t = 0;
            try (Connection conn = database.getConnection()){
                for (Record record : conn.getRecords(
                    "select uei from company"
                    //"where business_type is null"
                    //"uei='JN3MH41S25Z3'"
                )){
                    pool.add(record.get(0).toString());
                    t++;
                }
            }
            statusLogger.setTotalRecords(t);




            pool.done();
            pool.join();

        }
        else{

            ThreadPool pool = new ThreadPool(numThreads, 1000){
                public void process(Object obj){

                    try{
                        CSV.Columns columns = CSV.getColumns(obj.toString(), "|");
                        updateCompany(columns, database);
                    }
                    catch(Exception e){
                        e.printStackTrace();
                    }
                    recordCounter.incrementAndGet();
                }
            }.start();


            long t = 0;
            try(java.io.BufferedReader br = input.getBufferedReader("UTF-8")){

              //Skip header
                br.readLine();

                String row;
                while ((row = br.readLine()) != null){
                    pool.add(row);
                    t++;
                }
            }


            statusLogger.setTotalRecords(t);


            pool.done();
            pool.join();

        }


        statusLogger.shutdown();
    }


  //**************************************************************************
  //** updateCompany
  //**************************************************************************
  /** Used to create/update an individual company using information from the
   *  sam.gov api.
   */
    private static void updateCompany(JSONObject entity, Database database) throws Exception {

      //Parse entityRegistration
        JSONObject entityRegistration = entity.get("entityRegistration").toJSONObject();
        var uei = entityRegistration.get("ueiSAM").toString();
        var samRegistrationDate = entityRegistration.get("registrationDate").toString();
        var cageCode = entityRegistration.get("cageCode").toString();
        var lastUpdate = entityRegistration.get("lastUpdateDate").toDate();


      //Parse coreData
        JSONObject coreData = entity.get("coreData").toJSONObject();
        var url = coreData.get("entityInformation").get("entityURL").toString();
        var founded = coreData.get("entityInformation").get("entityStartDate").toString();
        var stateOfIncorporation = coreData.get("generalInformation").get("stateOfIncorporationCode").toString();
        HashSet<String> businessTypes = new HashSet<>();
        JSONArray arr = coreData.get("businessTypes").get("businessTypeList").toJSONArray();
        for (int i=0; i<arr.length(); i++){
            String businessType = arr.get(i).get("businessTypeCode").toString();
            businessTypes.add(businessType);
        }


      //Parse contacts
        var contacts = new ArrayList<javaxt.utils.Record>();
        JSONObject pointsOfContact = entity.get("pointsOfContact").toJSONObject();
        if (pointsOfContact!=null){
            for (String key : pointsOfContact.keySet()){
                var contact = getContact(pointsOfContact.get(key).toJSONObject());
                if (contact!=null) contacts.add(contact);
            }
        }


        try (Connection conn = database.getConnection()){

            Long companyID = null;
            try (Recordset rs = conn.getRecordset("select * from company where uei='"+uei+"'", false)){
                if (rs.EOF){

                    //TODO: Create new company

                }
                else{

                    companyID = rs.getValue("id").toLong();

                    if (businessTypes.isEmpty()) rs.setValue("business_type", null);
                    else rs.setValue("business_type",businessTypes.toArray(new String[businessTypes.size()]));


                  //Get info
                    JSONObject info;
                    try{
                        info = new JSONObject(rs.getValue("info").toString());
                    }
                    catch(Exception e){
                        info = new JSONObject();
                    }


                  //Update info
                    info.set("founded", founded);
                    info.set("cageCode", cageCode);
                    info.set("stateOfIncorporation", stateOfIncorporation);
                    info.set("samRegistrationDate", samRegistrationDate);
                    if (url!=null){

                        JSONObject links;
                        if (info.has("links")){
                            links = info.get("links").toJSONObject();
                        }
                        else{
                            links = new JSONObject();
                            info.set("links", links);
                        }

                        if (!links.has("Website")) links.set("Website", url);
                    }


                  //Save info
                    if (!info.isEmpty()){
                        rs.setValue("info", new javaxt.sql.Function(
                            "?::jsonb", info.toString()
                        ));
                    }


                    rs.update();
                }
            }


          //Create or update company address and officers
            saveContacts(contacts, companyID, lastUpdate, conn);

        }
    }


  //**************************************************************************
  //** updateCompany
  //**************************************************************************
  /** Used to create/update an individual company using information from a
   *  pipe delimited file ("|") downloaded from sam.gov (see above).
   */
    private static void updateCompany(CSV.Columns columns, Database database) throws Exception {

        String uei = columns.get(0).toString();
        String url = columns.get(26).toString();
        if (url!=null){
            url = url.trim();
            if (url.isEmpty()) url = null;
        }


        javaxt.utils.Date lastUpdate = columns.get(9).toDate();
        var founded = getShortDate(columns.get(24));
        var samRegistrationDate = getShortDate(columns.get(7));
        var cageCode = columns.get(3).toString();
        var stateOfIncorporation = columns.get(28).toString();


      //Parse contacts
        var contacts = new ArrayList<javaxt.utils.Record>();
        var idx = 46;
        for (var i=0; i<6; i++){
            javaxt.utils.Record contact = getContact(idx, columns);
            if (contact!=null) contacts.add(contact);
            idx+=11;
        }


      //Parse business codes
        String businessCodes = columns.get(31).toString();
        HashSet<String> codes = new HashSet<>();
        if (businessCodes!=null){
            for (String code : businessCodes.split("~")){
                code = code.trim();
                if (code.length()>0) codes.add(code);
            }
        }


      //Insert/update records in the database
        try (Connection conn = database.getConnection()){

          //Create or update company
            Long companyID = null;
            try (Recordset rs = conn.getRecordset("select * from company where uei='"+uei+"'", false)){
                if (rs.EOF){

                    javaxt.utils.Record company = getContact(11, columns);
                    if (company!=null){
                        String cn = ((Person) company.get("person").toObject()).getFirstName();
                        Address address = (Address) company.get("address").toObject();

                        String[] companyName = getCompanyName(cn);
                        String name = companyName[0];
                        String suffix = companyName[1];


                        rs.addNew();
                        rs.setValue("uei", uei);
                        rs.setValue("name", name);
                        rs.setValue("last_update", lastUpdate);

                        if (!codes.isEmpty()){
                            rs.setValue("business_type", codes.toArray(new String[codes.size()]));
                        }

                        var info = new JSONObject();
                        info.set("founded", founded);
                        info.set("cageCode", cageCode);
                        info.set("stateOfIncorporation", stateOfIncorporation);
                        info.set("samRegistrationDate", samRegistrationDate);
                        if (url!=null){
                            var links = new JSONObject();
                            info.set("links", links);
                            links.set("Website", url);
                        }

                        if (!info.isEmpty()){
                            rs.setValue("info", new javaxt.sql.Function(
                                "?::jsonb", info.toString()
                            ));
                        }

                        rs.update();
                        companyID = rs.getGeneratedKey().toLong();


                        if (address!=null){
                           var contact = new javaxt.utils.Record();
                           contact.set("address", address);
                           contacts.add(0, contact);
                        }
                    }
                }
                else{
                    companyID = rs.getValue("id").toLong();

                    if (lastUpdate!=null){
                        var prevUpdate = rs.getValue("last_update").toDate();
                        if (prevUpdate==null || lastUpdate.isAfter(prevUpdate)){
                            rs.setValue("last_update", lastUpdate);
                        }
                    }

                    if (!codes.isEmpty()){
                        rs.setValue("business_type", codes.toArray(new String[codes.size()]));
                    }


                  //Get info
                    JSONObject info;
                    try{
                        info = new JSONObject(rs.getValue("info").toString());
                    }
                    catch(Exception e){
                        info = new JSONObject();
                    }


                  //Update info
                    info.set("founded", founded);
                    info.set("cageCode", cageCode);
                    info.set("stateOfIncorporation", stateOfIncorporation);
                    info.set("samRegistrationDate", samRegistrationDate);
                    if (url!=null){

                        JSONObject links;
                        if (info.has("links")){
                            links = info.get("links").toJSONObject();
                        }
                        else{
                            links = new JSONObject();
                            info.set("links", links);
                        }

                        if (!links.has("Website")) links.set("Website", url);
                    }


                  //Save info
                    if (!info.isEmpty()){
                        rs.setValue("info", new javaxt.sql.Function(
                            "?::jsonb", info.toString()
                        ));
                    }

                    rs.update();
                }
            }


          //Create or update company address and officers
            saveContacts(contacts, companyID, lastUpdate, conn);

        }
    }


  //**************************************************************************
  //** saveContacts
  //**************************************************************************
    private static void saveContacts(ArrayList<javaxt.utils.Record> contacts,
        Long companyID, javaxt.utils.Date lastUpdate, Connection conn)
        throws Exception {

        if (companyID==null || contacts==null || contacts.isEmpty()) return;

        for (javaxt.utils.Record contact : contacts){


          //Create or update company address
            Address address = (Address) contact.get("address").toObject();
            if (address!=null){
                Long addressID = getOrCreateAddress(address, conn);
                try (Recordset rs = conn.getRecordset(
                    "select * from company_address where company_id=" +
                    companyID + " and address_id=" + addressID, false)){

                    if (rs.EOF){
                        rs.addNew();
                        rs.setValue("company_id", companyID);
                        rs.setValue("address_id", addressID);
                    }

                    if (lastUpdate!=null){
                        var prevUpdate = rs.getValue("last_update").toDate();
                        if (prevUpdate==null || lastUpdate.isAfter(prevUpdate)){
                            rs.setValue("last_update", lastUpdate);
                        }
                    }

                    rs.update();
                }
            }


          //Create or update company officer
            Person person = (Person) contact.get("person").toObject();
            if (person!=null){
                Long personID = getOrCreatePerson(person, conn);
                try (Recordset rs = conn.getRecordset(
                    "select * from company_officer where company_id=" +
                    companyID + " and person_id=" + personID, false)){

                    if (rs.EOF){
                        rs.addNew();
                        rs.setValue("company_id", companyID);
                        rs.setValue("person_id", personID);
                    }

                    String title = contact.get("title").toString();
                    if (title!=null) rs.setValue("title", title);


                    if (lastUpdate!=null){
                        var prevUpdate = rs.getValue("last_update").toDate();
                        if (prevUpdate==null || lastUpdate.isAfter(prevUpdate)){
                            rs.setValue("last_update", lastUpdate);
                        }
                    }


                    rs.update();
                }
            }
        }
    }


  //**************************************************************************
  //** getContact
  //**************************************************************************
    private static javaxt.utils.Record getContact(int idx, CSV.Columns columns){

        var vals = new ArrayList<String>();
        for (int i=0; i<12; i++){
            String val = columns.get(idx+i).toString();
            if (val!=null){
                val = val.trim();
                if (val.length()==0) val = null;
            }
            vals.add(val);
        }

        var record = new javaxt.utils.Record();


        String firstName = vals.get(0);
        String lastName = vals.get(2);
        if (firstName==null && lastName==null) return null;


        Person person = new Person();
        person.setFirstName(firstName);
        person.setLastName(lastName);

        String fullName = "";
        if (firstName!=null) fullName = firstName;
        if (lastName!=null) fullName += " " + lastName;
        fullName = fullName.trim();

        person.setFullName(fullName);


        if (firstName!=null){
            String searchTerm = getFirstName(firstName).toUpperCase();
            if (lastName!=null) searchTerm += " " + lastName.toUpperCase();
            person.setSearchTerm(searchTerm);
        }

        record.set("person", person);
        record.set("title", vals.get(3));

        String street = vals.get(4);
        String street2 = vals.get(5);
        String city = vals.get(6);
        String zip = vals.get(7);
        String zip2 = vals.get(8);
        String country = vals.get(9);
        String state = vals.get(10);
        record.set("address", getAddress(street, street2, city, state, country, zip));

        return record;
    }


  //**************************************************************************
  //** getContact
  //**************************************************************************
    private static javaxt.utils.Record getContact(JSONObject json){
        var record = new javaxt.utils.Record();

        String firstName = json.get("firstName").toString();
        String lastName = json.get("lastName").toString();
        if (firstName==null && lastName==null) return null;


        Person person = new Person();
        person.setFirstName(firstName);
        person.setLastName(lastName);

        String fullName = "";
        if (firstName!=null) fullName = firstName;
        if (lastName!=null) fullName += " " + lastName;
        fullName = fullName.trim();

        person.setFullName(fullName);


        if (firstName!=null){
            String searchTerm = getFirstName(firstName).toUpperCase();
            if (lastName!=null) searchTerm += " " + lastName.toUpperCase();
            person.setSearchTerm(searchTerm);
        }

        record.set("person", person);
        record.set("title", json.get("title"));


        String street = json.get("addressLine1").toString();
        String street2 = json.get("addressLine2").toString();
        String city = json.get("city").toString();
        String state = json.get("stateOrProvinceCode").toString();
        String country = json.get("countryCode").toString();
        String zip = json.get("zipCode").toString();
        record.set("address", getAddress(street, street2, city, state, country, zip));
        return record;
    }


  //**************************************************************************
  //** getShortDate
  //**************************************************************************
    private static String getShortDate(javaxt.utils.Value val){
        if (val.isNull()) return null;
        String str = val.toString(); //20250121
        if (str.length()!=8) return null;
        String year = str.substring(0, 4);
        String month = str.substring(4, 6);
        String day = str.substring(6);
        return year + "-" + month + "-" + day;
    }


  //**************************************************************************
  //** getSource
  //**************************************************************************
    private static synchronized Source getSource(){
        if (source!=null) return source;

        String name = "sam.gov";
        try{
            Source source = Source.get("name=", name);
            if (source==null){
                source = new Source();
                source.setName(name);
                source.save();
            }
            return source;
        }
        catch(Exception e){
            throw new RuntimeException("Failed to get or create source for " + name);
        }
    }
}