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
        tabs: {
            "Home": prospekt.dashboard.DashboardPanel,
            "Opportunities": prospekt.opportunities.OpportunitiesPanel,
            "Awards": prospekt.awards.AwardsPanel,
            "Companies": prospekt.companies.CompanyPanel,
            "Admin": prospekt.admin.AdminPanel
        },
        renderers: {
            profileButton: function(user, profileButton){
                updateProfileButton(user, profileButton);
            }
        }
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
        app.update(user);
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