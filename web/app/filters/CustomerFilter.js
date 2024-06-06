if(!prospekt) var prospekt={};
if(!prospekt.filters) prospekt.filters={};

//******************************************************************************
//**  Customer Filter
//******************************************************************************
/**
 *   Used to find and select customers
 *
 ******************************************************************************/

prospekt.filters.CustomerFilter = function(parent, config) {


    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var tabs, selectedCustomers, customerPicker;



  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);

        var div = createElement("div", parent, "customer-filter");

        //var div = createElement("div", parent, "naics-filter");
        //createMessageBox(div);


        tabs = new javaxt.dhtml.TabPanel(div, {
            style: config.style.tabPanel
        });
        tabs.addTab("Selected", createCustomerList());
        tabs.addTab("Search", createCustomerPicker());
        //tabs.raiseTab(0);


        me.el = div;
        addShowHide(me);
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        customerPicker.clear();
        selectedCustomers.clear();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(filter){

        if (!filter) filter = {};
        if (!filter.customers) filter.customers = [];
        if (isString(filter.customers)){
            filter.customers = filter.customers.split(",");
        }


        me.clear();
        getAgencies(function(agencies){

            get("report/SpendingByAgency", {
                success: function(text){
                    var topAgencies = [];
                    JSON.parse(text).forEach((spending)=>{
                        if (spending.total>=10000000000){
                            topAgencies.push(spending.agency);
                        }
                    });
                    customerPicker.update(agencies, topAgencies, filter.customers);


                    if (filter.customers.length>0){
                        tabs.raiseTab(0);
                    }
                    else{
                        tabs.raiseTab(1);
                    }

                }
            });
        });
    };


  //**************************************************************************
  //** getValues
  //**************************************************************************
    this.getValues = function(){
        return {customers: selectedCustomers.getCustomers()};
    };


  //**************************************************************************
  //** createCustomerList
  //**************************************************************************
    var createCustomerList = function(){

        var table = createTable();
        var td = table.addRow().addColumn({
            height: "100%"
        });

        var div = createElement("div", td, {
            width: "100%",
            height: "100%",
            position: "relative",
            overflow: "hidden auto"
        });

        var innerDiv = createElement("div", div, {
            width: "100%",
            height: "100%",
            position: "absolute"
        });


        selectedCustomers = {
            clear: function(){
                innerDiv.innerHTML = "";
            },
            add: function(key, value){

                var info = {
                    key: key,
                    value: value
                };

                for (var i=0; i<innerDiv.childNodes.length; i++){
                    var div = innerDiv.childNodes[i];
                    if (div.info.key===key) return;
                }

                var label = value;

                var chiclet = createChiclet(innerDiv, label);
                chiclet.el.info = info;
                chiclet.onClose = function(){
                    var info = this.el.info;
                    customerPicker.deselect(info.key, info.value);
                    updateCounter();
                };

                updateCounter();
            },
            remove: function(key, value){

                for (var i=0; i<innerDiv.childNodes.length; i++){
                    var div = innerDiv.childNodes[i];
                    if (div.info.key===key){
                        innerDiv.removeChild(div);
                        break;
                    }
                }

                updateCounter();

            },
            getCustomers: function(){
                var customers = [];
                for (var i=0; i<innerDiv.childNodes.length; i++){
                    var info = innerDiv.childNodes[i].info;
                    customers.push(info.key);
                }
                return customers;
            }
        };


        var updateCounter = function(){
            var selectedTab = tabs.getTabs()[0];
            var counter = selectedTab.header.getElementsByTagName("div");
            if (counter.length>0) counter = counter[0];
            else{
                counter = createElement("div", selectedTab.header, "count");
                addShowHide(counter);
            }

            counter.innerText = addCommas(innerDiv.childNodes.length);
            if (innerDiv.childNodes.length>0){
                counter.show();
            }
            else{
                counter.hide();
            }
        };


        return table;
    };


  //**************************************************************************
  //** createCustomerPicker
  //**************************************************************************
    var createCustomerPicker = function(){

        var table = createTable();
        table.className = "customer-picker";
        var toolbar = table.addRow().addColumn("toolbar");
        var body = table.addRow().addColumn({
            height: "100%",
            textAlign: "left"
        });
        body.className = "small";


      //Create toolbar
        var tr = createTable(toolbar).addRow();
        tr.addColumn({width: "100%"});
        tr.addColumn({textWrap: "nowrap"}).innerText = "Show All";
        var toggleSwitch = new javaxt.dhtml.Switch(tr.addColumn({ padding: "0 7px" }), {
            style: config.style.switch,
            value: false
        });
        toggleSwitch.onChange = function(value){
            grid.clear();
            if (value===true){
                grid.showAll();
            }
            else{
                grid.showSubset();
            }
        };


      //Create list
        var grid = new javaxt.dhtml.Table(body, {
            style: config.style.table,
            hideHeader: true,
            columns: [
                {header: 'x', width: 28},
                {header: 'ID', width: 65},
                {header: 'Name', width:'100%'}
            ]
        });
        grid.showAll = function(){
            grid.clear();
            grid.addRows(allAgencies);
        };
        grid.showSubset = function(){
            grid.clear();
            grid.addRows(subset);
        };



        var allAgencies = [];
        var subset = [];


        customerPicker = {
            clear: function(){
                grid.clear();
                allAgencies = [];
                subset = [];
            },
            update: function(agencies, topAgencies, customers){
                grid.clear();
                grid.showSubset();


                var createRow = function(key, agencyName){
                    return [
                        createCheckbox(key, agencyName), key, agencyName
                    ];
                };


              //Create rows for the "allAgencies" view
                for (var key in agencies) {
                    if (agencies.hasOwnProperty(key)){
                        var agencyName = agencies[key];
                        allAgencies.push(createRow(key, agencyName));
                    }
                }


              //Create rows for the "subset" view
                topAgencies.forEach((key)=>{
                    var agencyName = agencies[key];
                    subset.push(createRow(key, agencyName));
                });



              //Select checkboxes using given list of customers
                [allAgencies, subset].forEach((arr)=>{
                    arr.forEach((row)=>{
                        var checkbox = row[0].checkBox;
                        customers.forEach((customer)=>{
                            if (checkbox.getValue()===customer){
                                checkbox.select();
                            }
                        });
                    });
                });


              //Select view to render
                var numMatches = 0;
                customers.forEach((customer)=>{
                    for (var i=0; i<topAgencies.length; i++){
                        if (topAgencies[i]===customer){
                            numMatches++;
                            break;
                        }
                    }
                });
                if (numMatches===customers.length){
                    grid.showSubset();
                }
                else{
                    grid.showAll();
                }

            },
            select: function(key, silent){

                [allAgencies, subset].forEach((arr)=>{
                    arr.forEach((row)=>{
                        var checkbox = row[0].checkBox;
                        if (checkbox.getValue()===key){
                            checkbox.select(silent);
                        }
                    });
                });

            },
            deselect: function(key){

                [allAgencies, subset].forEach((arr)=>{
                    arr.forEach((row)=>{
                        var checkbox = row[0].checkBox;
                        if (checkbox.getValue()===key){
                            checkbox.deselect();
                        }
                    });
                });

                grid.deselectAll();
            }
        };

        return table;
    };


  //**************************************************************************
  //** createCheckbox
  //**************************************************************************
    var createCheckbox = function(key, value){

        var div = createElement('div', {
            display: "inline-block",
            position: "relative"
        });

        var checkbox = new javaxt.dhtml.Checkbox(div, {
            value: key,
            style: config.style.checkbox
        });

        checkbox.onChange = function(checked){
            if (checked){
                selectedCustomers.add(key, value);
                customerPicker.select(key, true);
            }
            else{
                selectedCustomers.remove(key, value);
                customerPicker.deselect(key, true);
            }
        };

        div.checkBox = checkbox;

        return div;
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var isString = javaxt.dhtml.utils.isString;
    var merge = javaxt.dhtml.utils.merge;
    var get = javaxt.dhtml.utils.get;

    var getAgencies = prospekt.utils.getAgencies;
    var createChiclet = prospekt.utils.createChiclet;
    var addCommas = prospekt.utils.addCommas;


    init();
};