package com.kartographia.prospekt;
import javaxt.json.*;
import java.sql.SQLException;
import java.util.ArrayList;

//******************************************************************************
//**  CompanyGroup Class
//******************************************************************************
/**
 *   Used to represent a CompanyGroup
 *
 ******************************************************************************/

public class CompanyGroup extends javaxt.sql.Model {

    private String name;
    private String description;
    private JSONObject info;
    private ArrayList<Company> companies;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public CompanyGroup(){
        super("company_group", java.util.Map.ofEntries(
            
            java.util.Map.entry("name", "name"),
            java.util.Map.entry("description", "description"),
            java.util.Map.entry("info", "info"),
            java.util.Map.entry("companies", "companies")

        ));
        companies = new ArrayList<Company>();
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a record ID in the database.
   */
    public CompanyGroup(long id) throws SQLException {
        this();
        init(id);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a JSON representation of a
   *  CompanyGroup.
   */
    public CompanyGroup(JSONObject json){
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
            this.name = getValue(rs, "name").toString();
            this.description = getValue(rs, "description").toString();
            this.info = new JSONObject(getValue(rs, "info").toString());


            try (javaxt.sql.Connection conn = getConnection(this.getClass())) {


              //Set companies
                for (javaxt.sql.Record record : conn.getRecords(
                    "select company_id from company_group_company where company_group_id="+id)){
                    companies.add(new Company(record.get(0).toLong()));
                }
            }


        }
        catch(Exception e){
            if (e instanceof SQLException) throw (SQLException) e;
            else throw new SQLException(e.getMessage());
        }
    }


  //**************************************************************************
  //** update
  //**************************************************************************
  /** Used to update attributes with attributes from another CompanyGroup.
   */
    public void update(JSONObject json){

        Long id = json.get("id").toLong();
        if (id!=null && id>0) this.id = id;
        this.name = json.get("name").toString();
        this.description = json.get("description").toString();
        this.info = json.get("info").toJSONObject();

      //Set companies
        if (json.has("companies")){
            for (JSONValue _companies : json.get("companies").toJSONArray()){
                companies.add(new Company(_companies.toJSONObject()));
            }
        }
    }


    public String getName(){
        return name;
    }

    public void setName(String name){
        this.name = name;
    }

    public String getDescription(){
        return description;
    }

    public void setDescription(String description){
        this.description = description;
    }

    public JSONObject getInfo(){
        return info;
    }

    public void setInfo(JSONObject info){
        this.info = info;
    }

    public Company[] getCompanies(){
        return companies.toArray(new Company[companies.size()]);
    }

    public void setCompanies(Company[] arr){
        companies = new ArrayList<Company>();
        for (int i=0; i<arr.length; i++){
            companies.add(arr[i]);
        }
    }

    public void addCompany(Company company){
        this.companies.add(company);
    }
    
  //**************************************************************************
  //** save
  //**************************************************************************
  /** Used to save a CompanyGroup in the database.
   */
    public void save() throws SQLException {

      //Update record in the company_group table
        super.save();


      //Save models
        try (javaxt.sql.Connection conn = getConnection(this.getClass())) {
            String target;
            
          //Save companies
            ArrayList<Long> companyIDs = new ArrayList<>();
            for (Company obj : this.companies){
                obj.save();
                companyIDs.add(obj.getID());
            }


          //Link companies to this CompanyGroup
            target = "company_group_company where company_group_id=" + this.id;
            conn.execute("delete from " + target);
            try (javaxt.sql.Recordset rs = conn.getRecordset("select * from " + target, false)){
                for (long companyID : companyIDs){
                    rs.addNew();
                    rs.setValue("company_group_id", this.id);
                    rs.setValue("company_id", companyID);
                    rs.update();
                }
            }
        }
    }

    


  //**************************************************************************
  //** get
  //**************************************************************************
  /** Used to find a CompanyGroup using a given set of constraints. Example:
   *  CompanyGroup obj = CompanyGroup.get("name=", name);
   */
    public static CompanyGroup get(Object...args) throws SQLException {
        Object obj = _get(CompanyGroup.class, args);
        return obj==null ? null : (CompanyGroup) obj;
    }


  //**************************************************************************
  //** find
  //**************************************************************************
  /** Used to find CompanyGroups using a given set of constraints.
   */
    public static CompanyGroup[] find(Object...args) throws SQLException {
        Object[] obj = _find(CompanyGroup.class, args);
        CompanyGroup[] arr = new CompanyGroup[obj.length];
        for (int i=0; i<arr.length; i++){
            arr[i] = (CompanyGroup) obj[i];
        }
        return arr;
    }
}