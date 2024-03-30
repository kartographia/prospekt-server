if(!prospekt) var prospekt={};
if(!prospekt.awards) prospekt.awards={};

//******************************************************************************
//**  Awards Panel
//*****************************************************************************/
/**
 *   Panel that appears on the homepage
 *
 ******************************************************************************/

prospekt.awards.AwardsPanel = function(parent, config) {

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        var div = createElement("div", parent);
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

    init();

};