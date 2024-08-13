package com.kartographia.prospekt.service;
import com.kartographia.prospekt.server.Config;

import java.util.*;

import javaxt.sql.*;
import javaxt.json.*;
import java.util.concurrent.ConcurrentHashMap;

import javaxt.express.*;


//******************************************************************************
//**  ReportService
//******************************************************************************
/**
 *   Used to generate reports from the data found in the prospekt database
 *
 ******************************************************************************/

public class ReportService  extends WebService {

    private static ConcurrentHashMap<String, Object> cache = new ConcurrentHashMap<>();


  //**************************************************************************
  //** getSpendingByAgency
  //**************************************************************************
    public ServiceResponse getSpendingByAgency(ServiceRequest request) throws Exception {
        return new ServiceResponse(getSpendingByAgency(Config.getDatabase()));
    }

    public static JSONArray getSpendingByAgency(Database database) throws Exception {

        String sql =
        "select customer as agency, sum(greatest(value, funded, extended_value)) as total " +
        "from award group by customer order by total desc";


        synchronized(cache){
            Object obj = cache.get(sql);
            if (obj!=null) return (JSONArray) obj;
        }

        try (Connection conn = database.getConnection()){

          //Execute query
            JSONArray arr = new JSONArray();
            for (javaxt.sql.Record record : conn.getRecords(sql)){
                arr.add(record.toJson());
            }

          //Update cache
            synchronized(cache){
                cache.put(sql, arr);
                cache.notify();
            }

          //Return response
            return arr;
        }
    }
}