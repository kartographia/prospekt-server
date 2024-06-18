package com.kartographia.prospekt.model;
import javaxt.json.*;
import java.sql.SQLException;


//******************************************************************************
//**  CompanyGroupAccess Class
//******************************************************************************
/**
 *   Used to represent a CompanyGroupAccess
 *
 ******************************************************************************/

public class CompanyGroupAccess extends javaxt.sql.Model {

    private CompanyGroup companyGroup;
    private User user;
    private Integer accessLevel;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public CompanyGroupAccess(){
        super("company_group_access", java.util.Map.ofEntries(
            
            java.util.Map.entry("companyGroup", "company_group_id"),
            java.util.Map.entry("user", "user_id"),
            java.util.Map.entry("accessLevel", "access_level")

        ));
        
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a record ID in the database.
   */
    public CompanyGroupAccess(long id) throws SQLException {
        this();
        init(id);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a JSON representation of a
   *  CompanyGroupAccess.
   */
    public CompanyGroupAccess(JSONObject json){
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
            Long companyGroupID = getValue(rs, "company_group_id").toLong();
            Long userID = getValue(rs, "user_id").toLong();
            this.accessLevel = getValue(rs, "access_level").toInteger();



          //Set companyGroup
            if (companyGroupID!=null) companyGroup = new CompanyGroup(companyGroupID);


          //Set user
            if (userID!=null) user = new User(userID);

        }
        catch(Exception e){
            if (e instanceof SQLException) throw (SQLException) e;
            else throw new SQLException(e.getMessage());
        }
    }


  //**************************************************************************
  //** update
  //**************************************************************************
  /** Used to update attributes with attributes from another CompanyGroupAccess.
   */
    public void update(JSONObject json){

        Long id = json.get("id").toLong();
        if (id!=null && id>0) this.id = id;
        if (json.has("companyGroup")){
            companyGroup = new CompanyGroup(json.get("companyGroup").toJSONObject());
        }
        else if (json.has("companyGroupID")){
            try{
                companyGroup = new CompanyGroup(json.get("companyGroupID").toLong());
            }
            catch(Exception e){}
        }
        if (json.has("user")){
            user = new User(json.get("user").toJSONObject());
        }
        else if (json.has("userID")){
            try{
                user = new User(json.get("userID").toLong());
            }
            catch(Exception e){}
        }
        this.accessLevel = json.get("accessLevel").toInteger();
    }


    public CompanyGroup getCompanyGroup(){
        return companyGroup;
    }

    public void setCompanyGroup(CompanyGroup companyGroup){
        this.companyGroup = companyGroup;
    }

    public User getUser(){
        return user;
    }

    public void setUser(User user){
        this.user = user;
    }

    public Integer getAccessLevel(){
        return accessLevel;
    }

    public void setAccessLevel(Integer accessLevel){
        this.accessLevel = accessLevel;
    }
    
    


  //**************************************************************************
  //** get
  //**************************************************************************
  /** Used to find a CompanyGroupAccess using a given set of constraints. Example:
   *  CompanyGroupAccess obj = CompanyGroupAccess.get("company_group_id=", company_group_id);
   */
    public static CompanyGroupAccess get(Object...args) throws SQLException {
        Object obj = _get(CompanyGroupAccess.class, args);
        return obj==null ? null : (CompanyGroupAccess) obj;
    }


  //**************************************************************************
  //** find
  //**************************************************************************
  /** Used to find CompanyGroupAccesss using a given set of constraints.
   */
    public static CompanyGroupAccess[] find(Object...args) throws SQLException {
        Object[] obj = _find(CompanyGroupAccess.class, args);
        CompanyGroupAccess[] arr = new CompanyGroupAccess[obj.length];
        for (int i=0; i<arr.length; i++){
            arr[i] = (CompanyGroupAccess) obj[i];
        }
        return arr;
    }
}