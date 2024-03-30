if(!prospekt) var prospekt={};

//******************************************************************************
//**  Application
//******************************************************************************
/**
 *   Primary user interface for the app.
 *
 ******************************************************************************/

prospekt.Application = function(parent, config) {

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var waitmask;
    var auth = new javaxt.dhtml.Authentication("login", "logoff");
    var currUser;
    var ws; //web socket listener

  //Header components
    var profileButton, menuButton; //header buttons
    var mainMenu, profileMenu;
    var callout;


    var body;
    var tabs = {};
    var panels = {};
    var windows = [];


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);


      //Set global configuration variables
        if (!config.fx) config.fx = new javaxt.dhtml.Effects();

        if (!config.waitmask) config.waitmask = new javaxt.express.WaitMask(document.body);
        waitmask = config.waitmask;

        prospekt.windows = windows;


      //Prevent native browser shortcuts (ctrl+a,h,o,p,s,...)
        document.addEventListener("keydown", function(e){
            if ((e.keyCode == 65 || e.keyCode == 72 || e.keyCode == 79 || e.keyCode == 80 || e.keyCode == 83) &&
            (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
                e.preventDefault();
                e.stopPropagation();
            }
        });


      //Create main table
        var table = createTable(parent);


      //Create header
        createHeader(table.addRow().addColumn("app-header"));


      //Create tabs
        createTabs(table.addRow().addColumn("app-nav-bar"));


      //Create body
        createBody(table.addRow().addColumn({
            height: "100%"
        }));


      //Create footer
        createFooter(table.addRow().addColumn());


        me.el = table;
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(user){
        updateUser(user);

        //if (cart) cart.clear();


      //Create web socket listener
        if (!ws) ws = new javaxt.dhtml.WebSocket({
            url: "/ws",
            onMessage: function(msg){

                var arr = msg.split(",");
                var op = arr[0];
                var model = arr[1];
                var id = arr[2];
                var userID = arr[3];


              //Parse id as needed
                if (id.indexOf("_")===-1){
                    try { id = parseInt(id); } catch(e) {}
                }


              //Parse userID
                try { userID = parseInt(userID); } catch(e) {}


              //Process event
                processEvent(op, model, id, userID);


              //Dispatch event to other panels
                for (var key in panels) {
                    if (panels.hasOwnProperty(key)){
                        var panel = panels[key];
                        if (panel.notify) panel.notify(op, model, id, userID);
                    }
                }

            }
        });
    };


  //**************************************************************************
  //** updateUser
  //**************************************************************************
    var updateUser = function(user){
        currUser = user;
        document.title = "Prospekt";
        if (user.person){
            profileButton.innerHTML = user.person.firstName.substring(0,1);
        }



      //Show hide admin tab
        if (user.accessLevel===5){
            tabs["Admin"].show();
        }
        else{
            tabs["Admin"].hide();
        }


      //Get active tab
        var currTab;
        for (var key in tabs) {
            if (tabs.hasOwnProperty(key)){
                var tab = tabs[key];
                if (tab.isVisible() && tab.className==="active"){
                    currTab = tab;
                    break;
                }
            }
        }



      //Get user preferences
        user.preferences = new prospekt.user.Preferences(()=>{

          //Click on user's last tab
            if (!currTab) currTab = user.preferences.get("Tab");
            if (currTab){
                tabs[currTab].click();
            }
            else{
                tabs["Home"].click();
            }
        });


    };


  //**************************************************************************
  //** processEvent
  //**************************************************************************
    var processEvent = function(op, model, id, userID){

        if (model==="User" && id===document.user.id){
            if (op==="delete") logoff();
            else if (op==="update"){
                get("user?id=" + id, {
                    success: function(text){
                        var user = JSON.parse(text);
                        document.user = merge(user, document.user);
                        if (document.user.status!==1) logoff();
                        else updateUser(document.user);
                    }
                });
            }
        }
    };


  //**************************************************************************
  //** showDashboard
  //**************************************************************************
    var showDashboard = function(){
        var dashboardPanel = panels["Dashboard"];

        Object.values(panels).forEach((panel)=>{
            if (panel===dashboardPanel) return;
            panel.hide();
        });


        if (dashboardPanel){
            dashboardPanel.show();
        }
        else{
            dashboardPanel = new prospekt.dashboard.DashboardPanel(body, config);
            panels["Dashboard"] = dashboardPanel;
        }
    };


  //**************************************************************************
  //** showOpportunities
  //**************************************************************************
    var showOpportunities = function(){
        var opportunitiesPanel = panels["Opportunities"];

        Object.values(panels).forEach((panel)=>{
            if (panel===opportunitiesPanel) return;
            panel.hide();
        });


        if (opportunitiesPanel){
            opportunitiesPanel.show();
        }
        else{
            opportunitiesPanel = new prospekt.opportunities.OpportunitiesPanel(body, config);
            panels["Opportunities"] = opportunitiesPanel;
        }
    };


  //**************************************************************************
  //** showAwards
  //**************************************************************************
    var showAwards = function(){
        var awardsPanel = panels["Awards"];

        Object.values(panels).forEach((panel)=>{
            if (panel===awardsPanel) return;
            panel.hide();
        });


        if (awardsPanel){
            awardsPanel.show();
        }
        else{
            awardsPanel = new prospekt.awards.AwardsPanel(body, config);
            panels["Awards"] = awardsPanel;
        }
    };


  //**************************************************************************
  //** showAdmin
  //**************************************************************************
    var showAdmin = function(){
        var adminPanel = panels["Admin"];

        Object.values(panels).forEach((panel)=>{
            if (panel===adminPanel) return;
            panel.hide();
        });


        if (adminPanel){
            adminPanel.show();
        }
        else{
            adminPanel = new prospekt.admin.AdminPanel(body, config);
            panels["Admin"] = adminPanel;
        }
    };


  //**************************************************************************
  //** createHeader
  //**************************************************************************
    var createHeader = function(parent){

        var tr = createTable(parent).addRow();
        var td;


        td = tr.addColumn();
        createElement("div", td, "app-header-icon noselect");
        td.style.cursor = "pointer";
        //td.onclick = fn;


        td = tr.addColumn();
        td.style.width = "100%";


      //Create profile button
        td = tr.addColumn();
        profileButton = createElement("div", td, "app-header-profile noselect");
        profileButton.onclick = function(e){
            if (currUser) showMenu(getProfileMenu(), this);
        };
        addShowHide(profileButton);


      //Create menu button
        td = tr.addColumn();
        menuButton = createElement("div", td, "app-header-menu noselect");
        createElement("i", menuButton, "fas fa-ellipsis-v");
        menuButton.onclick = function(e){
            if (currUser) showMenu(getMainMenu(), this);
        };
        addShowHide(menuButton);
    };


  //**************************************************************************
  //** createTabs
  //**************************************************************************
    var createTabs = function(parent){
        var div = createElement("div", parent, "app-tab-container");

        var addTab = function(label, fn){
            var tab = createElement("div", div);
            tab.innerText = label;
            tab.onclick = function(){
                if (this.className==="active") return;
                hideWindows();
                for (var i=0; i<div.childNodes.length; i++){
                    div.childNodes[i].className = "";
                }
                this.className = "active";
                if (fn){
                    fn.apply(me, []);
                }
                document.user.preferences.set("Tab", label);
            };
            tabs[label] = tab;
            addShowHide(tab);
        };

        addTab("Home", showDashboard);
        addTab("Opportunities", showOpportunities);
        addTab("Awards", showAwards);
        addTab("Admin", showAdmin);
    };


  //**************************************************************************
  //** createBody
  //**************************************************************************
    var createBody = function(parent){
        body = parent;
    };


  //**************************************************************************
  //** createFooter
  //**************************************************************************
    var createFooter = function(parent){

    };


  //**************************************************************************
  //** showMenu
  //**************************************************************************
    var showMenu = function(menu, target){

        var numVisibleItems = 0;
        for (var i=0; i<menu.childNodes.length; i++){
            var menuItem = menu.childNodes[i];
            if (menuItem.isVisible()) numVisibleItems++;
        }
        if (numVisibleItems===0){
            return;
        }

        var callout = getCallout();
        var innerDiv = callout.getInnerDiv();
        while (innerDiv.firstChild) {
            innerDiv.removeChild(innerDiv.lastChild);
        }
        innerDiv.appendChild(menu);

        var rect = javaxt.dhtml.utils.getRect(target);
        var x = rect.x + (rect.width/2);
        var y = rect.y + rect.height + 3;
        callout.showAt(x, y, "below", "right");
    };


  //**************************************************************************
  //** getProfileMenu
  //**************************************************************************
    var getProfileMenu = function(){
        if (!profileMenu){
            var div = createElement("div", "app-menu");
            div.appendChild(createMenuOption("Account Settings", "edit", function(){
                console.log("Show Accout");
            }));
            div.appendChild(createMenuOption("Sign Out", "times", function(){
                logoff();
            }));
            profileMenu = div;
        }
        return profileMenu;
    };


  //**************************************************************************
  //** createMenuOption
  //**************************************************************************
    var createMenuOption = function(label, icon, onClick){
        var div = createElement("div", "app-menu-item noselect");
        if (icon && icon.length>0){
            div.innerHTML = '<i class="fas fa-' + icon + '"></i>' + label;
        }
        else{
            div.innerHTML = label;
        }
        div.label = label;
        div.onclick = function(){
            callout.hide();
            onClick.apply(this, [label]);
        };
        addShowHide(div);
        return div;
    };


  //**************************************************************************
  //** hideWindows
  //**************************************************************************
    var hideWindows = function(){
        windows.forEach((window)=>{
            window.hide();
        });
    };


  //**************************************************************************
  //** logoff
  //**************************************************************************
    var logoff = function(){
        waitmask.show();
        currUser = null;

      //Stop websocket listener
        if (ws){
            ws.stop();
            ws = null;
        }

        hideWindows();


//      //Delete dashboards
//        for (var i in panels){
//            destroy(panels[i].app);
//        }
//        apps = [];
//        currApp = null;
//
//      //Delete admin panel
//        if (adminPanel){
//            adminPanel.clear();
//            destroy(adminPanel);
//            adminPanel = null;
//        }


      //Remove menus
        if (mainMenu){
            var parent = mainMenu.parentNode;
            if (parent) parent.removeChild(mainMenu);
            mainMenu = null;
        }
        if (profileMenu){
            var parent = profileMenu.parentNode;
            if (parent) parent.removeChild(profileMenu);
            profileMenu = null;
        }


      //Logoff
        auth.logoff(function(){
            document.user = null;
            var pageLoader = new javaxt.dhtml.PageLoader();
            pageLoader.loadPage("index.html", function(){
                waitmask.hide();
            });
        });
    };


  //**************************************************************************
  //** getCallout
  //**************************************************************************
    var getCallout = function(){
        if (callout){
            var parent = callout.el.parentNode;
            if (!parent){
                callout.el.innerHTML = "";
                callout = null;
            }
        }
        if (!callout) callout = new javaxt.dhtml.Callout(document.body,{
            style: config.style.callout
        });
        return callout;
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var onRender = javaxt.dhtml.utils.onRender;
    var destroy = javaxt.dhtml.utils.destroy;
    var isArray = javaxt.dhtml.utils.isArray;
    var merge = javaxt.dhtml.utils.merge;
    var get = javaxt.dhtml.utils.get;


    init();
};