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
    var waitmask;
    var auth = new javaxt.dhtml.Authentication("login", "logoff");
    var currUser;
    var ws; //web socket listener

  //Header components
    var profileButton, menuButton; //header buttons
    var mainMenu, profileMenu;
    var callout;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){
      //Set global configuration variables
        if (!config) config = {};
        if (!config.fx) config.fx = new javaxt.dhtml.Effects();
        if (!config.style) config.style = javaxt.dhtml.style.default;
        if (!config.waitmask) config.waitmask = new javaxt.express.WaitMask(document.body);
        waitmask = config.waitmask;
        if (!waitmask.el.parentNode) document.body.appendChild(waitmask.el);
        if (!config.dataStores) config.dataStores = {};



      //Prevent native browser shortcuts (ctrl+a,h,o,p,s,...)
        document.addEventListener("keydown", function(e){
            if ((e.keyCode == 65 || e.keyCode == 72 || e.keyCode == 79 || e.keyCode == 80 || e.keyCode == 83) &&
            (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
                e.preventDefault();
                e.stopPropagation();
            }
        });


      //Create main table
        var table = createTable();
        var tbody = table.firstChild;
        var tr, td;


      //Create header nav
        tr = document.createElement("tr");
        tbody.appendChild(tr);
        td = document.createElement("td");
        tr.appendChild(td);
        createHeader(td);



      //Create body
        tr = document.createElement("tr");
        tbody.appendChild(tr);
        td = document.createElement("td");
        td.style.height = "100%";
        tr.appendChild(td);
        createBody(td);


      //Create footer
        tr = document.createElement("tr");
        tbody.appendChild(tr);
        td = document.createElement("td");
        tr.appendChild(td);
        createFooter(td);


        parent.appendChild(table);
        me.el = table;
    };


    this.update = function(user){
        currUser = user;
        document.title = "Prospekt";
        profileButton.innerHTML = user.username.substring(0,1);
    };


    var createHeader = function(parent){
        var div = document.createElement("div");
        div.className = "app-header";
        parent.appendChild(div);


        var table = createTable();
        var tbody = table.firstChild;
        var tr = document.createElement("tr");
        tbody.appendChild(tr);
        var td;



        td = document.createElement("td");
        tr.appendChild(td);
        var icon = document.createElement("div");
        icon.className = "app-header-icon noselect";
        td.appendChild(icon);
        td.style.cursor = "pointer";
        //td.onclick = fn;


        td = document.createElement("td");
        td.style.width = "100%";
        tr.appendChild(td);

      //Create profile button
        td = document.createElement("td");
        tr.appendChild(td);
        profileButton = document.createElement("div");
        profileButton.className = "app-header-profile noselect";
        profileButton.onclick = function(e){
            if (currUser) showMenu(getProfileMenu(), this);
        };
        addShowHide(profileButton);
        td.appendChild(profileButton);


      //Create menu button
        td = document.createElement("td");
        tr.appendChild(td);
        menuButton = document.createElement("div");
        menuButton.className = "app-header-menu noselect";
        var icon = document.createElement("i");
        icon.className = "fas fa-ellipsis-v";
        menuButton.appendChild(icon);
        menuButton.onclick = function(e){
            if (currUser) showMenu(getMainMenu(), this);
        };
        addShowHide(menuButton);
        td.appendChild(menuButton);


        div.appendChild(table);
    };

    var createBody = function(parent){

    };


    var createFooter = function(parent){

    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createTable = javaxt.dhtml.utils.createTable;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var isArray = javaxt.dhtml.utils.isArray;
    var onRender = javaxt.dhtml.utils.onRender;
    var destroy = javaxt.dhtml.utils.destroy;
    var get = javaxt.dhtml.utils.get;


    init();
};