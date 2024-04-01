if(!prospekt) var prospekt={};
if(!prospekt.admin) prospekt.admin={};

//******************************************************************************
//**  SQL View
//******************************************************************************
/**
 *   Panel used to query a database using SQL
 *
 ******************************************************************************/

prospekt.admin.SQLView = function(parent, config) {

    var me = this;
    var defaultConfig = {

    };

    var dbView, dbPicker, waitmask;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

      //Parse config
        config = merge(config, defaultConfig);
        if (!config.style) config.style = javaxt.dhtml.style.default;

        if (!config.waitmask) config.waitmask = new javaxt.express.WaitMask(document.body);
        waitmask = config.waitmask;



        dbView = new javaxt.express.DBView(parent, {
            waitmask: waitmask,
            style:{
                container: {
                    width: "100%",
                    height: "100%",
                    background: "#fff"
                },
                leftPanel: {
                    background: "#dcdcdc",
                    borderRight: "1px solid #383b41"
                },
                table: config.style.table,
                toolbarButton: config.style.toolbarButton
            },
            getTables: getTables,
            createJob: createJob,
            cancelJob: cancelJob,
            getJob: getJob
        });


        var toolbar = dbView.getComponents().toolbar;
        var t = createElement("div", {
            width: "250px",
            //height: "100%",
            display: "inline-block"
        });
        toolbar.insertBefore(t, toolbar.childNodes[0]);

        var tr = createTable(t).addRow();
        tr.addColumn({"paddingRight": "5px"}).innerText = "Database:";
        dbPicker = new javaxt.dhtml.ComboBox(tr.addColumn(), config);
        dbPicker.add("Awards", "awards");
        dbPicker.add("Local", "local");
        dbPicker.setValue("local", true);
        dbPicker.onChange = function(label, value){
            dbView.getComponents().tree.clear();
            getTables();
        };

        createSpacer(tr.addColumn());



        me.el = dbView.el;
        addShowHide(me);
    };


  //**************************************************************************
  //** notify
  //**************************************************************************
    this.notify = function(op, model, id, userID){
        if (model==="SQL" && userID===document.user.id){
            console.log(op, model, id, userID);
        }
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        dbView.clear();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(){
        console.log("update!");
    };


  //**************************************************************************
  //** getTables
  //**************************************************************************
  /** Custom function to get tables. Overrides the native getTables method
   *  in dbView
   */
    var getTables = function(){

        if (!dbPicker){
            setTimeout(getTables, 200);
            return;
        }


        var database = dbPicker.getValue();
        if (!database) database = "";


        waitmask.show(500);
        return get("sql/tables/", {
            payload: JSON.stringify({
                database: database
            }),
            success: function(text){
                waitmask.hide();

              //Parse response
                var tables = JSON.parse(text).tables;


              //Add nodes to the tree
                dbView.getComponents().tree.addNodes(tables);

            },
            failure: function(request){
                waitmask.hide();
                alert(request);
            }
        });

    };


  //**************************************************************************
  //** createJob
  //**************************************************************************
  /** Custom function used to create a query job
   */
    var createJob = function(payload, requestConfig){

        var database = dbPicker.getValue();
        if (!database) database = "";

        payload.database = database;

        return post("sql/job/", JSON.stringify(payload), requestConfig);
    };


  //**************************************************************************
  //** cancelJob
  //**************************************************************************
    var cancelJob = function(jobID, requestConfig){

        var database = dbPicker.getValue();
        if (!database) database = "";

        return del("sql/job/" + jobID + "?database=" + database, requestConfig);
    };


  //**************************************************************************
  //** getJob
  //**************************************************************************
    var getJob = function(jobID, requestConfig){

        var database = dbPicker.getValue();
        if (!database) database = "";

        return get("sql/job/" + jobID + "?database=" + database, requestConfig);
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var merge = javaxt.dhtml.utils.merge;
    var del = javaxt.dhtml.utils.delete;
    var post = javaxt.dhtml.utils.post;
    var get = javaxt.dhtml.utils.get;

    var createSpacer = prospekt.utils.createSpacer;

    init();
};