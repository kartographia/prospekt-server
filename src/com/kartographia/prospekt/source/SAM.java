package com.kartographia.prospekt.source;
import com.kartographia.prospekt.server.Config;
import com.kartographia.prospekt.model.*;

import java.util.*;
import javaxt.json.*;
import static javaxt.utils.Console.console;

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
        String startDate = "05/01/2022";
        String endDate = "06/01/2022";
        String url = "https://api.sam.gov/opportunities/v2/search?api_key=" + apiKey +
        "&postedFrom=" + startDate + "&postedTo=" + endDate +
        "&ncode=541511&ptype=p,o,k" +
        "&limit=10";
        javaxt.http.Response response =
        new javaxt.http.Request(url.toString()).getResponse();
        if (response.getStatus()==200){
            return getOpportunities(new JSONObject(response.getText()));
        }
        else{
            //System.out.println(response);
            throw new Exception("Failed to download opportunities from " + getSource().getName());
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