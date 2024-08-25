if(!prospekt) var prospekt={};
if(!prospekt.admin) prospekt.admin={};


//******************************************************************************
//**  AdminPanel
//******************************************************************************
/**
 *   Panel used to render admin components (e.g. UserList)
 *
 ******************************************************************************/

prospekt.admin.AdminPanel = function(parent, config) {

    var me = this;
    var defaultConfig = {

    };
    var waitmask;
    var sidebar, mainPanel, landingPage;
    var panel = {};
    var userAdmin;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

      //Parse config
        config = merge(config, defaultConfig);
        if (!config.style) config.style = javaxt.dhtml.style.default;
        if (!config.waitmask) config.waitmask = new javaxt.express.WaitMask(document.body);
        waitmask = config.waitmask;


      //Create table
        var table = createTable(parent);
        table.className = "admin-panel";
        var tr = table.addRow();
        var td;


      //Create side bar
        td = tr.addColumn({
            height: "100%"
        });
        sidebar = createElement("div", td, "admin-sidebar");
        sidebar.style.height = "100%";



      //Create main panel
        mainPanel = tr.addColumn({
            width: "100%",
            height: "100%"
        });



      //Create landing page
        landingPage = createElement("div", mainPanel, "admin-landing-page noselect");
        landingPage.className = "admin-landing-page noselect";
        landingPage.innerHTML = '<i class="fas fa-cogs"></i>';

        addShowHide(landingPage);


      //Create panels
        createPanel("Users", "fas fa-users", prospekt.admin.UserAdmin, config);
        createPanel("Database", "fas fa-database", prospekt.admin.SQLView, config);
        createPanel("Config", "fas fa-sliders-h", prospekt.admin.ConfigAdmin, config);
        createPanel("Files", "fas fa-folder", prospekt.admin.FileAdmin, config);


        me.el = table;
        addShowHide(me);
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){

        for (var key in panel) {
            var app = panel[key].app;
            if (app && app.clear) app.clear();
        }

    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(){

    };


  //**************************************************************************
  //** notify
  //**************************************************************************
    this.notify = function(op, model, id, userID){
        for (var key in panel) {
            var app = panel[key].app;
            if (app && app.notify) app.notify(op, model, id, userID);
        }
    };


  //**************************************************************************
  //** raisePanel
  //**************************************************************************
    this.raisePanel = function(name){
        landingPage.hide();

        for (var key in panel) {
            if (key!==name) panel[key].body.hide();
            panel[key].button.className =
            panel[key].button.className.replace(" selected","").trim();
        }

        var p = panel[name];
        p.body.show();
        if (!p.app){
            var cls = eval(p.className);
            if (cls){
                mainPanel.appendChild(p.body);
                p.app = new cls(p.body, p.config);
                if (p.app.update) p.app.update();
                if (p.app instanceof prospekt.admin.UserAdmin){
                    userAdmin = p.app;
                }
            }
        }
        p.button.className += " selected";
    };


  //**************************************************************************
  //** createPanel
  //**************************************************************************
    var createPanel = function(name, icon, className, config){
        var button = createElement("div", sidebar, icon + " noselect");
        button.onclick = function(){
            me.raisePanel(name);
        };

        var body = createElement("div", {
            height: "100%"
        });
        addShowHide(body);
        body.hide();


        panel[name] = {
           button: button,
           body: body,
           className: className,
           config: config,
           app: null
        };

    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var merge = javaxt.dhtml.utils.merge;

    init();
};