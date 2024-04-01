package com.kartographia.prospekt.data;
import com.kartographia.prospekt.server.Config;

import static javaxt.utils.Console.console;
import javaxt.utils.Timer;
import javaxt.json.*;
import javaxt.sql.*;

import java.util.*;
import java.math.BigDecimal;


public class SyncService {

    private static final java.util.TimeZone utc =
    javaxt.utils.Date.getTimeZone("UTC");


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    private SyncService(){}


  //**************************************************************************
  //** start
  //**************************************************************************
    public static void start(){

        int interval = //minutes
        Config.get("sources").get("openexchangerates").get("refreshRate").toInteger();

        javaxt.utils.Date startDate = new javaxt.utils.Date();
        int mod = startDate.getMinute() % interval;
        int add = mod < Math.round(interval/2.0)? -mod : (interval-mod);

        startDate.add(add, "minutes");
        startDate.setTime(startDate.getHour(), startDate.getMinute(), 0, 0);

        long delay = startDate.getTime() - System.currentTimeMillis();
        if (delay<=0) startDate.add(interval, "minutes");

        console.log("First sync scheduled for " + startDate);

        Timer timer = new Timer();
        timer.scheduleAtFixedRate( new TimerTask(){
            public void run(){
                try{
                    downloadExchangeRates();
                }
                catch(Exception e){
                    e.printStackTrace();
                }
            }
        }, startDate.getDate(), interval*60*1000);
    }


  //**************************************************************************
  //** downloadExchangeRates
  //**************************************************************************
    public static void downloadExchangeRates() throws Exception {
        downloadExchangeRates(null);
    }


  //**************************************************************************
  //** downloadExchangeRates
  //**************************************************************************
    public static void downloadExchangeRates(String startDate, String endDate) throws Exception {
        downloadExchangeRates(new javaxt.utils.Date(startDate), new javaxt.utils.Date(endDate));
    }


  //**************************************************************************
  //** downloadExchangeRates
  //**************************************************************************
  /**
   *  @param startDate 1st January 1999
   */
    public static void downloadExchangeRates(javaxt.utils.Date startDate, javaxt.utils.Date endDate) throws Exception {
        if (startDate==null) throw new Exception("startDate is required");
        if (endDate==null) throw new Exception("endDate is required");


        startDate = startDate.clone();
        endDate = endDate.clone();

        startDate.removeTimeStamp();
        endDate.removeTimeStamp();

        startDate.setTimeZone(utc, true);
        endDate.setTimeZone(utc, true);
        if (endDate.isBefore(startDate)) throw new Exception("startDate must be before endDate");
        if (startDate.getYear()<1999) throw new Exception("startDate must be before 1999");


        long numDays = endDate.compareTo(startDate, "days");
        for (int i=0; i<numDays+1; i++){
            downloadExchangeRates(endDate);
            endDate.add(-1, "day");
        }
    }


  //**************************************************************************
  //** downloadExchangeRates
  //**************************************************************************
    private static void downloadExchangeRates(javaxt.utils.Date date) throws Exception {
        Database database = Config.getDatabase();
        JSONObject config = Config.get("sources").get("openexchangerates").toJSONObject();
        String key = config.get("key").toString();
        String cache = config.get("cache").toString();

        //"https://openexchangerates.org/api/latest.json?app_id="+key
        //"https://openexchangerates.org/api/historical/2021-02-14.json?app_id="+key

        String url = "https://openexchangerates.org/api/";
        if (date==null) url+= "latest.json";
        else url+= "historical/" + date.toString("yyyy-MM-dd") + ".json";
        url+= "?app_id="+key;


        javaxt.http.Response response = new javaxt.http.Request(url).getResponse();
        if (response.getStatus()!=200) throw new Exception(response.toString());

        String text = response.getText();
        JSONObject json = new JSONObject(text);
        long timestamp = json.get("timestamp").toLong();
        javaxt.utils.Date currTime = getDate(timestamp);
        int hour = getHour(currTime);
        console.log(hour, timestamp);

        javaxt.io.File file = new javaxt.io.File(cache + currTime.toString("yyyy/MM") + "/" + hour + ".json");
        if (file.exists()) return;
        file.write(text);
        if (!file.exists()) throw new Exception("Failed to create " + file);

        Connection conn = null;
        try{
            conn = database.getConnection();
            importFile(json, conn);
            conn.close();
        }
        catch(Exception e){
            if (conn!=null) conn.close();
            throw e;
        }

    }


  //**************************************************************************
  //** importFile
  //**************************************************************************
    public static void importFile(javaxt.io.File file, Connection conn) throws Exception {
        importFile(new JSONObject(file.getText()), conn);
    }


  //**************************************************************************
  //** importFile
  //**************************************************************************
    private static void importFile(JSONObject json, Connection conn) throws Exception {
        try (Recordset rs = conn.getRecordset("select * from EXCHANGE_RATE where id=-1", false)){
            long timestamp = json.get("timestamp").toLong();
            int hour = getHour(timestamp);
            String base = json.get("base").toString();
            JSONObject rates = json.get("rates").toJSONObject();
            for (String currency : rates.keySet()){
                BigDecimal rate = rates.get(currency).toBigDecimal();
                try{
                    rs.addNew();
                    rs.setValue("hour", hour);
                    rs.setValue("currency", currency);
                    rs.setValue("base", base);
                    rs.setValue("rate", rate);
                    rs.update();
                    //WebServices.notify(hour+","+currency+","+base+","+rate);
                }
                catch(Exception e){
                    console.log(e.getMessage());
                }
            }
        }
    }


  //**************************************************************************
  //** getDate
  //**************************************************************************
    private static javaxt.utils.Date getDate(long timestamp){
        timestamp = timestamp*1000; //multiply by 1000, since java is expecting milliseconds
        javaxt.utils.Date date = new javaxt.utils.Date(timestamp);
        date.setTimeZone(utc);
        return date;
    }


  //**************************************************************************
  //** getHour
  //**************************************************************************
    private static int getHour(javaxt.utils.Date date){
        return Integer.parseInt(date.toString("yyyyMMddHH"));
    }


  //**************************************************************************
  //** getHour
  //**************************************************************************
    private static int getHour(long timestamp){
        return getHour(getDate(timestamp));
    }

}
