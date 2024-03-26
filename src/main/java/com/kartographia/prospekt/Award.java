package com.kartographia.prospekt;
import javaxt.json.*;
import java.sql.SQLException;
import javaxt.utils.Date;

//******************************************************************************
//**  Award Class
//******************************************************************************
/**
 *   Used to represent a Award
 *
 ******************************************************************************/

public class Award extends javaxt.sql.Model {

    private String name;
    private String description;
    private Date date;
    private String type;
    private Long value;
    private String naics;
    private String customer;
    private Date startDate;
    private Date endDate;
    private Boolean competed;
    private Opportunity opportunity;
    private Company recipient;
    private Source source;
    private String sourceKey;
    private JSONObject info;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public Award(){
        super("award", java.util.Map.ofEntries(
            
            java.util.Map.entry("name", "name"),
            java.util.Map.entry("description", "description"),
            java.util.Map.entry("date", "date"),
            java.util.Map.entry("type", "type"),
            java.util.Map.entry("value", "value"),
            java.util.Map.entry("naics", "naics"),
            java.util.Map.entry("customer", "customer"),
            java.util.Map.entry("startDate", "start_date"),
            java.util.Map.entry("endDate", "end_date"),
            java.util.Map.entry("competed", "competed"),
            java.util.Map.entry("opportunity", "opportunity_id"),
            java.util.Map.entry("recipient", "recipient_id"),
            java.util.Map.entry("source", "source_id"),
            java.util.Map.entry("sourceKey", "source_key"),
            java.util.Map.entry("info", "info")

        ));
        
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a record ID in the database.
   */
    public Award(long id) throws SQLException {
        this();
        init(id);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a JSON representation of a
   *  Award.
   */
    public Award(JSONObject json){
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
            this.date = getValue(rs, "date").toDate();
            this.type = getValue(rs, "type").toString();
            this.value = getValue(rs, "value").toLong();
            this.naics = getValue(rs, "naics").toString();
            this.customer = getValue(rs, "customer").toString();
            this.startDate = getValue(rs, "start_date").toDate();
            this.endDate = getValue(rs, "end_date").toDate();
            this.competed = getValue(rs, "competed").toBoolean();
            Long opportunityID = getValue(rs, "opportunity_id").toLong();
            Long recipientID = getValue(rs, "recipient_id").toLong();
            Long sourceID = getValue(rs, "source_id").toLong();
            this.sourceKey = getValue(rs, "source_key").toString();
            this.info = new JSONObject(getValue(rs, "info").toString());



          //Set opportunity
            if (opportunityID!=null) opportunity = new Opportunity(opportunityID);


          //Set recipient
            if (recipientID!=null) recipient = new Company(recipientID);


          //Set source
            if (sourceID!=null) source = new Source(sourceID);

        }
        catch(Exception e){
            if (e instanceof SQLException) throw (SQLException) e;
            else throw new SQLException(e.getMessage());
        }
    }


  //**************************************************************************
  //** update
  //**************************************************************************
  /** Used to update attributes with attributes from another Award.
   */
    public void update(JSONObject json){

        Long id = json.get("id").toLong();
        if (id!=null && id>0) this.id = id;
        this.name = json.get("name").toString();
        this.description = json.get("description").toString();
        this.date = json.get("date").toDate();
        this.type = json.get("type").toString();
        this.value = json.get("value").toLong();
        this.naics = json.get("naics").toString();
        this.customer = json.get("customer").toString();
        this.startDate = json.get("startDate").toDate();
        this.endDate = json.get("endDate").toDate();
        this.competed = json.get("competed").toBoolean();
        if (json.has("opportunity")){
            opportunity = new Opportunity(json.get("opportunity").toJSONObject());
        }
        else if (json.has("opportunityID")){
            try{
                opportunity = new Opportunity(json.get("opportunityID").toLong());
            }
            catch(Exception e){}
        }
        if (json.has("recipient")){
            recipient = new Company(json.get("recipient").toJSONObject());
        }
        else if (json.has("recipientID")){
            try{
                recipient = new Company(json.get("recipientID").toLong());
            }
            catch(Exception e){}
        }
        if (json.has("source")){
            source = new Source(json.get("source").toJSONObject());
        }
        else if (json.has("sourceID")){
            try{
                source = new Source(json.get("sourceID").toLong());
            }
            catch(Exception e){}
        }
        this.sourceKey = json.get("sourceKey").toString();
        this.info = json.get("info").toJSONObject();
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

    public Date getDate(){
        return date;
    }

    public void setDate(Date date){
        this.date = date;
    }

    public String getType(){
        return type;
    }

    public void setType(String type){
        this.type = type;
    }

    public Long getValue(){
        return value;
    }

    public void setValue(Long value){
        this.value = value;
    }

    public String getNaics(){
        return naics;
    }

    public void setNaics(String naics){
        this.naics = naics;
    }

    public String getCustomer(){
        return customer;
    }

    public void setCustomer(String customer){
        this.customer = customer;
    }

    public Date getStartDate(){
        return startDate;
    }

    public void setStartDate(Date startDate){
        this.startDate = startDate;
    }

    public Date getEndDate(){
        return endDate;
    }

    public void setEndDate(Date endDate){
        this.endDate = endDate;
    }

    public Boolean getCompeted(){
        return competed;
    }

    public void setCompeted(Boolean competed){
        this.competed = competed;
    }

    public Opportunity getOpportunity(){
        return opportunity;
    }

    public void setOpportunity(Opportunity opportunity){
        this.opportunity = opportunity;
    }

    public Company getRecipient(){
        return recipient;
    }

    public void setRecipient(Company recipient){
        this.recipient = recipient;
    }

    public Source getSource(){
        return source;
    }

    public void setSource(Source source){
        this.source = source;
    }

    public String getSourceKey(){
        return sourceKey;
    }

    public void setSourceKey(String sourceKey){
        this.sourceKey = sourceKey;
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
  /** Used to find a Award using a given set of constraints. Example:
   *  Award obj = Award.get("name=", name);
   */
    public static Award get(Object...args) throws SQLException {
        Object obj = _get(Award.class, args);
        return obj==null ? null : (Award) obj;
    }


  //**************************************************************************
  //** find
  //**************************************************************************
  /** Used to find Awards using a given set of constraints.
   */
    public static Award[] find(Object...args) throws SQLException {
        Object[] obj = _find(Award.class, args);
        Award[] arr = new Award[obj.length];
        for (int i=0; i<arr.length; i++){
            arr[i] = (Award) obj[i];
        }
        return arr;
    }
}