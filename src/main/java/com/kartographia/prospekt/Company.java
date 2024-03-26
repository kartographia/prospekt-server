package com.kartographia.prospekt;
import javaxt.json.*;
import java.sql.SQLException;
import java.math.BigDecimal;

//******************************************************************************
//**  Company Class
//******************************************************************************
/**
 *   Used to represent a Company
 *
 ******************************************************************************/

public class Company extends javaxt.sql.Model {

    private String name;
    private String description;
    private String eui;
    private Integer recentAwards;
    private BigDecimal recentAwardVal;
    private BigDecimal recentAwardMix;
    private String[] recentCustomers;
    private String[] recentNaics;
    private BigDecimal estimatedRevenue;
    private BigDecimal estimatedBacklog;
    private JSONObject info;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public Company(){
        super("company", java.util.Map.ofEntries(
            
            java.util.Map.entry("name", "name"),
            java.util.Map.entry("description", "description"),
            java.util.Map.entry("eui", "eui"),
            java.util.Map.entry("recentAwards", "recent_awards"),
            java.util.Map.entry("recentAwardVal", "recent_award_val"),
            java.util.Map.entry("recentAwardMix", "recent_award_mix"),
            java.util.Map.entry("recentCustomers", "recent_customers"),
            java.util.Map.entry("recentNaics", "recent_naics"),
            java.util.Map.entry("estimatedRevenue", "estimated_revenue"),
            java.util.Map.entry("estimatedBacklog", "estimated_backlog"),
            java.util.Map.entry("info", "info")

        ));
        
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a record ID in the database.
   */
    public Company(long id) throws SQLException {
        this();
        init(id);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a JSON representation of a
   *  Company.
   */
    public Company(JSONObject json){
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
            this.eui = getValue(rs, "eui").toString();
            this.recentAwards = getValue(rs, "recent_awards").toInteger();
            this.recentAwardVal = getValue(rs, "recent_award_val").toBigDecimal();
            this.recentAwardMix = getValue(rs, "recent_award_mix").toBigDecimal();
            {Object[] v = (Object[]) getValue(rs, "recent_customers").toArray();
            this.recentCustomers = v==null ? null : java.util.Arrays.copyOf(v, v.length, String[].class);}
            {Object[] v = (Object[]) getValue(rs, "recent_naics").toArray();
            this.recentNaics = v==null ? null : java.util.Arrays.copyOf(v, v.length, String[].class);}
            this.estimatedRevenue = getValue(rs, "estimated_revenue").toBigDecimal();
            this.estimatedBacklog = getValue(rs, "estimated_backlog").toBigDecimal();
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
  /** Used to update attributes with attributes from another Company.
   */
    public void update(JSONObject json){

        Long id = json.get("id").toLong();
        if (id!=null && id>0) this.id = id;
        this.name = json.get("name").toString();
        this.description = json.get("description").toString();
        this.eui = json.get("eui").toString();
        this.recentAwards = json.get("recentAwards").toInteger();
        this.recentAwardVal = json.get("recentAwardVal").toBigDecimal();
        this.recentAwardMix = json.get("recentAwardMix").toBigDecimal();
        {Object[] v = json.has("recentCustomers") ? json.get("recentCustomers").toJSONArray().toArray() : null;
        this.recentCustomers = v==null ? null : java.util.Arrays.copyOf(v, v.length, String[].class);}
        {Object[] v = json.has("recentNaics") ? json.get("recentNaics").toJSONArray().toArray() : null;
        this.recentNaics = v==null ? null : java.util.Arrays.copyOf(v, v.length, String[].class);}
        this.estimatedRevenue = json.get("estimatedRevenue").toBigDecimal();
        this.estimatedBacklog = json.get("estimatedBacklog").toBigDecimal();
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

    public String getEui(){
        return eui;
    }

    public void setEui(String eui){
        this.eui = eui;
    }

    public Integer getRecentAwards(){
        return recentAwards;
    }

    public void setRecentAwards(Integer recentAwards){
        this.recentAwards = recentAwards;
    }

    public BigDecimal getRecentAwardVal(){
        return recentAwardVal;
    }

    public void setRecentAwardVal(BigDecimal recentAwardVal){
        this.recentAwardVal = recentAwardVal;
    }

    public BigDecimal getRecentAwardMix(){
        return recentAwardMix;
    }

    public void setRecentAwardMix(BigDecimal recentAwardMix){
        this.recentAwardMix = recentAwardMix;
    }

    public String[] getRecentCustomers(){
        return recentCustomers;
    }

    public void setRecentCustomers(String[] recentCustomers){
        this.recentCustomers = recentCustomers;
    }

    public String[] getRecentNaics(){
        return recentNaics;
    }

    public void setRecentNaics(String[] recentNaics){
        this.recentNaics = recentNaics;
    }

    public BigDecimal getEstimatedRevenue(){
        return estimatedRevenue;
    }

    public void setEstimatedRevenue(BigDecimal estimatedRevenue){
        this.estimatedRevenue = estimatedRevenue;
    }

    public BigDecimal getEstimatedBacklog(){
        return estimatedBacklog;
    }

    public void setEstimatedBacklog(BigDecimal estimatedBacklog){
        this.estimatedBacklog = estimatedBacklog;
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
  /** Used to find a Company using a given set of constraints. Example:
   *  Company obj = Company.get("name=", name);
   */
    public static Company get(Object...args) throws SQLException {
        Object obj = _get(Company.class, args);
        return obj==null ? null : (Company) obj;
    }


  //**************************************************************************
  //** find
  //**************************************************************************
  /** Used to find Companys using a given set of constraints.
   */
    public static Company[] find(Object...args) throws SQLException {
        Object[] obj = _find(Company.class, args);
        Company[] arr = new Company[obj.length];
        for (int i=0; i<arr.length; i++){
            arr[i] = (Company) obj[i];
        }
        return arr;
    }
}