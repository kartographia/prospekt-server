if(!prospekt) var prospekt={};
if(!prospekt.filters) prospekt.filters={};


//******************************************************************************
//**  Revenue Filter
//******************************************************************************
/**
 *   Used to define a filter with a dollar range for an award value or
 *   estimated revenue.
 *
 ******************************************************************************/

prospekt.filters.RevenueFilter = function(parent, config) {


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

        var table = createTable(parent);
        createToggle(table.addRow().addColumn());
        createRange(table.addRow().addColumn());


        me.el = table;
        addShowHide(me);
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(filter){
        if (!filter) return;
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
                    if (!val && input.getInput){ //special case for comboboxes
                        var v = parseFloat(input.getInput().value+"");
                        if (!isNaN(v)) val = v;
                    }
                    values[key] = val;
                }
            }
        }

        return values;
    };


  //**************************************************************************
  //** createToggle
  //**************************************************************************
    var createToggle = function(parent){

        var table = createTable(parent);
        table.style.height = "";
        table.style.margin = "35px 0 20px 0";
        var tr = table.addRow("button-group");


        var awardsButton = new javaxt.dhtml.Button(tr.addColumn({width:"50%"}),{
            label: "Awards",
            toggle: true,
            selected: true,
            style: config.style.button
        });
        var revenueButton = new javaxt.dhtml.Button(tr.addColumn({width:"50%"}),{
            label: "Revenue",
            toggle: true,
            style: config.style.button
        });

        var selectedButton = awardsButton;

        awardsButton.onClick = revenueButton.onClick = function(){
            var button = this;
            selectedButton.toggle();
            if (button!==selectedButton){
                selectedButton = button;
            }
        };

        inputs["type"] = {
            getValue: function(){
                return selectedButton.getText();
            },
            setValue: function(type){
                if (type==="Awards"){
                    awardsButton.click();
                }
                else{
                    revenueButton.click();
                }
            }
        };

    };


  //**************************************************************************
  //** createRange
  //**************************************************************************
    var createRange = function(parent){

        var table = createTable(parent);
        table.style.height = "";
        var tr;

      //Create phantom row to set up spacing
        tr = table.addRow();
        tr.addColumn({width:"50%"});
        createElement("div", tr.addColumn(), {
            width: "38px"
        });
        tr.addColumn({width:"50%"});


      //Create labels
        tr = table.addRow();
        tr.addColumn().innerText = "Minimum";
        tr.addColumn();
        tr.addColumn().innerText = "Maximum";


      //Create inputs
        tr = table.addRow();
        createInput(tr.addColumn(), "min");
        tr.addColumn({textAlign: "center"}).innerText = "-";
        createInput(tr.addColumn(), "max");

    };


  //**************************************************************************
  //** createInput
  //**************************************************************************
    var createInput = function(parent, type){

        var input = new javaxt.dhtml.ComboBox(parent, {
            style: config.style.combobox
        });

        var defaultLabel = "No " + (type==="min" ? "Min" : "Max");

        input.add(defaultLabel, null);
        input.add("$500k", 500000);
        input.add("$1M", 1000000);
        input.add("$5M", 5000000);
        input.add("$10M", 10000000);
        input.add("$25M", 25000000);
        input.add("$100M", 100000000);
        input.add("$250M", 250000000);
        input.add("$500M", 500000000);
        input.setValue(defaultLabel);

        inputs[type] = input;
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