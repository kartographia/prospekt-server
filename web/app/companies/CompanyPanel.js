if(!prospekt) var prospekt={};
if(!prospekt.companies) prospekt.companies={};

//******************************************************************************
//**  Company Panel
//*****************************************************************************/
/**
 *   Panel that appears on the homepage and used to render a list of companies.
 *
 ******************************************************************************/

prospekt.companies.CompanyPanel = function(parent, config) {

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var companyList, companyProfile;
    var filter = {};

    var naiscCodes = {};


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);

        var div = createElement("div", parent, "company-panel center");
        createList(div);
        createProfile(div);



        getNaicsCodes(function(codes){
            naiscCodes = codes;
            onRender(div, me.update);
        });


        me.el = div;
        addShowHide(me);
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){

        for (var key in filter) {
            if (filter.hasOwnProperty(key)){
                filter[key] = "";
            }
        }

        companyProfile.hide();
        companyList.clear();
        companyList.show();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(){
        me.clear();


        var companyFilter = document.user.preferences.get("CompanyFilter");
        if (!companyFilter){
            filter.recent_award_val = ">1";
            filter.estimated_revenue = "";
        }
        else{
            for (var key in companyFilter) {
                if (companyFilter.hasOwnProperty(key)){
                    filter[key] = companyFilter[key];
                }
            }
        }

        companyList.update();
    };


  //**************************************************************************
  //** createList
  //**************************************************************************
    var createList = function(parent){

      //Create main div
        var div = createElement("div", parent, {
            width: "100%",
            height: "100%"
        });


      //Create table
        var table = createTable(div);


      //Add toolbar
        var toolbar = createToolBar(table.addRow().addColumn(), config);
        toolbar.addButton("Customer", prospekt.filters.CustomerFilter);
        toolbar.addButton("NAICS", prospekt.filters.NaicsFilter);
        toolbar.addButton("Revenue", prospekt.filters.RevenueFilter);
        toolbar.addButton("More");
        toolbar.onChange = function(field, values){
            var orgFilter = JSON.parse(JSON.stringify(filter));

            if (field==="Search"){
                console.log(values);
            }
            else if (field==="Revenue"){
                var where = [];
                if (values.min){
                    where.push(">" + values.min);
                }
                else{
                    where.push(">1");
                }
                if (values.max){
                    where.push("<" + values.max);
                }
                if (where.length==0) where = "";
                else if (where.length==1) where = where[0];


                var type = values["type"];
                if (type==="Awards"){
                    filter.recent_award_val = where;
                    filter.estimated_revenue = "";
                }
                else{
                    filter.recent_award_val = "";
                    filter.estimated_revenue = where;
                }
            }


            if (isDirty(filter, orgFilter)){
                document.user.preferences.set("CompanyFilter", filter);
                companyList.load();
            }
        };


      //Add company list
        var body = table.addRow().addColumn({height:"100%"});
        companyList = new javaxt.dhtml.DataGrid(body, {
            style: config.style.table,
            hideHeader: true,
            url: "companies",
            filter: filter,
            //fields: ["id","firstName","lastName","fullName","accessLevel","status"],
            parseResponse: function(request){
                return parseResponse(request.responseText);
            },
            columns: [
                {header: 'Name', width:'100%'}
            ],
            update: function(row, company){
                row.set("Name", company.name);
            }
        });


        companyList.show = function(){
            div.style.opacity = 1;
        };


        companyList.onRowClick = function(row, e){
            var company = row.record;

            toolbar.hideMenus();
            div.style.opacity = 0.5;
            companyProfile.show();


            get("company?id=" + company.id, {
                success: function(text){
                    var company = parseResponse(text);
                    companyProfile.update(company, naiscCodes);
                },
                failure: function(request){
                    alert(request);
                }
            });


        };


        companyList.update = function(){

            var toolbarFilter = {};
            for (var key in filter) {
                if (filter.hasOwnProperty(key)){
                    var val = filter[key];

                    if (key==="recent_award_val" ||
                        key==="estimated_revenue"){

                        var f = {
                            type: key==="recent_award_val" ? "Awards" : "Revenue"
                        };


                        if (!isArray(val)) val = [val];

                        val.forEach((v)=>{
                            if (v.indexOf(">")==0) f.min = parseFloat(v.substring(1));
                            if (v.indexOf("<")==0) f.max = parseFloat(v.substring(1));
                        });

                        toolbarFilter.Revenue = f;

                    }
                }
            }

            toolbar.update(toolbarFilter);


            companyList.load();
        };

    };


  //**************************************************************************
  //** createProfile
  //**************************************************************************
    var createProfile = function(parent){

        var div = createElement("div", parent, "popover-panel");


        var table = createTable(div);
        var toolbar = table.addRow().addColumn();
        var body = table.addRow().addColumn({height:"100%"});


        companyProfile = new prospekt.companies.CompanyProfile(body, config);
        companyProfile.show = function(){
            div.style.left = 0;
            div.style.opacity = 1;
        };
        companyProfile.hide = function(){
            div.style.left = "";
            div.style.opacity = 0;
        };


        var t = createTable(toolbar);
        t.style.width = "";
        var tr = t.addRow();

        var backButton = createButton(tr.addColumn(), {
            label: "Back",
            icon: "fas fa-arrow-left"
        });
        backButton.onClick = function(){
            companyProfile.hide();
            companyList.show();
        };


        var bookmarkButton = createButton(tr.addColumn(), {
            label: "Bookmark",
            icon: "fas fa-star",
            disabled: true
        });


        var shareButton = createButton(tr.addColumn(), {
            label: "Share",
            icon: "fas fa-share-square",
            disabled: true
        });

    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var onRender = javaxt.dhtml.utils.onRender;
    var isDirty = javaxt.dhtml.utils.isDirty;
    var isArray = javaxt.dhtml.utils.isArray;
    var merge = javaxt.dhtml.utils.merge;
    var get = javaxt.dhtml.utils.get;

    var getNaicsCodes = prospekt.utils.getNaicsCodes;
    var parseResponse = prospekt.utils.parseResponse;
    var createToolBar = prospekt.utils.createToolBar;
    var createButton = prospekt.utils.createButton;

    init();

};