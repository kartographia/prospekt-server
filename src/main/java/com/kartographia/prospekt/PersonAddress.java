package com.kartographia.prospekt;
import javaxt.json.*;
import java.sql.SQLException;


//******************************************************************************
//**  PersonAddress Class
//******************************************************************************
/**
 *   Used to represent a PersonAddress
 *
 ******************************************************************************/

public class PersonAddress extends javaxt.sql.Model {

    private Person person;
    private Address address;
    private String type;
    private JSONObject info;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public PersonAddress(){
        super("person_address", java.util.Map.ofEntries(
            
            java.util.Map.entry("person", "person_id"),
            java.util.Map.entry("address", "address_id"),
            java.util.Map.entry("type", "type"),
            java.util.Map.entry("info", "info")

        ));
        
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a record ID in the database.
   */
    public PersonAddress(long id) throws SQLException {
        this();
        init(id);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a JSON representation of a
   *  PersonAddress.
   */
    public PersonAddress(JSONObject json){
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
            Long personID = getValue(rs, "person_id").toLong();
            Long addressID = getValue(rs, "address_id").toLong();
            this.type = getValue(rs, "type").toString();
            this.info = new JSONObject(getValue(rs, "info").toString());



          //Set person
            if (personID!=null) person = new Person(personID);


          //Set address
            if (addressID!=null) address = new Address(addressID);

        }
        catch(Exception e){
            if (e instanceof SQLException) throw (SQLException) e;
            else throw new SQLException(e.getMessage());
        }
    }


  //**************************************************************************
  //** update
  //**************************************************************************
  /** Used to update attributes with attributes from another PersonAddress.
   */
    public void update(JSONObject json){

        Long id = json.get("id").toLong();
        if (id!=null && id>0) this.id = id;
        if (json.has("person")){
            person = new Person(json.get("person").toJSONObject());
        }
        else if (json.has("personID")){
            try{
                person = new Person(json.get("personID").toLong());
            }
            catch(Exception e){}
        }
        if (json.has("address")){
            address = new Address(json.get("address").toJSONObject());
        }
        else if (json.has("addressID")){
            try{
                address = new Address(json.get("addressID").toLong());
            }
            catch(Exception e){}
        }
        this.type = json.get("type").toString();
        this.info = json.get("info").toJSONObject();
    }


    public Person getPerson(){
        return person;
    }

    public void setPerson(Person person){
        this.person = person;
    }

    public Address getAddress(){
        return address;
    }

    public void setAddress(Address address){
        this.address = address;
    }

    public String getType(){
        return type;
    }

    public void setType(String type){
        this.type = type;
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
  /** Used to find a PersonAddress using a given set of constraints. Example:
   *  PersonAddress obj = PersonAddress.get("person_id=", person_id);
   */
    public static PersonAddress get(Object...args) throws SQLException {
        Object obj = _get(PersonAddress.class, args);
        return obj==null ? null : (PersonAddress) obj;
    }


  //**************************************************************************
  //** find
  //**************************************************************************
  /** Used to find PersonAddresss using a given set of constraints.
   */
    public static PersonAddress[] find(Object...args) throws SQLException {
        Object[] obj = _find(PersonAddress.class, args);
        PersonAddress[] arr = new PersonAddress[obj.length];
        for (int i=0; i<arr.length; i++){
            arr[i] = (PersonAddress) obj[i];
        }
        return arr;
    }
}