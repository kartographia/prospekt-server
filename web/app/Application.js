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
        name: "Prospekt",
        style: javaxt.dhtml.style.default
    };

    var waitmask;
    var auth = new javaxt.dhtml.Authentication("login", "logoff");
    var currUser;

  //Web socket stuff
    var ws; //web socket listener
    var connected = false;
    var communicationError;


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
                if (id.indexOf("_")===-1 && id.indexOf("-")===-1){
                    try {
                        var i = parseInt(id);
                        if (!isNaN(i)) id = i;
                    }
                    catch(e) {}
                }


              //Parse userID
                try { userID = parseInt(userID); } catch(e) {}


              //Process event
                processEvent(op, model, id, userID);


            },
            onConnect: function(){
                if (!connected){
                    connected = true;
                    processEvent("connect", "WebSocket", -1, -1);
                }
            },
            onDisconnect: function(){
                if (connected){
                    connected = false;
                    processEvent("disconnect", "WebSocket", -1, -1);
                }
            }
        });
    };


  //**************************************************************************
  //** updateUser
  //**************************************************************************
    var updateUser = function(user){
        currUser = user;
        document.title = config.name + " - Home";
        if (user.person){
            profileButton.innerHTML = user.person.firstName.substring(0,1);
        }


      //Watch for forward and back events via a 'popstate' listener
        enablePopstateListener();


      //Show/hide admin tab
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
            if (currTab && tabs[currTab]){
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
  /** Used to process web socket events and dispatch them to other panels as
   *  needed
   */
    var processEvent = function(op, model, id, userID){


      //Process event
        if (model==="WebSocket"){
            if (currUser){
                if (op==="connect"){
                    if (communicationError) communicationError.hide();
                }
                else{
                    if (!communicationError) createErrorMessage();
                    communicationError.show();
                }
            }
            else{
                //logout initiated
            }
        }
        else if (model==="WebFile"){
            if (currUser && currUser.preferences){
                var autoReload = currUser.preferences.get("AutoReload");
                if (autoReload===true || autoReload==="true"){
                    console.log("reload!");
                    location.reload();
                }
                else{
                    console.log("prompt to reload!");
                    location.reload();
                }
            }
        }
        else{
            if (id===document.user.id){
                if (model==="User"){
                    if (op==="delete"){
                        logoff();
                        return;
                    }
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
            }
        }



      //Dispatch event to other panels
        for (var key in panels) {
            if (panels.hasOwnProperty(key)){
                var panel = panels[key];
                if (panel.notify) panel.notify(op, model, id, userID);
            }
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

        var addTab = function(label, className){
            var tab = createElement("div", div);
            tab.innerText = label;

            var fn = function(){
                var panel = panels[label];

                Object.values(panels).forEach((p)=>{
                    if (p===panel) return;
                    p.hide();
                });


                if (panel){
                    panel.show();
                }
                else{
                    var cls = eval(className);
                    panel = new cls(body, config);
                    panels[label] = panel;
                }
            };


            tab.raise = function(){
                if (this.className==="active") return;
                hideWindows();
                for (var i=0; i<div.childNodes.length; i++){
                    div.childNodes[i].className = "";
                }
                this.className = "active";
                fn.apply(me, []);
                document.title = config.name + " - " + label;
                document.user.preferences.set("Tab", label);
            };


            tab.onclick = function(){
                if (this.className==="active") return;
                this.raise();

                var panel = window.history.state;
                panel.label = label;
                panel.popID++;

                var url = ""; //window.location.href;
                history.pushState(panel, document.title, url);
            };

            tabs[label] = tab;
            addShowHide(tab);
        };

        addTab("Home", prospekt.dashboard.DashboardPanel);
        addTab("Opportunities", prospekt.opportunities.OpportunitiesPanel);
        addTab("Awards", prospekt.awards.AwardsPanel);
        addTab("Companies", prospekt.companies.CompanyPanel);
        addTab("Admin", prospekt.admin.AdminPanel);
    };


  //**************************************************************************
  //** enablePopstateListener
  //**************************************************************************
    var enablePopstateListener = function(){
        disablePopstateListener();
        window.addEventListener('popstate', popstateListener);

      //Set initial history. This is critical for the popstate listener
        if (window.history.state==null){
            history.replaceState({}, null, '');
        }
    };


  //**************************************************************************
  //** disablePopstateListener
  //**************************************************************************
    var disablePopstateListener = function(){
        window.removeEventListener('popstate', popstateListener);
    };


  //**************************************************************************
  //** popstateListener
  //**************************************************************************
  /** Used to processes forward and back events from the browser
   */
    var popstateListener = function(e) {
        var obj = e.state;
        var label = obj.label;
        var tab = tabs[label];
        tab.raise();
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
  //** createErrorMessage
  //**************************************************************************
  /** Used to create a communications error message
   */
    var createErrorMessage = function(){

      //Create main div
        var div = createElement("div", parent, {
            position: "absolute",
            top: "10px",
            width: "100%",
            display: "none"
        });


      //Create show/hide functions
        var fx = config.fx;
        var transitionEffect = "ease";
        var duration = 1000;
        var isVisible = false;

        div.show = function(){
            if (isVisible) return;
            isVisible = true;
            fx.fadeIn(div, transitionEffect, duration, function(){

            });
        };
        div.hide = function(){
            if (!isVisible) return;
            isVisible = false;
            fx.fadeOut(div, transitionEffect, duration/2, function(){

            });
        };
        div.isVisible = function(){
            return isVisible;
        };


      //Add content
        var error = createElement("div", div, "communication-error center");
        createElement("div", error, "icon");
        createElement("div", error, "title").innerText = "Connection Lost";
        createElement("div", error, "message").innerText =
        "The connection to the server has been lost. The internet might be down " +
        "or there might be a problem with the server. Don't worry, this app will " +
        "automatically reconnect once the issue is resolved.";


      //Add main div to windows array so it closes automatically on logoff
        windows.push(div);
        communicationError = div;
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


        disablePopstateListener();


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