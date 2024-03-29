package com.kartographia.prospekt.data;
import com.kartographia.prospekt.Address;

import java.util.*;
import java.math.BigDecimal;
import java.util.concurrent.ConcurrentHashMap;

import javaxt.json.JSONArray;
import javaxt.json.JSONObject;


public class Utils {

    private static final HashMap<String, String> streetAbbreviations = getStreetAbbreviations();
    private static final HashMap<String, String> buildingAbbreviations = getBuildingAbbreviations();
    private static final HashMap<String, String> directionAbbreviations = getDirectionAbbreviations();
    private static final ConcurrentHashMap<String, BigDecimal[]> coords = new ConcurrentHashMap<>();


  //Common suffixes found in company name. Order is important
    private static final String[] companySuffixes = new String[]{
    "LTD","LIMITED",
    "LLC","LIMITED LIABILITY COMPANY",
    "INC","SDN BHD","AB","GMBH",
    "CO","CORP","CORPORATION",
    "PUBLIC COMPANY","GLOBAL COMPANY","COMPANY","PUBLIC"};


  //**************************************************************************
  //** getCompanyName
  //**************************************************************************
  /** Returns an array with a company name (e.g. Kartographia) and a company
   *  suffix (e.g. LLC).
   */
    public static String[] getCompanyName(String name){
        if (name==null || name.isBlank()) return new String[2];
        name = name.trim();
        String suffix = null;

        String uname = name.toUpperCase();
        for (String s : companySuffixes){
            if (uname.endsWith(" " + s) || uname.endsWith("," + s)){
                int len = uname.length() - (s.length()+1);
                name = name.substring(0,len).trim();


                if (name.endsWith(",") || name.endsWith(".")){
                    name = name.substring(0,name.length()-1).trim();
                }


                if (s.equals("LIMITED LIABILITY COMPANY")){
                    suffix = "LLC";
                }
                else if (s.equals("LIMITED")){
                    suffix = "LTD";
                }
                else{
                    suffix = s;
                }


                break;
            }
        }

        if (name.isBlank()) name = null;
        return new String[]{name, suffix};
    }


  //**************************************************************************
  //** getStreet
  //**************************************************************************
  /** Returns an array with a street address and a suite number.
   */
    public static String[] getStreet(String street){
        if (street==null || street.isBlank()) return new String[2];
        String suite = null;

        StringBuilder str = new StringBuilder();
        String[] arr = toArray(street);
        for (int i=0; i<arr.length; i++){

            if (i==arr.length-1){


                if (arr[i].startsWith("#")){
                    suite = arr[i].substring(1);
                    break;
                }

            }
            else if (i==arr.length-2){
                if (arr[i].startsWith("ROOM") ||
                    arr[i].startsWith("UNIT") ||
                    arr[i].startsWith("SUITE") ||
                    arr[i].startsWith("APARTMENT")){
                    suite = arr[i+1];
                    break;
                }
            }

            if (i>0) str.append(" ");
            str.append(arr[i]);
        }



        street = str.toString().trim();
        if (suite!=null){
            suite = suite.trim();
            if (suite.isEmpty()) suite = null;
            else suite = "#" + suite;
        }

        return new String[]{street, suite};
    }


  //**************************************************************************
  //** getAddress
  //**************************************************************************
  /** Returns a string representation of a given address. Normalizes street
   *  names and various abbreviations. Note that the returned string does not
   *  include room, or apartment, or suite number. This is ideal for address
   *  matching and geocoding.
   */
    public static String getAddress(Address address){
        if (address==null) throw new IllegalArgumentException();

        StringBuilder str = new StringBuilder();


        String[] street = getStreet(address.getStreet());
        if (street[0]!=null) str.append(street[0]);


        String city = address.getCity();
        if (city==null || city.isBlank()) throw new IllegalArgumentException();
        city = city.trim();
        if (city.equalsIgnoreCase("Washington DC") || city.equalsIgnoreCase("DC")){
            city = "Washington";
        }
        str.append(", ");
        str.append(city);



        String state = address.getState();
        if (state==null || state.isBlank()) throw new IllegalArgumentException();
        state = state.trim();
        str.append(", ");
        str.append(state);

        String zip = address.getPostalCode();
        if (zip!=null){
            zip = zip.trim();
            if (!zip.isEmpty()){
                str.append(" ");
                str.append(zip);
            }
        }

        return str.toString().trim();
    }


  //**************************************************************************
  //** getCoordinates
  //**************************************************************************
    public static BigDecimal[] getCoordinates(Address address, String apiKey){


        String searchTerm = getAddress(address);
        String key = searchTerm.toUpperCase();

        BigDecimal[] coord;
        synchronized(coords){
            coord = coords.get(key);
            if (coord==null){


              //Construct url to hit the google maps geocoding service:
                StringBuilder url = new StringBuilder();
                url.append("https://maps.google.com/maps/api/geocode/json?");
                url.append("address=");
                url.append(searchTerm.replace(" ", "%20"));
                url.append("&sensor=false");
                url.append("&key=");
                url.append(apiKey);


              //Send request to the geocoding service and parse response
                javaxt.http.Response response = new javaxt.http.Request(url.toString()).getResponse();
                JSONObject json = new JSONObject(response.getText());
                //System.out.println(json.toString(4));
                JSONArray results = json.get("results").toJSONArray();
                for (int i=0; i<results.length(); i++){
                    JSONObject result = results.get(i).toJSONObject();
                    JSONObject coords = result.get("geometry").get("location").toJSONObject();
                    coords.set("lon", coords.remove("lng"));

                    coord = new BigDecimal[]{
                        coords.get("lat").toBigDecimal(),
                        coords.get("lon").toBigDecimal()
                    };


                    break;
                }

                if (coord!=null){
                    coords.put(key, coord);
                    coords.notifyAll();
                }

            }
        }

        return coord;
    }


  //**************************************************************************
  //** trimUSAddress
  //**************************************************************************
  /** Generally speaking, street addresses in the US should start with a
   *  number. This function will attempt to trim a given string by removing
   *  any text before the street address.
   */
    private static String trimUSAddress(String address){

      //Get first character that's a number
        int firstNumber = Integer.MAX_VALUE;
        for (int i=0; i<10; i++){
            int idx = address.indexOf(i+"");
            if (idx>-1){
                firstNumber = Math.min(idx, firstNumber);
            }
        }


      //If the address doesn't start with a number, trim it as best we can
        if (firstNumber!=0 && firstNumber<address.length()){
            String str = address.substring(firstNumber);

            boolean trim = true;
            try{
                Long.parseLong(str.replace("-", ""));
                trim = false;
            }
            catch(Exception e){}


            if (trim){
                String s = address.substring(0,firstNumber);
                if (s.contains(" ")){

                    if (s.toUpperCase().equals("PO BOX ")){
                        trim = false;
                    }

                    if (s.toUpperCase().equals("ROUTE ") ||
                        s.toUpperCase().equals("RTE ")){
                        trim = false;
                    }

                    if (s.toUpperCase().equals("ROOM ")){
                        //TODO: Trim off room number
                        trim = false;
                    }

                    if (trim){
                        if (s.trim().endsWith("#")){
                            trim = false;
                        }
                    }

                    //System.out.println(s + "|" + str);
                }
                else{
                    trim = false;
                }


                if (trim){
                    address = str;
                }
            }

        }
        return address;
    }


  //**************************************************************************
  //** toArray
  //**************************************************************************
  /** Returns an array with individual words found in the address. Street
   *  abbreviations are replaced with words (e.g. "PKWY" to "Parkway") and
   *  common punctuations are removed.
   */
    private static String[] toArray(String address){
        String a = address.replace("\r"," ").replace("\n"," ");
        while (a.contains("  ")) a = a.replace("  ", " ");
        String[] words = a.trim().split(" ");
        for (int i=0; i<words.length; i++){
            String word = words[i].trim().toUpperCase();
            if (word.endsWith(",")) word = word.substring(0, word.length()-1);
            if (word.endsWith(".")) word = word.substring(0, word.length()-1);

            String street = streetAbbreviations.get(word);
            if (street!=null) word = street.toUpperCase();

            String building = buildingAbbreviations.get(word);
            if (building!=null){
                if (!word.equals("FL")){
                    word = building.toUpperCase();
                }
            }

            String direction = directionAbbreviations.get(word);
            if (direction!=null) word = direction.toUpperCase();

            words[i] = word;
        }
        return words;
    }




  //**************************************************************************
  //** getStreetAbbreviations
  //**************************************************************************
    private static HashMap<String, String> getStreetAbbreviations(){
        HashMap<String, String> streetAbbreviations = new HashMap<>();
        streetAbbreviations.put("ALY", "Alley");
        streetAbbreviations.put("AVE", "Avenue");
        streetAbbreviations.put("BLVD", "Boulevard");
        streetAbbreviations.put("CSWY", "Causeway");
        streetAbbreviations.put("CTR", "Center");
        streetAbbreviations.put("CIR", "Circle");
        streetAbbreviations.put("CT", "Court");
        streetAbbreviations.put("CV", "Cove");
        streetAbbreviations.put("XING", "Crossing");
        streetAbbreviations.put("DR", "Drive");
        streetAbbreviations.put("EXPY", "Expressway");
        streetAbbreviations.put("EXT", "Extension");
        streetAbbreviations.put("FWY", "Freeway");
        streetAbbreviations.put("GRV", "Grove");
        streetAbbreviations.put("HWY", "Highway");
        streetAbbreviations.put("HOLW", "Hollow");
        streetAbbreviations.put("JCT", "Junction");
        streetAbbreviations.put("LN", "Lane");
        streetAbbreviations.put("MTWY", "Motorway");
        streetAbbreviations.put("OPAS", "Overpass");
        streetAbbreviations.put("PARK", "Park");
        streetAbbreviations.put("PKWY", "Parkway");
        streetAbbreviations.put("PL", "Place");
        streetAbbreviations.put("PLZ", "Plaza");
        streetAbbreviations.put("PT", "Point");
        streetAbbreviations.put("RD", "Road");
        streetAbbreviations.put("RTE", "Route");
        streetAbbreviations.put("SKWY", "Skyway");
        streetAbbreviations.put("SQ", "Square");
        streetAbbreviations.put("ST", "Street");
        streetAbbreviations.put("STR", "Street");
        streetAbbreviations.put("TER", "Terrace");
        streetAbbreviations.put("TRL", "Trail");
        streetAbbreviations.put("WAY", "Way");
        return streetAbbreviations;
    }


  //**************************************************************************
  //** getBuildingAbbreviations
  //**************************************************************************
    private static HashMap<String, String> getBuildingAbbreviations(){
        HashMap<String, String> buildingAbbreviations = new HashMap<>();
        buildingAbbreviations.put("APT", "Apartment");
        buildingAbbreviations.put("BSMT", "Basement");
        buildingAbbreviations.put("BLDG", "Building");
        buildingAbbreviations.put("DEPT", "Department");
        buildingAbbreviations.put("FL", "Floor");
        buildingAbbreviations.put("HNGR", "Hanger");
        buildingAbbreviations.put("LBBY", "Lobby");
        buildingAbbreviations.put("LOWR", "Lower");
        buildingAbbreviations.put("OFC", "Office");
        buildingAbbreviations.put("PH", "Penthouse");
        buildingAbbreviations.put("RM", "Room");
        buildingAbbreviations.put("STE", "Suite");
        buildingAbbreviations.put("TRLR", "Trailer");
        buildingAbbreviations.put("UNIT", "Unit");
        buildingAbbreviations.put("UPPR", "Upper");
        return buildingAbbreviations;
    }


  //**************************************************************************
  //** getDirectionAbbreviations
  //**************************************************************************
    private static HashMap<String, String> getDirectionAbbreviations(){
        HashMap<String, String> directionAbbreviations = new HashMap<>();
        directionAbbreviations.put("N", "North");
        directionAbbreviations.put("S", "South");
        directionAbbreviations.put("E", "East");
        directionAbbreviations.put("W", "West");
        directionAbbreviations.put("NE", "Northeast");
        directionAbbreviations.put("NW", "Northwest");
        directionAbbreviations.put("SE", "Southeast");
        directionAbbreviations.put("SW", "Southwest");
        return directionAbbreviations;
    }

}