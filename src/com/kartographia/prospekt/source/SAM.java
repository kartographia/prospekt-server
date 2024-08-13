package com.kartographia.prospekt.source;
import com.kartographia.prospekt.server.Config;
import com.kartographia.prospekt.model.*;

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
 *   Used to download and parse opportunities from sam.gov using the public API
 *   https://open.gsa.gov/api/get-opportunities-public-api/
 *
 ******************************************************************************/

public class SAM {

    private static Source source;


  //**************************************************************************
  //** getOpportunities
  //**************************************************************************
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
   *  @param input Pipe delimited file ("|") downloaded from sam.gov (optional)
   *  https://sam.gov/data-services/Entity%20Registration/Public%20V2?privacy=Public
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
                    JSONObject company = (JSONObject) obj;
                    Long id = company.get("id").toLong();
                    String uei = company.get("uei").toString();
                    //JSONObject entity = new JSONObject();

                    try{
                        HashSet<String> businessTypes = new HashSet<>();
                        JSONObject entity = SAM.getEntity(uei);
                        if (entity!=null){
                            JSONArray arr = entity.get("coreData").get("businessTypes").get("businessTypeList").toJSONArray();
                            for (int i=0; i<arr.length(); i++){
                                String businessType = arr.get(i).get("businessTypeCode").toString();
                                businessTypes.add(businessType);
                            }

                            try (Connection conn = database.getConnection()){
                                try (Recordset rs = conn.getRecordset("select * from company where id="+id, false)){

                                    if (businessTypes.isEmpty()) rs.setValue("business_type", null);
                                    else rs.setValue("business_type",businessTypes.toArray(new String[businessTypes.size()]));


                                    JSONObject info = new JSONObject();
                                    try{ info = new JSONObject(rs.getValue("info").toString()); }
                                    catch(Exception e){ }

                                    info.set("sam.gov", entity);

                                    rs.setValue("info", new javaxt.sql.Function(
                                        "?::jsonb", info.toString()
                                    ));

                                    rs.update();
                                }
                            }
                        }
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
                    "select id, uei from company where " +
                    "business_type is null"
                    //"uei='JN3MH41S25Z3'"
                )){
                    pool.add(record.toJson());
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
                        String uei = columns.get(0).toString();
                        String businessCodes = columns.get(31).toString();
                        if (businessCodes!=null){
                            HashSet<String> codes = new HashSet<>();
                            for (String code : businessCodes.split("~")){
                                code = code.trim();
                                if (code.length()>0) codes.add(code);
                            }

                            if (!codes.isEmpty()){

                                try (Connection conn = database.getConnection()){
                                    try (Recordset rs = conn.getRecordset("select * from company where uei='"+uei+"'", false)){
                                        if (!rs.EOF){
                                            rs.setValue("business_type",codes.toArray(new String[codes.size()]));
                                            rs.update();
                                        }
                                    }
                                }

                            }
                        }
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