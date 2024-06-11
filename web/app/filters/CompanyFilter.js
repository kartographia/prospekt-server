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


      //Add company rating
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


      //Add order by
        createElement("h3", div).innerText = "Order By";
        var orderByInputs = {
            "Company Name": "NAME",
            "Annual Revenue": "ESTIMATED_REVENUE",
            "None": "null"
        };


        Object.keys(orderByInputs).forEach((str, i)=>{

            var d = createElement("div", div, {
                width: "100%",
                height: "24px"
            });

            var id = "orderby" + (i+1); //needed for label click to work

            var input = createElement("input", d, "form-radio");
            input.id = id;
            input.type = "radio";
            input.name = "orderby";
            input.value = orderByInputs[str];
            input.style.float = "left";

            var label = createElement("label", d, "form-label");
            label.setAttribute("for", id);
            label.innerText = str;
            label.style.float = "left";

            orderByInputs[str] = input;
        });

        inputs["orderby"] = {
            getValue: function(){
                for (var key in orderByInputs) {
                    if (orderByInputs.hasOwnProperty(key)){
                        var input = orderByInputs[key];
                        if (input.checked){
                            return input.value.toLowerCase();
                        }
                    }
                }
                return "";
            },
            setValue: function(orderby){
                if (!orderby) orderby = "";
                orderby = orderby.toUpperCase();

                for (var key in orderByInputs) {
                    if (orderByInputs.hasOwnProperty(key)){
                        var input = orderByInputs[key];
                        input.checked = false;
                        if (input.value.toUpperCase()===orderby ||
                            key.toUpperCase()===orderby){
                            input.checked = true;
                        }
                    }
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