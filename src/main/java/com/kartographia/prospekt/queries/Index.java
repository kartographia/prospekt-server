package com.kartographia.prospekt.queries;
import java.util.concurrent.ConcurrentHashMap;
import java.util.*;

public class Index {
    private static ConcurrentHashMap<String, Query> queries = new ConcurrentHashMap<>();


  //**************************************************************************
  //** getQuery
  //**************************************************************************
  /** Returns a query found in this jar file
   *  @param fileName Name of the sql script, excluding the file extension
   */
    public static Query getQuery(String fileName){
        return getQuery(null, fileName);
    }

    
  //**************************************************************************
  //** getQuery
  //**************************************************************************
  /** Returns a query found in this jar file
   *  @param  folderName Name of the package containing the sql script
   *  @param fileName Name of the sql script, excluding the file extension
   */
    public static Query getQuery(String folderName, String fileName){


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
                        queries.put(key, new Query(entry.getText()));
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
                return queries.get(key);
            }
        }


        return null;
    }

}