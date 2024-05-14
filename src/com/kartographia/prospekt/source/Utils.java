package com.kartographia.prospekt.source;
import com.kartographia.prospekt.model.Address;

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
  //** getFirstName
  //**************************************************************************
  /** Converts diminutive first name to a proper english first name (e.g. Bill
   *  is converted to William). Note that the list of supported names is
   *  incomplete and not authoritative.
   */
    public static String getFirstName(String name){

      //Male names
        if (eq(name, "Al")) return "Albert";
        if (eq(name, "Brad")) return "Bradley";
        if (eq(name, "Alex", "Xander", "Alec", "Alek")) return "Alexander";
        if (eq(name, "Fred", "Freddy", "Alf", "Alfie")) return "Alfred";
        if (eq(name, "Andy", "Drew")) return "Andrew";
        if (eq(name, "Ben", "Benny", "Benji", "Benedict")) return "Benjamin";
        if (eq(name, "Bernie")) return "Bernard";
        if (eq(name, "Brad", "Brodie", "Bodie", "Brayden", "Rayden", "Brady")) return "Bradley";
        if (eq(name, "Cal")) return "Calvin";
        if (eq(name, "Charlie", "Charley", "Chuck")) return "Charles";
        if (eq(name, "Danny", "Dan")) return "Daniel";
        if (eq(name, "Dave", "Davey")) return "David";
        if (eq(name, "Don", "Donnie", "Donny")) return "Donald";
        if (eq(name, "Dunc")) return "Duncan";
        if (eq(name, "Ned", "Ed", "Eddy", "Eddie")) return "Edward";
        if (eq(name, "Harry", " Hal")) return "Henry";
        if (eq(name, "Jake")) return "Jacob";
        if (eq(name, "Jamie", "Jim", "Jimmy", "Jimbo")) return "James";
        if (eq(name, "Johnny", "Jack", "Jake")) return "John";
        if (eq(name, "Jon")) return "Jonathan"; //John
        if (eq(name, "Joe", " Joey")) return "Joseph";
        if (eq(name, "Josh")) return "Joshua";
        if (eq(name, "Larry", "Laurie")) return "Lawrence";
        if (eq(name, "Mike", "Mick", "Micky")) return "Michael";
        if (eq(name, "Nick", "Nicolas")) return "Nicholas";
        if (eq(name, "Pauly", "Pauley")) return "Paul";
        if (eq(name, "Pete", "Pita")) return "Peter";
        if (eq(name, "Phil")) return "Philip";
        if (eq(name, "Richie", "Rick", "Dick")) return "Richard";
        if (eq(name, "Rob", "Bob", "Bobby", "Robbie")) return "Robert";
        if (eq(name, "Ron")) return "Ronald";
        if (eq(name, "Sal")) return "Salvatore";
        if (eq(name, "Sam", "Sammy")) return "Samuel";
        if (eq(name, "Si")) return "Simon";
        if (eq(name, "Steve", "Steven", "Ste")) return "Stephen"; //Stephen/Steven
        if (eq(name, "Stu")) return "Stewart";
        if (eq(name, "Terry")) return "Terence";
        if (eq(name, "Tom", "Tommy")) return "Thomas";
        if (eq(name, "Tim", "Timmy")) return "Timothy";
        if (eq(name, "Bill", "Billy", "Will", "Willy ")) return "William";


      //Female names
        if (eq(name, "Abby", "Abbie", "Abie")) return "Abigail";
        if (eq(name, "Mandy", "Mindy")) return "Amanda";
        if (eq(name, "Ali", "Ally", "Allie")) return "Alison";
        if (eq(name, "Barb", "Barbie")) return "Barbara";
        if (eq(name, "Bev", "Beverly")) return "Beverley";
        if (eq(name, "Lotte", "Lottie", "Char", "Charlie")) return "Charlotte";
        if (eq(name, "Danni", "Dani", "Daniella")) return "Danielle";
        if (eq(name, "Deb", "Debbie")) return "Deborah";
        if (eq(name, "Dot", "Dotty")) return "Dorothy";
        if (eq(name, "Liz", "Lizzie", "Liza", "Libb", "Lisbeth", "Beth", "Bessie", "Bess")) return "Elizabeth";
        if (eq(name, "Em", "Emy")) return "Emily";
        if (eq(name, "Hil")) return "Hilary";
        if (eq(name, "Jenny", "Jen")) return "Jennifer";
        if (eq(name, "Cat", "Kat", "Cath", "Cate", "Kate", "Cathy", "Kathy", "Katie", "Kathryn", "Katherine")) return "Catherine";
        if (eq(name, "Maggie", "Meg", "Maisie")) return "Margaret";
        if (eq(name, "Tash", "Tasha")) return "Natasha";
        if (eq(name, "Nicky", "Nikki", "Nicola")) return "Nicole";
        if (eq(name, "Pam", "Pammy")) return "Pamela";
        if (eq(name, "Pat", "Patty", "Patsy", "Trish", "Trisha")) return "Patricia";
        if (eq(name, "Pippa")) return "Philippa"; //need to confirm
        if (eq(name, "Rae")) return "Rachel";
        if (eq(name, "Sal")) return "Sally";
        if (eq(name, "Sandy")) return "Sandra";
        if (eq(name, "Suzie", "Sue", "Suze")) return "Susan";
        if (eq(name, "Vicky", "Vic")) return "Victoria";
        if (eq(name, "Ginny")) return "Virginia";

        return name;
    }

    private static boolean eq(String name, String... names){
        for (String str : names){
            if (name.equalsIgnoreCase(str)) return true;
        }
        return false;
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


                if (arr[i].startsWith("ROOM") ||
                    arr[i].startsWith("UNIT") ||
                    arr[i].startsWith("SUITE") ||
                    arr[i].startsWith("APARTMENT")){
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


      //Add street
        String[] street = getStreet(address.getStreet());
        if (street[0]!=null) str.append(street[0]);


      //Add city
        String city = address.getCity();
        if (city==null || city.isBlank()) throw new IllegalArgumentException("Missing city");
        city = city.trim();
        if (city.equalsIgnoreCase("Washington DC") || city.equalsIgnoreCase("DC")){
            city = "Washington";
        }
        str.append(", ");
        str.append(city);


      //Add state or country
        String state = address.getState();
        if (state==null || state.isBlank()){

          //Add country if state is missing
            String country = address.getCountry();
            if (country==null || country.isBlank()){
                throw new IllegalArgumentException("Missing state and no country");
            }
            else{
                country = country.trim();
                str.append(" ");
                str.append(country);
            }

          //Return early
            return str.toString().trim();
        }
        else{
            state = state.trim();
            str.append(", ");
            str.append(state);
        }


      //Add postal code
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