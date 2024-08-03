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

    var tabs, editor, notes;
    var company = {};
    var userIcons = {};
    var timezone;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);

        timezone = config.timezone==null ? "America/New York" : config.timezone;
        timezone = timezone.replace(" ", "_");


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
        userIcons = {};
        tabs.raiseTab(0);
        editor.clear();
        notes.clear();
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


                    var arr = [];
                    company.info.notes.forEach((note)=>{
                        if (note.userID===document.user.id){
                            editor.update(note.html);
                        }
                        else{
                            arr.push(note);
                        }
                    });


                  //Update notes on tab change
                    var updateTab = true;
                    tabs.onTabChange = function(currTab){
                        if (currTab.name==="Shared Notes" && updateTab){
                            notes.update(arr);
                            updateTab = false;
                        }
                    };

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
        var html = editor.getValue();

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

      //Create text editor
        editor = createTextEditor();

      //Add custom save button to the toolbar
        var saveButton = createElement("button", editor.toolbar, "ql-save");
        saveButton.onclick = function(){
            me.save();
        };

      //Return editor DOM element
        return editor.el;
    };


  //**************************************************************************
  //** createList
  //**************************************************************************
    var createList = function(){

        var div = createElement("div", {
           width: "100%",
           height: "100%"
        });



        var carousel = new javaxt.dhtml.Carousel(div, {
            animate: true,
            loop: false
        });



        var listView = createElement("div", {
           width: "100%",
           height: "100%"
        });
        listView.className = "notes";
        carousel.add(listView);


        var noteView = createElement("div", {
           width: "100%",
           height: "100%"
        });
        carousel.add(noteView);


        notes = new javaxt.dhtml.DataGrid(listView, {
            style: config.style.table,
            columns: [
                {header: 'Notes', width:'100%'}
            ],
            hideHeader: true,
            update: function(row, note){
                var user = note.user;


              //Create container
                var table = createTable(row);
                table.style.height = "";
                var tr, td;

                tr = table.addRow();
                td = tr.addColumn({ verticalAlign: "top" });


              //Add icon
                var icon = createElement("div", td, "user-pic");
                if (user.info && user.info.profilePic){
                    icon.style.backgroundImage = user.info.profilePic;
                }
                else{
                    icon.innerText = user.firstName.substring(0,1);
                }


                td = tr.addColumn({ width: "100%", verticalAlign: "top" });


              //Add header
                var header = createElement("div", td, {
                    display: "inline-block",
                    width: "100%"
                });
                header.className = "note-header";


              //Add name to the header
                var name = createElement("div", header, "user-name");
                name.style.display = "inline-block";
                name.style.float = "left";
                name.innerText = getName(user);


              //Add date to the header
                var date = createElement("div", header, "note-date");
                date.style.display = "inline-block";
                date.style.float = "left";
                date.style.marginLeft = "7px";
                var now = moment(new Date());
                var lastUpdate = moment(new Date(note.updated));
                var duration = moment.duration(now.diff(lastUpdate));
                var hours = Math.floor(duration.asHours());
                if (hours<1) hours = 1;
                if (hours<24) date.innerText = hours + "h";
                else date.innerText = moment.tz(lastUpdate, timezone).format("MMM D");


              //Add body
                var body = createElement("div", td, "note-preview");
                body.innerHTML = note.html;

                row.set("Notes", table);
            }
        });

var waitmask;

      //Custom update method. Note that this performs full refresh (very lazy approach)
        notes.update = function(arr){

            notes.clear();
            carousel.back();
            if (!arr || arr.length===0) return;


            if (!waitmask) waitmask = new javaxt.express.WaitMask(div);
            waitmask.show(500);


          //Generate a unique list of user IDs
            var userIDs = new Set();
            arr.forEach((note)=>{
                userIDs.add(note.userID);
            });


          //Get user names and update the grid
            get("users?id="+ Array.from(userIDs).join(",") +
                "&active=true&fields=id,firstName,lastName,info", {
                success: function(str){
                    var users = parseResponse(str);

                    arr.forEach((note)=>{
                        for (var i=0; i<users.length; i++){
                            if (users[i].id==note.userID){
                                note.user = users[i];
                                break;
                            }
                        }
                    });


                    notes.load(arr, 1);
                },
                finally: function(){
                    waitmask.hide();
                }
            });
        };





        var table = createTable(noteView);
        var toolbar = table.addRow().addColumn("ql-toolbar ql-snow");
        var backButton = createButton(toolbar, {
            label: "Back",
            icon: "fas fa-arrow-left"
        });
        backButton.onClick = function(){
            carousel.back();
        };
        var userInfo = createElement("div", toolbar, {
            float: "right"
        });
        userInfo.className = "notes user-info";
        var tr = createTable(userInfo).addRow();
        var lt = tr.addColumn();
        var rt = tr.addColumn();

        var panel = createOverflowPanel(table.addRow().addColumn({
            width: "100%",
            height: "100%",
            padding: "0 0px 20px 15px"
        }));
        var innerDiv = panel.innerDiv;



        notes.onRowClick = function(row){
            var note = row.record;
            notes.deselectAll();
            innerDiv.innerHTML = "";
            lt.innerHTML = "";
            rt.innerHTML = "";


            var name = row.getElementsByClassName("user-name")[0].cloneNode(true);
            var date = row.getElementsByClassName("note-date")[0].cloneNode(true);
            var icon = row.getElementsByClassName("user-pic")[0].cloneNode(true);

            name.style = "";
            date.style = "";
            date.innerText = moment.tz(note.updated, timezone).format("M/D/YYYY h:mm A");

            carousel.next();

            setTimeout(()=>{
                innerDiv.innerHTML = note.html;

                lt.appendChild(name);
                lt.appendChild(date);
                rt.appendChild(icon);

                panel.update();

            },800);

        };


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


    var createOverflowPanel = prospekt.utils.createOverflowPanel;
    var createTextEditor = prospekt.utils.createTextEditor;
    var parseResponse = prospekt.utils.parseResponse;
    var createButton = prospekt.utils.createButton;
    var getName = prospekt.utils.getName;

    init();
};