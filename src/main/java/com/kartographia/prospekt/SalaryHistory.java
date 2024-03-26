package com.kartographia.prospekt;
import javaxt.json.*;
import java.sql.SQLException;
import java.math.BigDecimal;
import javaxt.utils.Date;

//******************************************************************************
//**  SalaryHistory Class
//******************************************************************************
/**
 *   Used to represent a SalaryHistory
 *
 ******************************************************************************/

public class SalaryHistory extends javaxt.sql.Model {

    private Person person;
    private Company company;
    private BigDecimal salary;
    private Date date;
    private JSONObject info;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public SalaryHistory(){
        super("salary_history", java.util.Map.ofEntries(
            
            java.util.Map.entry("person", "person_id"),
            java.util.Map.entry("company", "company_id"),
            java.util.Map.entry("salary", "salary"),
            java.util.Map.entry("date", "date"),
            java.util.Map.entry("info", "info")

        ));
        
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a record ID in the database.
   */
    public SalaryHistory(long id) throws SQLException {
        this();
        init(id);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a JSON representation of a
   *  SalaryHistory.
   */
    public SalaryHistory(JSONObject json){
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
            this.salary = getValue(rs, "salary").toBigDecimal();
            this.date = getValue(rs, "date").toDate();
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
  /** Used to update attributes with attributes from another SalaryHistory.
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
        this.salary = json.get("salary").toBigDecimal();
        this.date = json.get("date").toDate();
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

    public BigDecimal getSalary(){
        return salary;
    }

    public void setSalary(BigDecimal salary){
        this.salary = salary;
    }

    public Date getDate(){
        return date;
    }

    public void setDate(Date date){
        this.date = date;
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
  /** Used to find a SalaryHistory using a given set of constraints. Example:
   *  SalaryHistory obj = SalaryHistory.get("person_id=", person_id);
   */
    public static SalaryHistory get(Object...args) throws SQLException {
        Object obj = _get(SalaryHistory.class, args);
        return obj==null ? null : (SalaryHistory) obj;
    }


  //**************************************************************************
  //** find
  //**************************************************************************
  /** Used to find SalaryHistorys using a given set of constraints.
   */
    public static SalaryHistory[] find(Object...args) throws SQLException {
        Object[] obj = _find(SalaryHistory.class, args);
        SalaryHistory[] arr = new SalaryHistory[obj.length];
        for (int i=0; i<arr.length; i++){
            arr[i] = (SalaryHistory) obj[i];
        }
        return arr;
    }
}