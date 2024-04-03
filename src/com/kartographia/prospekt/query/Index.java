package com.kartographia.prospekt.query;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import static javaxt.utils.Console.console;


public class Index {
    private static ConcurrentHashMap<String, String> queries = new ConcurrentHashMap<>();


  //**************************************************************************
  //** getQuery
  //**************************************************************************
  /** Returns a query found in this jar file
   *  @param fileName Name of the sql script, excluding the file extension
   */
    public static String getQuery(String fileName){
        return getQuery(null, fileName);
    }


  //**************************************************************************
  //** getQuery
  //**************************************************************************
  /** Returns a query found in this jar file
   *  @param  folderName Name of the package containing the sql script
   *  @param fileName Name of the sql script, excluding the file extension
   */
    public static String getQuery(String folderName, String fileName){


        synchronized(queries){
            if (queries.isEmpty()){
                for (javaxt.io.Jar.Entry entry : new javaxt.io.Jar(Index.class).getEntries()){
                    String relpath = entry.getName();
                    if (relpath.endsWith(".sql")){

                        int idx = relpath.lastIndexOf("/");

                        String name = relpath.substring(idx+1);
                        name = name.substring(0, name.indexOf(".")).toLowerCase();

                        String folder = relpath.substring(0, idx).toLowerCase();
                        idx = folder.lastIndexOf("/");
                        if (idx>-1) folder = folder.substring(idx+1);
                        if (!folder.isEmpty()) folder += "/";

                        String key = (folder + name).toLowerCase();
                        //console.log(key);
                        queries.put(key, entry.getText());
                        queries.notify();
                    }
                }
            }


            if (folderName==null || folderName.isBlank()){
                Iterator<String> it = queries.keySet().iterator();
                while (it.hasNext()){
                    String key = it.next();
                    if (key.equalsIgnoreCase(fileName)){
                        return queries.get(key);
                    }
                    else{
                        if (key.toLowerCase().endsWith("/" + fileName.toLowerCase())){
                            return queries.get(key);
                        }
                    }
                }
            }
            else{

                if (folderName.contains(".")){
                    folderName = folderName.substring(0, folderName.indexOf("."));
                }

                String key = (folderName + "/" + fileName).toLowerCase();
                //console.log("-", key, queries.get(key));
                return queries.get(key);
            }
        }


        return null;
    }


  //**************************************************************************
  //** removeComments
  //**************************************************************************
    private static String removeComments(String sql){
        StringBuilder str = new StringBuilder();
        for (String s : sql.split("\n")){
            String t = s.trim();
            if (t.length()==0 || t.startsWith("--")) continue;
            str.append(s);
            str.append("\n");
        }
        return str.toString().trim();
    }

}