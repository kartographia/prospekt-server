package com.kartographia.prospekt.model;
import javaxt.json.*;
import java.sql.SQLException;
import java.math.BigDecimal;
import javaxt.utils.Date;

//******************************************************************************
//**  CompanyOfficer Class
//******************************************************************************
/**
 *   Used to represent a CompanyOfficer
 *
 ******************************************************************************/

public class CompanyOfficer extends javaxt.sql.Model {

    private Person person;
    private Company company;
    private String title;
    private BigDecimal salary;
    private Date lastUpdate;
    private JSONObject info;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public CompanyOfficer(){
        super("company_officer", java.util.Map.ofEntries(

            java.util.Map.entry("person", "person_id"),
            java.util.Map.entry("company", "company_id"),
            java.util.Map.entry("title", "title"),
            java.util.Map.entry("salary", "salary"),
            java.util.Map.entry("lastUpdate", "last_update"),
            java.util.Map.entry("info", "info")

        ));

    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a record ID in the database.
   */
    public CompanyOfficer(long id) throws SQLException {
        this();
        init(id);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a JSON representation of a
   *  CompanyOfficer.
   */
    public CompanyOfficer(JSONObject json){
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
            Long companyID = getValue(rs, "company_id").toLong();
            this.title = getValue(rs, "title").toString();
            this.salary = getValue(rs, "salary").toBigDecimal();
            this.lastUpdate = getValue(rs, "last_update").toDate();
            this.info = new JSONObject(getValue(rs, "info").toString());



          //Set person
            if (personID!=null) person = new Person(personID);


          //Set company
            if (companyID!=null) company = new Company(companyID);

        }
        catch(Exception e){
            if (e instanceof SQLException) throw (SQLException) e;
            else throw new SQLException(e.getMessage());
        }
    }


  //**************************************************************************
  //** update
  //**************************************************************************
  /** Used to update attributes with attributes from another CompanyOfficer.
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
        if (json.has("company")){
            company = new Company(json.get("company").toJSONObject());
        }
        else if (json.has("companyID")){
            try{
                company = new Company(json.get("companyID").toLong());
            }
            catch(Exception e){}
        }
        this.title = json.get("title").toString();
        this.salary = json.get("salary").toBigDecimal();
        this.lastUpdate = json.get("lastUpdate").toDate();
        this.info = json.get("info").toJSONObject();
    }


    public Person getPerson(){
        return person;
    }

    public void setPerson(Person person){
        this.person = person;
    }

    public Company getCompany(){
        return company;
    }

    public void setCompany(Company company){
        this.company = company;
    }

    public String getTitle(){
        return title;
    }

    public void setTitle(String title){
        this.title = title;
    }

    public BigDecimal getSalary(){
        return salary;
    }

    public void setSalary(BigDecimal salary){
        this.salary = salary;
    }

    public Date getLastUpdate(){
        return lastUpdate;
    }

    public void setLastUpdate(Date lastUpdate){
        this.lastUpdate = lastUpdate;
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
  /** Used to find a CompanyOfficer using a given set of constraints. Example:
   *  CompanyOfficer obj = CompanyOfficer.get("person_id=", person_id);
   */
    public static CompanyOfficer get(Object...args) throws SQLException {
        Object obj = _get(CompanyOfficer.class, args);
        return obj==null ? null : (CompanyOfficer) obj;
    }


  //**************************************************************************
  //** find
  //**************************************************************************
  /** Used to find CompanyOfficers using a given set of constraints.
   */
    public static CompanyOfficer[] find(Object...args) throws SQLException {
        Object[] obj = _find(CompanyOfficer.class, args);
        CompanyOfficer[] arr = new CompanyOfficer[obj.length];
        for (int i=0; i<arr.length; i++){
            arr[i] = (CompanyOfficer) obj[i];
        }
        return arr;
    }
}