package com.kartographia.prospekt;
import javaxt.json.*;
import java.sql.SQLException;
import javaxt.utils.Date;

//******************************************************************************
//**  Opportunity Class
//******************************************************************************
/**
 *   Used to represent a Opportunity
 *
 ******************************************************************************/

public class Opportunity extends javaxt.sql.Model {

    private String name;
    private String description;
    private String organization;
    private String announcement;
    private String naics;
    private String setAside;
    private String classification;
    private Date postedDate;
    private Date responseDate;
    private Date startDate;
    private String contractType;
    private Long contractValue;
    private Date contractStart;
    private Source source;
    private String sourceKey;
    private Boolean active;
    private JSONObject info;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public Opportunity(){
        super("opportunity", java.util.Map.ofEntries(
            
            java.util.Map.entry("name", "name"),
            java.util.Map.entry("description", "description"),
            java.util.Map.entry("organization", "organization"),
            java.util.Map.entry("announcement", "announcement"),
            java.util.Map.entry("naics", "naics"),
            java.util.Map.entry("setAside", "set_aside"),
            java.util.Map.entry("classification", "classification"),
            java.util.Map.entry("postedDate", "posted_date"),
            java.util.Map.entry("responseDate", "response_date"),
            java.util.Map.entry("startDate", "start_date"),
            java.util.Map.entry("contractType", "contract_type"),
            java.util.Map.entry("contractValue", "contract_value"),
            java.util.Map.entry("contractStart", "contract_start"),
            java.util.Map.entry("source", "source_id"),
            java.util.Map.entry("sourceKey", "source_key"),
            java.util.Map.entry("active", "active"),
            java.util.Map.entry("info", "info")

        ));
        
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a record ID in the database.
   */
    public Opportunity(long id) throws SQLException {
        this();
        init(id);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a JSON representation of a
   *  Opportunity.
   */
    public Opportunity(JSONObject json){
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
            this.organization = getValue(rs, "organization").toString();
            this.announcement = getValue(rs, "announcement").toString();
            this.naics = getValue(rs, "naics").toString();
            this.setAside = getValue(rs, "set_aside").toString();
            this.classification = getValue(rs, "classification").toString();
            this.postedDate = getValue(rs, "posted_date").toDate();
            this.responseDate = getValue(rs, "response_date").toDate();
            this.startDate = getValue(rs, "start_date").toDate();
            this.contractType = getValue(rs, "contract_type").toString();
            this.contractValue = getValue(rs, "contract_value").toLong();
            this.contractStart = getValue(rs, "contract_start").toDate();
            Long sourceID = getValue(rs, "source_id").toLong();
            this.sourceKey = getValue(rs, "source_key").toString();
            this.active = getValue(rs, "active").toBoolean();
            this.info = new JSONObject(getValue(rs, "info").toString());



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
  /** Used to update attributes with attributes from another Opportunity.
   */
    public void update(JSONObject json){

        Long id = json.get("id").toLong();
        if (id!=null && id>0) this.id = id;
        this.name = json.get("name").toString();
        this.description = json.get("description").toString();
        this.organization = json.get("organization").toString();
        this.announcement = json.get("announcement").toString();
        this.naics = json.get("naics").toString();
        this.setAside = json.get("setAside").toString();
        this.classification = json.get("classification").toString();
        this.postedDate = json.get("postedDate").toDate();
        this.responseDate = json.get("responseDate").toDate();
        this.startDate = json.get("startDate").toDate();
        this.contractType = json.get("contractType").toString();
        this.contractValue = json.get("contractValue").toLong();
        this.contractStart = json.get("contractStart").toDate();
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
        this.active = json.get("active").toBoolean();
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

    public String getOrganization(){
        return organization;
    }

    public void setOrganization(String organization){
        this.organization = organization;
    }

    public String getAnnouncement(){
        return announcement;
    }

    public void setAnnouncement(String announcement){
        this.announcement = announcement;
    }

    public String getNaics(){
        return naics;
    }

    public void setNaics(String naics){
        this.naics = naics;
    }

    public String getSetAside(){
        return setAside;
    }

    public void setSetAside(String setAside){
        this.setAside = setAside;
    }

    public String getClassification(){
        return classification;
    }

    public void setClassification(String classification){
        this.classification = classification;
    }

    public Date getPostedDate(){
        return postedDate;
    }

    public void setPostedDate(Date postedDate){
        this.postedDate = postedDate;
    }

    public Date getResponseDate(){
        return responseDate;
    }

    public void setResponseDate(Date responseDate){
        this.responseDate = responseDate;
    }

    public Date getStartDate(){
        return startDate;
    }

    public void setStartDate(Date startDate){
        this.startDate = startDate;
    }

    public String getContractType(){
        return contractType;
    }

    public void setContractType(String contractType){
        this.contractType = contractType;
    }

    public Long getContractValue(){
        return contractValue;
    }

    public void setContractValue(Long contractValue){
        this.contractValue = contractValue;
    }

    public Date getContractStart(){
        return contractStart;
    }

    public void setContractStart(Date contractStart){
        this.contractStart = contractStart;
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

    public Boolean getActive(){
        return active;
    }

    public void setActive(Boolean active){
        this.active = active;
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
  /** Used to find a Opportunity using a given set of constraints. Example:
   *  Opportunity obj = Opportunity.get("name=", name);
   */
    public static Opportunity get(Object...args) throws SQLException {
        Object obj = _get(Opportunity.class, args);
        return obj==null ? null : (Opportunity) obj;
    }


  //**************************************************************************
  //** find
  //**************************************************************************
  /** Used to find Opportunitys using a given set of constraints.
   */
    public static Opportunity[] find(Object...args) throws SQLException {
        Object[] obj = _find(Opportunity.class, args);
        Opportunity[] arr = new Opportunity[obj.length];
        for (int i=0; i<arr.length; i++){
            arr[i] = (Opportunity) obj[i];
        }
        return arr;
    }
}