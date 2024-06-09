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
        renderers: {
            profileButton: function(user, profileButton){
                updateProfileButton(user, profileButton);
            }
        },
        autoLogoff: false
    };

    var app;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);


      //Create windows array
        prospekt.windows = config.windows = [];


      //Instantiate app container with horizontal tabs
        app = new javaxt.express.app.Horizon(parent, config);


      //Watch for model change events
        app.onModelChangeEvent = function(op, model, id, userID){

            if (id===document.user.id){
                if (model==="User"){
                    if (op==="delete"){
                        app.logoff();
                        return;
                    }
                    else if (op==="update"){
                        get(config.url.user + "?id=" + id, {
                            success: function(text){
                                var user = JSON.parse(text);
                                document.user = merge(user, document.user);
                                if (document.user.status!==1) app.logoff();
                                else app.update(document.user);
                            }
                        });
                    }
                }
            }

        };


      //Watch for user interactions and periodically send updates to the server
        var lastUpdate;
        app.onUserInteration = function(e){
            lastUpdate = new Date().getTime();
        };
        var lastTransmission;
        setInterval(()=>{
          //Only send one update per second (max)
            if (lastTransmission && lastUpdate-lastTransmission<1000) return;
            lastTransmission = new Date().getTime();
            app.sendMessage("userActivity");
        }, 500);


      //Watch for logoff events
        app.onLogOff = function(){
            document.user = null;
        };


        me.el = app.el;
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(user){

        var tabs = [
            {name: "Home", cls: prospekt.dashboard.DashboardPanel},
            {name: "Opportunities", cls: prospekt.opportunities.OpportunitiesPanel},
            {name: "Awards", cls: prospekt.awards.AwardsPanel},
            {name: "Companies", cls: prospekt.companies.CompanyPanel}
        ];

        if (user.accessLevel===5){
            tabs.push({name: "Admin", cls: prospekt.admin.AdminPanel});
        }

        app.update(user, tabs);
    };


  //**************************************************************************
  //** updateProfileButton
  //**************************************************************************
    var updateProfileButton = function(user, profileButton){
        if (user.person){
            profileButton.innerHTML = user.person.firstName.substring(0,1);
        }
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;


    init();
};