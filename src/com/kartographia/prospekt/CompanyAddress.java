package com.kartographia.prospekt;
import javaxt.json.*;
import java.sql.SQLException;
import javaxt.utils.Date;

//******************************************************************************
//**  CompanyAddress Class
//******************************************************************************
/**
 *   Used to represent a CompanyAddress
 *
 ******************************************************************************/

public class CompanyAddress extends javaxt.sql.Model {

    private Company company;
    private Address address;
    private String type;
    private Date date;
    private JSONObject info;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public CompanyAddress(){
        super("company_address", java.util.Map.ofEntries(
            
            java.util.Map.entry("company", "company_id"),
            java.util.Map.entry("address", "address_id"),
            java.util.Map.entry("type", "type"),
            java.util.Map.entry("date", "date"),
            java.util.Map.entry("info", "info")

        ));
        
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a record ID in the database.
   */
    public CompanyAddress(long id) throws SQLException {
        this();
        init(id);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a JSON representation of a
   *  CompanyAddress.
   */
    public CompanyAddress(JSONObject json){
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
            Long companyID = getValue(rs, "company_id").toLong();
            Long addressID = getValue(rs, "address_id").toLong();
            this.type = getValue(rs, "type").toString();
            this.date = getValue(rs, "date").toDate();
            this.info = new JSONObject(getValue(rs, "info").toString());



          //Set company
            if (companyID!=null) company = new Company(companyID);


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
  /** Used to update attributes with attributes from another CompanyAddress.
   */
    public void update(JSONObject json){

        Long id = json.get("id").toLong();
        if (id!=null && id>0) this.id = id;
        if (json.has("company")){
            company = new Company(json.get("company").toJSONObject());
        }
        else if (json.has("companyID")){
            try{
                company = new Company(json.get("companyID").toLong());
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
        this.date = json.get("date").toDate();
        this.info = json.get("info").toJSONObject();
    }


    public Company getCompany(){
        return company;
    }

    public void setCompany(Company company){
        this.company = company;
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
  /** Used to find a CompanyAddress using a given set of constraints. Example:
   *  CompanyAddress obj = CompanyAddress.get("company_id=", company_id);
   */
    public static CompanyAddress get(Object...args) throws SQLException {
        Object obj = _get(CompanyAddress.class, args);
        return obj==null ? null : (CompanyAddress) obj;
    }


  //**************************************************************************
  //** find
  //**************************************************************************
  /** Used to find CompanyAddresss using a given set of constraints.
   */
    public static CompanyAddress[] find(Object...args) throws SQLException {
        Object[] obj = _find(CompanyAddress.class, args);
        CompanyAddress[] arr = new CompanyAddress[obj.length];
        for (int i=0; i<arr.length; i++){
            arr[i] = (CompanyAddress) obj[i];
        }
        return arr;
    }
}