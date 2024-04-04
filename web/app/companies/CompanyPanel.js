if(!prospekt) var prospekt={};
if(!prospekt.companies) prospekt.companies={};

//******************************************************************************
//**  Company Panel
//*****************************************************************************/
/**
 *   Panel that appears on the homepage
 *
 ******************************************************************************/

prospekt.companies.CompanyPanel = function(parent, config) {

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var companyProfile;

  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);

        var div = createElement("div", parent, "awards-panel center");

        companyProfile = new prospekt.companies.CompanyProfile(div, config);

        get("company?id=" + 1, {
            success: function(text){
                var company = parseResponse(text);
                companyProfile.update(company);
            },
            failure: function(request){
                alert(request);
            }
        });



        me.el = div;
        addShowHide(me);
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var merge = javaxt.dhtml.utils.merge;
    var get = javaxt.dhtml.utils.get;

    var parseResponse = prospekt.utils.parseResponse;

    init();

};