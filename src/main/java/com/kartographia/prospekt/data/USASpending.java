package com.kartographia.prospekt.data;
import com.kartographia.prospekt.Address;
import static com.kartographia.prospekt.data.Utils.*;
import static com.kartographia.prospekt.queries.Index.getQuery;

import java.util.*;
import javaxt.sql.*;
import static javaxt.utils.Console.console;


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

}