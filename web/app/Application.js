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
    };

    var app;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);


      //Create windows array
        prospekt.windows = [];


      //Instantiate app container with horizontal tabs
        app = new javaxt.express.app.Horizon(parent, {
            name: "Prospekt",
            tabs: {
                "Home": prospekt.dashboard.DashboardPanel,
                "Opportunities": prospekt.opportunities.OpportunitiesPanel,
                "Awards": prospekt.awards.AwardsPanel,
                "Companies": prospekt.companies.CompanyPanel,
                "Admin": prospekt.admin.AdminPanel
            },
            windows: prospekt.windows
        });


        me.el = app.el;
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(user){
        app.update(user);
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;


    init();
};