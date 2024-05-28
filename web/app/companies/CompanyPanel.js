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
    this.className = "prospekt.companies.CompanyPanel";

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var companyList, companyProfile;
    var filter = {};
    var lastUpdate;

    var naiscCodes;


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


      //Enable 'popstate' listener and update history
        enablePopstateListener();
        updateHistory({
            view: "list"
        });


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


        getNaicsCodes(function(naics){
            naiscCodes = naics;

            get("lastUpdate?source=Awards", {
                success: function(dbDate){ //'2024-02-08'

                    dbDate = moment(new Date(dbDate)).subtract(1, "month").format("YYYY-MM-") + "01";
                    lastUpdate = moment(new Date(dbDate)).add(1, "month").subtract(1, "second");

                    companyList.update();
                },
                failure: function(request){
                    alert(request);
                }
            });

        });


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
            console.log(field, values);
            var orgFilter = JSON.parse(JSON.stringify(filter));

            if (field==="Search"){
                if (values && values.length>0){
                    filter.name = "'" + values.toUpperCase() + "%'";
                }
                else{
                    delete filter.name;
                }
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
            else if (field==="NAICS"){
                var naics = values["naics"];
                console.log(naics);
                if (naics && naics.length>0){
                    filter.recent_naics = naics.join(",");
                }
                else{
                    delete filter["recent_naics"];
                }
                console.log(filter);
            }


            if (isDirty(filter, orgFilter)){
                document.user.preferences.set("CompanyFilter", filter);
                companyList.load();
            }
        };


        toolbar.onShowMenu = function(menu, button){

          //Special case for the NAICS picker
            if (button.title==="NAICS"){
                menu.buttonBar.style.display = "none";
                if (menu.filter.onApply) menu.filter.onApply = function(){
                    menu.button.click();
                };
            }
        };


      //Add company list
        var body = table.addRow().addColumn({height:"100%"});
        companyList = new javaxt.dhtml.DataGrid(body, {
            style: config.style.table,
            hideHeader: true,
            url: "companies",
            post: true,
            filter: filter,
            //fields: ["id","firstName","lastName","fullName","accessLevel","status"],
            parseResponse: function(request){
                return parseResponse(request.responseText);
            },
            columns: [
                {header: 'Name', width:'100%'}
            ],
            update: function(row, company){

                var table = createTable();
                var tr = table.addRow();


              //Create left column for company info
                var td = tr.addColumn({
                    verticalAlign: "top",
                    width: "100%"
                });
                var wrapper = createElement("div", td, {
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    overflow: "hidden"
                });
                var companyInfo = createElement("div", wrapper, {
                    position: "absolute",
                    width: "100%",
                    height: "100%"
                });


              //Create right column for the chart
                var chartArea = createElement("div", tr.addColumn(), {
                    width: "300px",
                    height: "150px"
                });

                row.set("Name", table);







                var data = [];
                var previousRevenue = 0;
                var monthlyRevenue = company.info.monthlyRevenue;
                var today = parseInt(lastUpdate.format("YYYYMMDD"));
                var lastYear = parseInt(lastUpdate.clone().subtract(1, "year").format("YYYYMMDD"));
                var prevYear = parseInt(lastUpdate.clone().subtract(2, "year").format("YYYYMMDD"));
                Object.keys(monthlyRevenue).sort().forEach((date)=>{
                    var d = parseInt(date.replaceAll("-",""));

                    if (d>=prevYear && d<lastYear) previousRevenue+= monthlyRevenue[date];

                    if (d<=today){
                        data.push({
                            date: date,
                            amount: monthlyRevenue[date]
                        });
                    }
                });


              //Add zeros to the end of the dataset as needed
                var d = data.length>0 ? new Date(data[data.length-1].date) : lastUpdate.clone().subtract(1, "year").toDate();
                var monthsAgo = lastUpdate.diff(d, 'months', true);
                if (monthsAgo>1){
                    monthsAgo = Math.ceil(monthsAgo);
                    var m = moment(d);
                    for (var i=0; i<monthsAgo; i++){
                        m.add(1, "month");
                        data.push({
                            date: m.format("YYYY-MM-DD"),
                            amount: 0
                        });
                    }
                }



                var companyName = createElement("div", companyInfo, "company-name");
                companyName.innerText = company.name;

                var annualRevenue = createElement("div", companyInfo, "company-info");
                annualRevenue.innerText = "Annual Revenue: $" + addCommas(company.estimatedRevenue);

                /*
                var p = ((company.estimatedRevenue-previousRevenue)/previousRevenue)*100;
                var d = createElement("div", annualRevenue, "change " + (p>0 ? "positive" : "negative") );
                d.style.display = "inline-block";
                d.innerText = round(p<0 ? -p : p, 1) + "%";
                */

                var customers = createElement("div", companyInfo, "company-info");
                customers.innerText = "Recent Customers: " + (company.recentCustomers ? company.recentCustomers.join(", ") : "");

                var services = createElement("div", companyInfo, "company-info");
                var recentNaics = {};
                if (company.recentNaics) company.recentNaics.forEach((code)=>{
                    if (code.length>2) code = code.substring(0, 2);
                    recentNaics[code] = naiscCodes[code];
                });
                services.innerText = "Services Concentration: " + Object.values(recentNaics).join(", ");



                var lineChart = new bluewave.charts.LineChart(chartArea, {
                    xGrid: false,
                    yGrid: false,
                    xTicks: false,
                    yTicks: false,
                    animationSteps: 0
                });

                var values = data.length>0 ? data.map(d => d.amount) : [];
                var lineColor = getTrend(values)>0 ? "green" : "red";

              //Add revenue line to the chart
                var line = new bluewave.chart.Line({
                    color: lineColor,
                    opacity: 0.25
                });
                lineChart.addLine(line, data, "date", "amount");


              //Add moving average to the chart
                var lineAvg = new bluewave.chart.Line({
                    smoothing: "movingAverage",
                    smoothingValue: 90, //in months
                    width: 1,
                    color: lineColor,
                    fill: {
                        color: lineColor,
                        startOpacity: 0.15,
                        endOpacity: 0
                    }
                });
                lineChart.addLine(lineAvg, data, "date", "amount");


              //Update the chart
                lineChart.update();
            }
        });


        companyList.show = function(){
            companyProfile.hide();
            div.style.opacity = 1;
        };


        companyList.onRowClick = function(row, e){
            var company = row.record;
            companyList.showProfile(company.id);
            addHistory({
                view: "profile",
                companyID: company.id
            });
        };


        companyList.showProfile = function(companyID){

            toolbar.hideMenus();
            div.style.opacity = 0.5;

            if (companyProfile.companyID && companyProfile.companyID===companyID){
                companyProfile.show();
            }
            else{
                companyProfile.clear();
                companyProfile.show();
                companyProfile.companyID = companyID;

                get("company?id=" + companyID, {
                    success: function(text){
                        var company = parseResponse(text);
                        companyProfile.update(company);
                    },
                    failure: function(request){
                        alert(request);
                    }
                });

            }

        };


        companyList.update = function(){

          //Create filter for the toolbar
            var toolbarFilter = {};
            for (var key in filter) {
                if (filter.hasOwnProperty(key)){
                    var val = filter[key];

                    if (key==="name"){

                        if (val.indexOf("'")===0 && val.lastIndexOf("'")===val.length-1){
                            val = val.substring(1, val.length-1);
                            if (val.lastIndexOf("%")===val.length-1){
                                val = val.substring(0, val.length-1);
                            }
                        }

                        toolbarFilter.Search = val;

                    }
                    else if (key==="recent_naics"){
                        toolbarFilter.NAICS = {
                            naics: val
                        };
                    }
                    else if (
                        key==="recent_award_val" ||
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


          //Update toolbar
            toolbar.update(toolbarFilter);


          //Update company list
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
            history.back();
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
  //** addHistory
  //**************************************************************************
    var addHistory = function(params){
        updateState(params, false);
    };


  //**************************************************************************
  //** updateHistory
  //**************************************************************************
    var updateHistory = function(params){
        updateState(params, true);
    };


  //**************************************************************************
  //** updateState
  //**************************************************************************
    var updateState = function(params, replace){

        var title = document.title;
        var url = "";
        var state = window.history.state;
        if (!state) state = {};
        state[me.className] = params;

        if (replace) history.replaceState(state, title, url);
        else history.pushState(state, title, url);
    };


  //**************************************************************************
  //** enablePopstateListener
  //**************************************************************************
    var enablePopstateListener = function(){
        disablePopstateListener();
        window.addEventListener('popstate', popstateListener);

      //Set initial history. This is critical for the popstate listener
        if (window.history.state==null){
            history.replaceState({}, null, '');
        }
    };


  //**************************************************************************
  //** disablePopstateListener
  //**************************************************************************
    var disablePopstateListener = function(){
        window.removeEventListener('popstate', popstateListener);
    };


  //**************************************************************************
  //** popstateListener
  //**************************************************************************
  /** Used to processes forward and back events from the browser
   */
    var popstateListener = function(e) {

        var rect = javaxt.dhtml.utils.getRect(me.el);
        if (rect.width===0) return;

        var state = e.state[me.className];
        if (state.view==="profile"){
            companyList.showProfile(state.companyID);
        }
        else if (state.view==="list"){
            companyList.show();
        }
    };




    var trend_value = function(nums){
        var summed_nums = nums.reduce((a, b) => a + b); //sum(nums)
        var multiplied_data = 0;
        var summed_index = 0;
        var squared_index = 0;

        nums.forEach((num, index)=>{ //for index, num in enumerate(nums):
            index += 1;
            multiplied_data += index * num;
            summed_index += index;
            squared_index += index**2;
        });

        var numerator = ((nums).length * multiplied_data) - (summed_nums * summed_index);
        var denominator = ((nums).length * squared_index) - summed_index**2;
        if (denominator != 0)
            return numerator/denominator;
        else
            return 0;
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
    var round = javaxt.dhtml.utils.round;
    var merge = javaxt.dhtml.utils.merge;
    var get = javaxt.dhtml.utils.get;

    var getNaicsCodes = prospekt.utils.getNaicsCodes;
    var parseResponse = prospekt.utils.parseResponse;
    var createToolBar = prospekt.utils.createToolBar;
    var createButton = prospekt.utils.createButton;
    var addCommas = prospekt.utils.addCommas;
    var getTrend = prospekt.utils.getTrend;

    init();
};