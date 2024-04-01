package com.kartographia.prospekt;
import javaxt.json.*;
import java.sql.SQLException;


//******************************************************************************
//**  UserInterest Class
//******************************************************************************
/**
 *   Used to represent a UserInterest
 *
 ******************************************************************************/

public class UserInterest extends javaxt.sql.Model {

    private User user;
    private Opportunity opportunity;
    private Boolean interest;
    private JSONObject info;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public UserInterest(){
        super("user_interest", java.util.Map.ofEntries(
            
            java.util.Map.entry("user", "user_id"),
            java.util.Map.entry("opportunity", "opportunity_id"),
            java.util.Map.entry("interest", "interest"),
            java.util.Map.entry("info", "info")

        ));
        
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a record ID in the database.
   */
    public UserInterest(long id) throws SQLException {
        this();
        init(id);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a JSON representation of a
   *  UserInterest.
   */
    public UserInterest(JSONObject json){
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
            Long userID = getValue(rs, "user_id").toLong();
            Long opportunityID = getValue(rs, "opportunity_id").toLong();
            this.interest = getValue(rs, "interest").toBoolean();
            this.info = new JSONObject(getValue(rs, "info").toString());



          //Set user
            if (userID!=null) user = new User(userID);


          //Set opportunity
            if (opportunityID!=null) opportunity = new Opportunity(opportunityID);

        }
        catch(Exception e){
            if (e instanceof SQLException) throw (SQLException) e;
            else throw new SQLException(e.getMessage());
        }
    }


  //**************************************************************************
  //** update
  //**************************************************************************
  /** Used to update attributes with attributes from another UserInterest.
   */
    public void update(JSONObject json){

        Long id = json.get("id").toLong();
        if (id!=null && id>0) this.id = id;
        if (json.has("user")){
            user = new User(json.get("user").toJSONObject());
        }
        else if (json.has("userID")){
            try{
                user = new User(json.get("userID").toLong());
            }
            catch(Exception e){}
        }
        if (json.has("opportunity")){
            opportunity = new Opportunity(json.get("opportunity").toJSONObject());
        }
        else if (json.has("opportunityID")){
            try{
                opportunity = new Opportunity(json.get("opportunityID").toLong());
            }
            catch(Exception e){}
        }
        this.interest = json.get("interest").toBoolean();
        this.info = json.get("info").toJSONObject();
    }


    public User getUser(){
        return user;
    }

    public void setUser(User user){
        this.user = user;
    }

    public Opportunity getOpportunity(){
        return opportunity;
    }

    public void setOpportunity(Opportunity opportunity){
        this.opportunity = opportunity;
    }

    public Boolean getInterest(){
        return interest;
    }

    public void setInterest(Boolean interest){
        this.interest = interest;
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
  /** Used to find a UserInterest using a given set of constraints. Example:
   *  UserInterest obj = UserInterest.get("user_id=", user_id);
   */
    public static UserInterest get(Object...args) throws SQLException {
        Object obj = _get(UserInterest.class, args);
        return obj==null ? null : (UserInterest) obj;
    }


  //**************************************************************************
  //** find
  //**************************************************************************
  /** Used to find UserInterests using a given set of constraints.
   */
    public static UserInterest[] find(Object...args) throws SQLException {
        Object[] obj = _find(UserInterest.class, args);
        UserInterest[] arr = new UserInterest[obj.length];
        for (int i=0; i<arr.length; i++){
            arr[i] = (UserInterest) obj[i];
        }
        return arr;
    }
}