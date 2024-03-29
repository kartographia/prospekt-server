package com.kartographia.prospekt;
import javaxt.json.*;
import java.sql.SQLException;


//******************************************************************************
//**  Code Class
//******************************************************************************
/**
 *   Used to represent a Code
 *
 ******************************************************************************/

public class Code extends javaxt.sql.Model {

    private String key;
    private String value;
    private String category;
    private String comments;
    private Source source;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public Code(){
        super("code", java.util.Map.ofEntries(
            
            java.util.Map.entry("key", "key"),
            java.util.Map.entry("value", "value"),
            java.util.Map.entry("category", "category"),
            java.util.Map.entry("comments", "comments"),
            java.util.Map.entry("source", "source_id")

        ));
        
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a record ID in the database.
   */
    public Code(long id) throws SQLException {
        this();
        init(id);
    }


  //**************************************************************************
  //** Constructor
  //**************************************************************************
  /** Creates a new instance of this class using a JSON representation of a
   *  Code.
   */
    public Code(JSONObject json){
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
            this.key = getValue(rs, "key").toString();
            this.value = getValue(rs, "value").toString();
            this.category = getValue(rs, "category").toString();
            this.comments = getValue(rs, "comments").toString();
            Long sourceID = getValue(rs, "source_id").toLong();



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
  /** Used to update attributes with attributes from another Code.
   */
    public void update(JSONObject json){

        Long id = json.get("id").toLong();
        if (id!=null && id>0) this.id = id;
        this.key = json.get("key").toString();
        this.value = json.get("value").toString();
        this.category = json.get("category").toString();
        this.comments = json.get("comments").toString();
        if (json.has("source")){
            source = new Source(json.get("source").toJSONObject());
        }
        else if (json.has("sourceID")){
            try{
                source = new Source(json.get("sourceID").toLong());
            }
            catch(Exception e){}
        }
    }


    public String getKey(){
        return key;
    }

    public void setKey(String key){
        this.key = key;
    }

    public String getValue(){
        return value;
    }

    public void setValue(String value){
        this.value = value;
    }

    public String getCategory(){
        return category;
    }

    public void setCategory(String category){
        this.category = category;
    }

    public String getComments(){
        return comments;
    }

    public void setComments(String comments){
        this.comments = comments;
    }

    public Source getSource(){
        return source;
    }

    public void setSource(Source source){
        this.source = source;
    }
    
    


  //**************************************************************************
  //** get
  //**************************************************************************
  /** Used to find a Code using a given set of constraints. Example:
   *  Code obj = Code.get("key=", key);
   */
    public static Code get(Object...args) throws SQLException {
        Object obj = _get(Code.class, args);
        return obj==null ? null : (Code) obj;
    }


  //**************************************************************************
  //** find
  //**************************************************************************
  /** Used to find Codes using a given set of constraints.
   */
    public static Code[] find(Object...args) throws SQLException {
        Object[] obj = _find(Code.class, args);
        Code[] arr = new Code[obj.length];
        for (int i=0; i<arr.length; i++){
            arr[i] = (Code) obj[i];
        }
        return arr;
    }
}