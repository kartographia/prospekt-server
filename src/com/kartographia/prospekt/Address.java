package com.kartographia.prospekt;
import javaxt.json.*;
import java.sql.SQLException;
import java.math.BigDecimal;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.WKTReader;

//******************************************************************************
//**  Address Class
//******************************************************************************
/**
 *   Used to represent a Address
 *
 ******************************************************************************/

public class Address extends javaxt.sql.Model {

    private String street;
    private String city;
    private String state;
    private String country;
    private String postalCode;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Geometry coordinates;
    private JSONObject info;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public Address(){
        super("address", java.util.Map.ofEntries(
            
            java.util.Map.entry("street", "street"),
            java.util.Map.entry("city", "city"),
            java.util.Map.entry("state", "state"),
            java.util.Map.entry("country", "country"),
            java.util.Map.entry("postalCode", "postal_code"),
            java.util.Map.entry("latitude", "latitude"),
            java.util.Map.entry("longitude", "longitude"),
            java.util.Map.entry("coordinates", "coordinates"),
            java.util.Map.entry("info", "info")

        ));
        
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a record ID in the database.
   */
    public Address(long id) throws SQLException {
        this();
        init(id);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a JSON representation of a
   *  Address.
   */
    public Address(JSONObject json){
        this();
        update(json);
    }


  //**************************************************************************
  //** update
  //**************************************************************************
  /** Used to update attributes using a record in the database.
   */
    protected void update(Object rs) throws SQLException {

        try{
            this.id = getValue(rs, "id").toLong();
            this.street = getValue(rs, "street").toString();
            this.city = getValue(rs, "city").toString();
            this.state = getValue(rs, "state").toString();
            this.country = getValue(rs, "country").toString();
            this.postalCode = getValue(rs, "postal_code").toString();
            this.latitude = getValue(rs, "latitude").toBigDecimal();
            this.longitude = getValue(rs, "longitude").toBigDecimal();
            try{this.coordinates = new WKTReader().read(getValue(rs, "coordinates").toString());}catch(Exception e){}
            this.info = new JSONObject(getValue(rs, "info").toString());


        }
        catch(Exception e){
            if (e instanceof SQLException) throw (SQLException) e;
            else throw new SQLException(e.getMessage());
        }
    }


  //**************************************************************************
  //** update
  //**************************************************************************
  /** Used to update attributes with attributes from another Address.
   */
    public void update(JSONObject json){

        Long id = json.get("id").toLong();
        if (id!=null && id>0) this.id = id;
        this.street = json.get("street").toString();
        this.city = json.get("city").toString();
        this.state = json.get("state").toString();
        this.country = json.get("country").toString();
        this.postalCode = json.get("postalCode").toString();
        this.latitude = json.get("latitude").toBigDecimal();
        this.longitude = json.get("longitude").toBigDecimal();
        try {
            this.coordinates = new WKTReader().read(json.get("coordinates").toString());
        }
        catch(Exception e) {}
        this.info = json.get("info").toJSONObject();
    }


    public String getStreet(){
        return street;
    }

    public void setStreet(String street){
        this.street = street;
    }

    public String getCity(){
        return city;
    }

    public void setCity(String city){
        this.city = city;
    }

    public String getState(){
        return state;
    }

    public void setState(String state){
        this.state = state;
    }

    public String getCountry(){
        return country;
    }

    public void setCountry(String country){
        this.country = country;
    }

    public String getPostalCode(){
        return postalCode;
    }

    public void setPostalCode(String postalCode){
        this.postalCode = postalCode;
    }

    public BigDecimal getLatitude(){
        return latitude;
    }

    public void setLatitude(BigDecimal latitude){
        this.latitude = latitude;
    }

    public BigDecimal getLongitude(){
        return longitude;
    }

    public void setLongitude(BigDecimal longitude){
        this.longitude = longitude;
    }

    public Geometry getCoordinates(){
        return coordinates;
    }

    public void setCoordinates(Geometry coordinates){
        this.coordinates = coordinates;
    }

    public JSONObject getInfo(){
        return info;
    }

    public void setInfo(JSONObject info){
        this.info = info;
    }
    
    


  //**************************************************************************
  //** get
  //**************************************************************************
  /** Used to find a Address using a given set of constraints. Example:
   *  Address obj = Address.get("street=", street);
   */
    public static Address get(Object...args) throws SQLException {
        Object obj = _get(Address.class, args);
        return obj==null ? null : (Address) obj;
    }


  //**************************************************************************
  //** find
  //**************************************************************************
  /** Used to find Addresss using a given set of constraints.
   */
    public static Address[] find(Object...args) throws SQLException {
        Object[] obj = _find(Address.class, args);
        Address[] arr = new Address[obj.length];
        for (int i=0; i<arr.length; i++){
            arr[i] = (Address) obj[i];
        }
        return arr;
    }
}