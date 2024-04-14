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


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);

        var div = createElement("div", parent, "company-panel center");
        createList(div);
        createProfile(div);


        onRender(div, me.update);


        me.el = div;
        addShowHide(me);
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        companyProfile.hide();
        companyList.clear();
        companyList.show();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(){
        me.clear();
        companyList.load();
    };


  //**************************************************************************
  //** createList
  //**************************************************************************
    var createList = function(parent){

        var table = createTable(parent);
        var toolbar = table.addRow().addColumn();
        var body = table.addRow().addColumn({height:"100%"});

        addShowHide(table);



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
            table.show();
        };
        companyList.hide = function(){
            table.hide();
        };


        companyList.onRowClick = function(row, e){
            var company = row.record;


            table.hide();
            companyProfile.show();


            get("company?id=" + company.id, {
                success: function(text){
                    var company = parseResponse(text);
                    companyProfile.update(company);
                },
                failure: function(request){
                    alert(request);
                }
            });


        };

    };


  //**************************************************************************
  //** createProfile
  //**************************************************************************
    var createProfile = function(parent){

        var table = createTable();
        var toolbar = table.addRow().addColumn();
        var body = table.addRow().addColumn({height:"100%"});
        addShowHide(table);
        table.hide();
        parent.appendChild(table);


        companyProfile = new prospekt.companies.CompanyProfile(body, config);
        companyProfile.show = function(){
            table.show();
        };
        companyProfile.hide = function(){
            table.hide();
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
    var merge = javaxt.dhtml.utils.merge;
    var get = javaxt.dhtml.utils.get;

    var parseResponse = prospekt.utils.parseResponse;
    var createButton = prospekt.utils.createButton;

    init();

};