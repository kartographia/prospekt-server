if(!prospekt) var prospekt={};
if(!prospekt.awards) prospekt.awards={};

//******************************************************************************
//**  Award Details
//*****************************************************************************/
/**
 *   Panel used to render information for a specific award
 *
 ******************************************************************************/

prospekt.awards.AwardDetails = function(parent, config) {

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var overview, transactions;

  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){


        if (!config) config = {};
        config = merge(config, defaultConfig);

        var mainDiv = createElement("div", parent, "award-details");
        mainDiv.style.height = "100%";


        var table = createTable(mainDiv);
        createOverview(table.addRow().addColumn());
        createTranactionList(table.addRow().addColumn({height: "100%" }));


        me.el = mainDiv;
        addShowHide(me);
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        overview.clear();
        transactions.clear();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(award){
        me.clear();
        overview.update(award);
        transactions.update(award);
    };


  //**************************************************************************
  //** createOverview
  //**************************************************************************
    var createOverview = function(parent){

        var tr = createTable(parent).addRow();
        var leftCol = tr.addColumn();
        var rightCol = tr.addColumn({height: "100%"});


      //Create stats
        var table = createTable(leftCol);
        table.style.height = "";
        table.className = "company-overview";
        var rows = {};
        var addRow = function(key, value){
            var tr = table.addRow();
            tr.addColumn({
                whiteSpace: "nowrap",
                verticalAlign: "top"
            }).innerText = key;

            var col = tr.addColumn({
                width: "100%",
                verticalAlign: "top"
            });


            col.setValue = function(value){
                col.innerText = value;
            };
            col.setValue(value);

            rows[key] = {
                setValue: col.setValue
            };

        };

        [
            "Name",
            "Description",
            "NAICS",
            "Customer",
            "Office",

            "Start Date",
            "End Date",

            "Value",
            "Funded",

            "Extended Date",
            "Extended Value"

        ].forEach((key)=>{
            addRow(key, "-");
        });


        addRow("Transactions", "");
        rows["Transactions"].setValue = function(){};


        var div = createElement("div", rightCol, {
            width: "300px",
            height: "100%"
        });
        var logo = createElement("div", div, "customer-logo");




        overview = {};

        overview.clear = function(){
            for (var key in rows) {
                if (rows.hasOwnProperty(key)){
                    var row = rows[key];
                    row.setValue("-");
                }
            }
        };

        overview.update = function(award){
            for (var key in rows) {
                if (rows.hasOwnProperty(key)){
                    var row = rows[key];
                    if (key.indexOf(" ")>-1){
                        key = key.replaceAll(" ", "");
                        key = key.substring(0,1).toLowerCase() + key.substring(1);
                    }
                    else{
                        key = key.toLowerCase();
                    }
                    var val = award[key];

                    if (key.indexOf("Date")>-1){
                        if (val){
                            val = moment(val).format("YYYY-MM-DD");
                        }
                        else{
                            val = "-";
                        }
                    }
                    else if (key.indexOf("Value")>-1 || key.indexOf("value")>-1 || key.indexOf("funded")>-1){
                        var updateNeg = val<0;
                        val = "$" + addCommas(val, 0);
                        if (updateNeg) val = "-" + val.replace("-","");
                    }

                    row.setValue(val);
                }
            }


            logo.style.backgroundImage = "url(/images/logos/" + award.customer.toLowerCase() + ".svg)";



        };
    };


  //**************************************************************************
  //** createTranactionList
  //**************************************************************************
    var createTranactionList = function(parent){

        var div = createElement("div", parent, "small");
        div.style.padding = "10px 5px 0 5px";
        div.style.height = "100%";



        transactions = new javaxt.dhtml.DataGrid(div, {
            style: config.style.table,
            columns: [
                {header: 'Date', width:'75px'},
                {header: 'Description', width:'100%'},
                {header: 'Type', width:'175px'},
                {header: 'Funding', width:'100px', align: 'right'}
            ],
            update: function(row, award){
                row.set("Date", moment(award.date).format("YYYY-MM-DD"));
                row.set("Description", award.desc);

                var action = award.type;
                if (award.action) action+=": " + award.action;
                row.set("Type", action);

                var val = award.funding;
                var updateNeg = val<0;
                val = "$" + addCommas(val, 0);
                if (updateNeg) val = "-" + val.replace("-","");

                row.set("Funding", val);
            }
        });


        transactions.update = function(award){
            transactions.clear();
            if (award.info){
                if (award.info.actions){

                    getActionCodes((actionCodes)=>{
                        var records = award.info.actions;
                        records = records.slice(0, records.length);
                        records.forEach((record)=>{
                            record.action = actionCodes[record.type];
                        });
                        records.sort((a, b)=>{
                            if (isString(a.date)) a.date = new Date(a.date);
                            if (isString(b.date)) b.date = new Date(b.date);
                            return b.date.getTime() - a.date.getTime();
                        });
                        transactions.load(records, 1);
                    });

                }
            }
        };
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var isString = javaxt.dhtml.utils.isString;
    var merge = javaxt.dhtml.utils.merge;


    var addCommas = prospekt.utils.addCommas;
    var getActionCodes = prospekt.utils.getActionCodes;


    init();

};