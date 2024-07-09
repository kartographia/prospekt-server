if(!prospekt) var prospekt={};
if(!prospekt.companies) prospekt.companies={};

//******************************************************************************
//**  Company Notes
//*****************************************************************************/
/**
 *   Panel used to create/view notes
 *
 ******************************************************************************/

prospekt.companies.CompanyNotes = function(parent, config) {
    this.className = "prospekt.companies.CompanyNotes";

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var tabs, quill;
    var company;

  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);


        tabs = new javaxt.dhtml.TabPanel(parent, {
            style: config.style.tabPanel
        });
        tabs.addTab("My Notes", createEditor());
        tabs.addTab("Shared Notes", createList());
        tabs.raiseTab(0);


        me.el = tabs.el;
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        company = {};
        tabs.raiseTab(0);
        quill.setText("");
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(companyID, callback){
        me.clear();

        get("company?id=" + companyID, {
            success: function(text){
                company = parseResponse(text);

                if (company.info && company.info.notes){
                    company.info.notes.forEach((note)=>{
                        if (note.userID===document.user.id){
                            quill.clipboard.dangerouslyPasteHTML(0, note.html);
                        }
                    });
                }

                if (callback) callback.apply(me, []);
            },
            failure: function(request){
                alert(request);
            }
        });
    };


  //**************************************************************************
  //** save
  //**************************************************************************
    this.save = function(callback){
        var html = quill.getSemanticHTML();
        if (!html) html = "";
        else html = html.trim();


        if (!company.info) company.info = {};
        if (!company.info.notes) company.info.notes = [];


        var note;
        company.info.notes.forEach((n)=>{
            if (n.userID===document.user.id){
                note = n;
            }
        });

        if (!note){
            note = {
                userID: document.user.id,
                created: new Date().getTime()
            };
            company.info.notes.push(note);
        }

        note.html = html;
        note.updated = new Date().getTime();

        post("UpdateCompanyInfo?id=" + company.id, company.info, {
            success: function(str){
                if (callback) callback.apply(me, []);
            },
            failure: function(request){
                alert(request);
            }
        });
    };


  //**************************************************************************
  //** createEditor
  //**************************************************************************
    var createEditor = function(){

        var table = createTable();
        var toolbar = table.addRow().addColumn();
        var body = table.addRow().addColumn({
            width: "100%",
            height: "100%",
            border: "0 none"
        });


        [
            'bold','italic','underline',
            { list: 'ordered' }, { list: 'bullet' }

        ].forEach((option)=>{

            if (isArray(option)){

            }
            else{
                var key, val;

                if (isString(option)){
                    key = option;
                }
                else{
                    key = Object.keys(option)[0];
                    val = option[key];
                }

                var btn = createElement("button", toolbar, "ql-"+key);
                if (val) btn.value = val;
            }

        });


        quill = new Quill(body, {
            theme: 'snow',
            modules: {
                toolbar: toolbar
            }
        });

        return table;
    };


  //**************************************************************************
  //** createList
  //**************************************************************************
    var createList = function(){

        var div = createElement("div", {
           width: "100%",
           height: "100%"
        });

        return div;
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var isString = javaxt.dhtml.utils.isString;
    var isDirty = javaxt.dhtml.utils.isDirty;
    var isArray = javaxt.dhtml.utils.isArray;
    var merge = javaxt.dhtml.utils.merge;
    var post = javaxt.dhtml.utils.post;
    var get = javaxt.dhtml.utils.get;


    var parseResponse = prospekt.utils.parseResponse;

    init();
};