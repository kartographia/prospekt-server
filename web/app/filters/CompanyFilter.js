if(!prospekt) var prospekt={};
if(!prospekt.filters) prospekt.filters={};


//******************************************************************************
//**  Company Filter
//******************************************************************************
/**
 *   Used to define a filter for company specific fields (e.g. likes)
 *
 ******************************************************************************/

prospekt.filters.CompanyFilter = function(parent, config) {


    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var inputs = {};


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);

        var div = createElement("div", parent, "more-filter");


        createElement("h3", div).innerText = "Company Rating";
        var checkbox = new javaxt.dhtml.Checkbox(div, {
            label: "Has Likes",
            style: config.style.checkbox
        });
        inputs["likes"] = {
            getValue: function(){
                return checkbox.isChecked() ? ">0" : null;
            },
            setValue: function(likes){
                if (likes===">0"){
                    checkbox.select(true);
                }
                else{
                    checkbox.deselect(true);
                }
            }
        };


        me.el = div;
        addShowHide(me);
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        for (var key in inputs) {
            if (inputs.hasOwnProperty(key)){
                var input = inputs[key];
                if (input.setValue) input.setValue("", true);
            }
        }
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(filter){
        me.clear();
        if (!filter) filter = {};
        for (var key in filter) {
            if (filter.hasOwnProperty(key)){
                var val = filter[key];
                var input = inputs[key];
                if (input.setValue) input.setValue(val, true);
            }
        }
    };


  //**************************************************************************
  //** getValues
  //**************************************************************************
    this.getValues = function(){

        var values = {};

        for (var key in inputs) {
            if (inputs.hasOwnProperty(key)){
                var input = inputs[key];
                if (input.getValue){
                    var val = input.getValue();
                    values[key] = val;
                }
            }
        }
        console.log(values);


        return values;
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