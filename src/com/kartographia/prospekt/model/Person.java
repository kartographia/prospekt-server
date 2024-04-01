package com.kartographia.prospekt.model;
import javaxt.json.*;
import java.sql.SQLException;


//******************************************************************************
//**  Person Class
//******************************************************************************
/**
 *   Used to represent a Person
 *
 ******************************************************************************/

public class Person extends javaxt.sql.Model {

    private String firstName;
    private String lastName;
    private String fullName;
    private String searchTerm;
    private JSONObject contact;
    private JSONObject info;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public Person(){
        super("person", java.util.Map.ofEntries(

            java.util.Map.entry("firstName", "first_name"),
            java.util.Map.entry("lastName", "last_name"),
            java.util.Map.entry("fullName", "full_name"),
            java.util.Map.entry("searchTerm", "search_term"),
            java.util.Map.entry("contact", "contact"),
            java.util.Map.entry("info", "info")

        ));

    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a record ID in the database.
   */
    public Person(long id) throws SQLException {
        this();
        init(id);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a JSON representation of a
   *  Person.
   */
    public Person(JSONObject json){
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
            this.firstName = getValue(rs, "first_name").toString();
            this.lastName = getValue(rs, "last_name").toString();
            this.fullName = getValue(rs, "full_name").toString();
            this.searchTerm = getValue(rs, "search_term").toString();
            this.contact = new JSONObject(getValue(rs, "contact").toString());
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
  /** Used to update attributes with attributes from another Person.
   */
    public void update(JSONObject json){

        Long id = json.get("id").toLong();
        if (id!=null && id>0) this.id = id;
        this.firstName = json.get("firstName").toString();
        this.lastName = json.get("lastName").toString();
        this.fullName = json.get("fullName").toString();
        this.searchTerm = json.get("searchTerm").toString();
        this.contact = json.get("contact").toJSONObject();
        this.info = json.get("info").toJSONObject();
    }


    public String getFirstName(){
        return firstName;
    }

    public void setFirstName(String firstName){
        this.firstName = firstName;
    }

    public String getLastName(){
        return lastName;
    }

    public void setLastName(String lastName){
        this.lastName = lastName;
    }

    public String getFullName(){
        return fullName;
    }

    public void setFullName(String fullName){
        this.fullName = fullName;
    }

    public String getSearchTerm(){
        return searchTerm;
    }

    public void setSearchTerm(String searchTerm){
        this.searchTerm = searchTerm;
    }

    public JSONObject getContact(){
        return contact;
    }

    public void setContact(JSONObject contact){
        this.contact = contact;
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
  /** Used to find a Person using a given set of constraints. Example:
   *  Person obj = Person.get("first_name=", first_name);
   */
    public static Person get(Object...args) throws SQLException {
        Object obj = _get(Person.class, args);
        return obj==null ? null : (Person) obj;
    }


  //**************************************************************************
  //** find
  //**************************************************************************
  /** Used to find Persons using a given set of constraints.
   */
    public static Person[] find(Object...args) throws SQLException {
        Object[] obj = _find(Person.class, args);
        Person[] arr = new Person[obj.length];
        for (int i=0; i<arr.length; i++){
            arr[i] = (Person) obj[i];
        }
        return arr;
    }
}