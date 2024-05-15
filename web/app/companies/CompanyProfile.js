if(!prospekt) var prospekt={};
if(!prospekt.companies) prospekt.awards={};

//******************************************************************************
//**  Company Profile
//*****************************************************************************/
/**
 *   Panel used to render information about a company
 *
 ******************************************************************************/

prospekt.companies.CompanyProfile = function(parent, config) {

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var innerDiv;
    var companyOverview;
    var awardDetails;

    var loading = false;
    var naiscCodes = {};
    var lastUpdate;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);


      //Create main div with overflow
        var outerDiv = createElement("div", parent, {
            position: "relative",
            height: "100%",
            overflow: "hidden",
            overflowY: "auto"
        });


      //Create content div. Oddly needed 2 divs, one with "inline-flex" to get
      //padding to work correctly
        var div = createElement("div", outerDiv, {
            position: "absolute",
            width: "100%",
            height: "100%",
            display: "inline-flex"
        });
        innerDiv = createElement("div", div, {
            width: "100%",
            height: "100%",
            padding: "20px"
        });



        me.el = outerDiv;
        addShowHide(me);
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        innerDiv.innerHTML = "";

    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(company){

        if (loading) return;
        me.clear();

        loading = true;
        var onFailure = function(request){
            loading = false;
            alert(request);
        };
        getNaicsCodes(function(naics){
            naiscCodes = naics;


            get("Awards?recipientID=" + company.id, {
                success: function(text){
                    company.awards = parseResponse(text);


                    get("CompanyOfficers?companyID=" + company.id, {
                        success: function(text){
                            company.officers = parseResponse(text);


                            get("lastUpdate?source=Awards", {
                                success: function(dbDate){ //'2024-02-08'

                                    dbDate = moment(new Date(dbDate)).subtract(1, "month").format("YYYY-MM-") + "01";
                                    lastUpdate = moment(new Date(dbDate)).add(1, "month").subtract(1, "second");


                                    loading = false;
                                    update(company);
                                },
                                failure: onFailure
                            });

                        },
                        failure: onFailure
                    });

                },
                failure: onFailure
            });

        });
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    var update = function(company){

      //Add company overview
        var row = createElement("div", innerDiv, {
            width: "100%"
        });

        var table = createTable(row);
        var tr = table.addRow();

        var td = tr.addColumn({
            width: "100%",
            verticalAlign: "top"
        });
        createCompanyOverview(company, td);

        var td = tr.addColumn({
            verticalAlign: "top"
        });
        createRevenueChart(company, td);


      //Add pie charts
        createPieCharts(company, createElement("div", innerDiv));


      //Add treemap
        createTreeMap(company, createElement("div", innerDiv));


      //Add awards table
        createAwardsList(company, createElement("div", innerDiv));


      //Add Officers
        createOfficerInfo(company, createElement("div", innerDiv));

    };


  //**************************************************************************
  //** createCompanyOverview
  //**************************************************************************
    var createCompanyOverview = function(company, parent){

      //Create title
        createElement("div", parent, "company-name").innerText = company.name;


      //Create stats
        var table = createTable(parent);
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
            "Annual Revenue",
            "EBITDA",
            "Backlog",
            "% Prime Contracts",
            "% Full and Open",
            "# Employees",
            "Customers",
            "Prime Contract Vehicles",
            "Services Concentration",
            "Total Revenue",
            "Last Update",
            "Status"

        ].forEach((key)=>{
            addRow(key, "-");
        });



        companyOverview = {
            set: function(key, value){
                rows[key].setValue(value);
            }
        };




        if (!isNaN(parseFloat(company.recentAwardMix+""))){
            companyOverview.set("% Full and Open", company.recentAwardMix + "%");
        }

        if (company.recentCustomers){
            companyOverview.set("Customers", company.recentCustomers.join(", "));
        }

        if (company.recentNaics){

            var codes = {};
            company.recentNaics.forEach((code)=>{
                code = code.substring(0, 3);
                codes[code] = naiscCodes[code];
            });
            companyOverview.set("Services Concentration", Object.values(codes).join("; "));
        }



        if (company.recentAwards) companyOverview.set("Status", "Active");
        else companyOverview.set("Status", "Inactive");

    };


  //**************************************************************************
  //** createRevenueChart
  //**************************************************************************
    var createRevenueChart = function(company, parent){


      //Get funding dates and amounts
        var actionDates = {};
        var funding = {};
        var totalFunding = 0;
        company.awards.forEach((award)=>{
            if (award.info){
                if (award.info.actions){
                    award.info.actions.forEach((action)=>{
                        if (action.funding) {
                            totalFunding+= action.funding;
                            var actionDate = action.date; //YYYY-MM-DD
                            var prevFunding = funding[actionDate];
                            if (!prevFunding) prevFunding = 0;
                            funding[actionDate] = action.funding + prevFunding;
                            actionDates[actionDate] = true;
                        }
                    });
                }
            }
        });
        actionDates = Object.keys(actionDates).sort();
        var firstDate = actionDates[0];
        var lastDate = actionDates[actionDates.length-1];


        //companyOverview.set("Since", firstDate);
        companyOverview.set("Last Update", lastDate);


      //Create dataset for the line graph
        var data = [];
        var annualRevenue = company.estimatedRevenue;
        var totalBacklog = company.estimatedBacklog;
        var totalRevenue = 0;
        var previousRevenue = 0;
        var monthlyRevenue = company.info.monthlyRevenue;
        var today = parseInt(lastUpdate.format("YYYYMMDD"));
        var lastYear = parseInt(lastUpdate.clone().subtract(1, "year").format("YYYYMMDD"));
        var prevYear = parseInt(lastUpdate.clone().subtract(2, "year").format("YYYYMMDD"));
        Object.keys(monthlyRevenue).sort().forEach((date)=>{
            var d = parseInt(date.replaceAll("-",""));

            /*
            if (d>today){
                totalBacklog+=monthlyRevenue[date];
                return;
            }
            else{
                if (d>=lastYear){
                    annualRevenue+=monthlyRevenue[date];
                }
            }
            */

            if (d>=prevYear && d<lastYear) previousRevenue+= monthlyRevenue[date];


            if (d<=today){

                data.push({
                    date: date,
                    amount: monthlyRevenue[date]
                });


                totalRevenue += monthlyRevenue[date];
            }
        });



      //Add zeros to the end of the dataset as needed
        var d = new Date(data[data.length-1].date);
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




        companyOverview.set("Annual Revenue", "$" + addCommas(Math.round(annualRevenue)));
        companyOverview.set("Backlog", "$" + addCommas(Math.round(totalBacklog)));



      //Create main table
        var table = createTable(parent);
        table.style.height = "";



      //Create title
        var titleArea = table.addRow().addColumn("chart-title");
        createElement("div", titleArea, "preamble").innerText = "Estimated Annual Revenue*";

        var div = createElement("div", titleArea, {
            width: "100%",
            display: "inline-block"
        });
        var d = createElement("div", div, "emphasis");
        d.style.display = "inline-block";
        d.style.float = "left";
        d.innerText = "$" + addCommas(Math.round(annualRevenue));

        var p = ((annualRevenue-previousRevenue)/previousRevenue)*100;
        var d = createElement("div", div, "change " + (p>0 ? "positive" : "negative") );
        d.style.display = "inline-block";
        d.style.float = "left";
        d.style.margin = "6px 0 0 10px";
        d.innerText = round(p<0 ? -p : p, 1) + "%";


        createElement("div", titleArea, "footer").innerText =
        "$" + addCommas(Math.round(annualRevenue/12)) + " monthly revenue";

        companyOverview.set("Total Revenue",
        "$" + addCommas(Math.round(totalRevenue-totalBacklog)) +
        " total revenue since " + (firstDate.substring(0, firstDate.indexOf("-"))));


        var chartArea = table.addRow().addColumn("chart-area");
        var footerArea = table.addRow().addColumn("chart-disclaimer");
        footerArea.innerText =
        "*Monthly revenue estimates are based on contract value divided over the period of performance. " +
        "In the case of IDIQ awards, total funding is used instead of contract value. " +
        "Actual monthly revenue may vary significantly.";


        var div = createElement("div", chartArea, {
            width: "600px",
            height: "300px"
        });

        var lineChart = new bluewave.charts.LineChart(div, {
            xGrid: false,
            yGrid: true
        });

      //Add revenue line to the chart
        var line = new bluewave.chart.Line();
        lineChart.addLine(line, data, "date", "amount");


      //Add moving average to the chart
        var lineAvg = new bluewave.chart.Line({
            smoothing: "movingAverage",
            smoothingValue: 90, //in months
            width: 3
        });
        lineChart.addLine(lineAvg, data, "date", "amount");


      //Update the chart to render the data
        lineChart.update();

    };


  //**************************************************************************
  //** createPieCharts
  //**************************************************************************
    var createPieCharts = function(company, parent){
        createElement("h2", parent).innerText = "Revenue Mix";


        var revenueByType = {};
        var revenueByCustomer = {};
        var revenueBySector = {};
        var revenueBySubsector = {};

        company.awards.forEach((award)=>{

          //Get total value of the award
            var awardValue = award.value;


          //If there is no value, look at the total funding instead
            if (!award.value) awardValue = award.funded;


          //Ignore total value if IDIQ. Only look at funded value
            if (award.type==="IDIQ"){
                if (award.funded) awardValue = award.funded;
                else return;
            }


          //Compute revenue
            if (award.startDate && awardValue){
                var startDate = moment(award.startDate);
                var endDate = award.endDate ? moment(award.endDate) : startDate.clone().add(1, "year");
                var totalMonths =  Math.ceil(endDate.diff(new Date(startDate), 'months', true));
                var monthlyRevenue = awardValue/totalMonths;


                var d = startDate.clone();
                var t = 0;
                for (var i=0; i<totalMonths; i++){


                  //Compute revenue for the current month
                  //Ensure that it exceed total revenue
                    var currRevenue;
                    if (t+monthlyRevenue>awardValue){
                        currRevenue = awardValue-t;
                    }
                    else{
                        currRevenue = monthlyRevenue;
                    }
                    t += currRevenue;



                  //Increment date by one month
                    d.add(1, "month");
                }



                var prevValue = revenueByType[award.type];
                if (!prevValue) prevValue = 0;
                revenueByType[award.type] = t+prevValue;


                var prevValue = revenueByCustomer[award.customer];
                if (!prevValue) prevValue = 0;
                revenueByCustomer[award.customer] = t+prevValue;


                var naics = award.naics;
                if (naics){
                    var sector = naics.substring(0, 2);
                    var subsector = naics.substring(0, 3);


                    var prevValue = revenueBySector[sector];
                    if (!prevValue) prevValue = 0;
                    revenueBySector[sector] = t+prevValue;


                    var prevValue = revenueBySubsector[subsector];
                    if (!prevValue) prevValue = 0;
                    revenueBySubsector[subsector] = t+prevValue;
                }
            }

        });




      //Create main table
        var table = createTable(parent);


      //Create pie charts
        var tr = table.addRow();
        var addPieChart = function(kvp, title){
            var parent = tr.addColumn();
            createElement("div", parent, "chart-title").innerText = title;

            var data = [];
            Object.keys(kvp).forEach((key)=>{
                data.push({
                    key: key,
                    value: Math.round(kvp[key])
                });
            });
            data.sort((a, b)=>{
                return b.value-a.value;
            });

            var div = createElement("div", parent, {
                width: "400px",
                height: "400px",
                margin: "0 auto"
            });
            div.className = "chart-area";
            var pieChart = new bluewave.charts.PieChart(div, {
                pieCutout: 0.65,
                labelOffset: 120,
                pieSort: "value",
                pieSortDir: "descending",
                showTooltip: true
            });
            pieChart.getTooltipLabel = function(d){
                return d.key + "<br/>" + "$" + addCommas(Math.round(d.value));
            };


          //Update the chart using data from demo1
            pieChart.update(data, "key", "value");


          //Return sorted data
            return data;
        };

        revenueByCustomer = addPieChart(revenueByCustomer, "Revenue By Customer");
        revenueBySector = addPieChart(revenueBySector, "Revenue By Product/Service");
        //revenueBySubsector = addPieChart(revenueBySubsector, "Revenue By Product/Service");
        revenueByType = addPieChart(revenueByType, "Revenue By Contract Type");


      //Create tables under the pie charts
        var tr = table.addRow();
        var addTable = function(data, isNaisc){
            var td = tr.addColumn({
                verticalAlign: "top"
            });
            var table = createTable(td);
            table.style.width = "";
            table.style.height = "";
            table.style.margin = "0 auto";
            table.className = "chart-data-table";
            data.forEach((d)=>{
                var tr = table.addRow();
                tr.addColumn({minWidth: "150px"}).innerText = d.key + (isNaisc ? (": " + naiscCodes[d.key]) : "");
                tr.addColumn({textAlign: "right"}).innerText = "$" + addCommas(Math.round(d.value));
            });
        };

        addTable(revenueByCustomer);
        addTable(revenueBySector, true);
        addTable(revenueByType);

    };


  //**************************************************************************
  //** createAwardsList
  //**************************************************************************
    var createAwardsList = function(company, parent){

        createElement("h2", parent).innerText = "Awards";

        var div = createElement("div", parent, "small");
        div.style.height = "600px";

        var today = lastUpdate.clone();

        var grid = new javaxt.dhtml.DataGrid(div, {
            style: config.style.table,
            columns: [
                {header: 'Customer', width:'80px'},

                {header: 'Name', width:'100%'},

                {header: 'Contract', width:'75px', align: "left"},

                {header: 'Competed', width:'75px', align: "center"},
                {header: 'Start Date', width:'75px', align: "right"},
                {header: 'End Date', width:'75px', align: "right"},
                {header: 'Funding', width:'100px', align: "right"},

                {header: 'Actions', width:'50px', align: 'center'}
            ],
            update: function(row, award){
                row.set("Customer", award.customer);
                row.set("Name", award.name);
                row.set("Contract", award.type);

                if (award.competed==true){}
                else{
                    row.set("Competed", "<i class=\"fas fa-times\" style=\"color:#e7a2a2;\"></i>");
                }


                row.set("Start Date", moment(award.date).format("YYYY-MM-DD"));

                if (award.endDate){
                    row.set("End Date", moment(award.endDate).format("YYYY-MM-DD"));
                }
                else{
                    row.set("End Date", "-");
                }


                var inactive = false;
                if (award.extendedDate){
                    if (award.endDate==award.extendedDate){
                        if (award.endDate){
                            if (moment(award.endDate).isBefore(today)){
                                inactive = true;
                            }
                        }
                    }
                }
                else{
                    if (award.endDate){
                        if (moment(award.endDate).isBefore(today)){
                            inactive = true;
                        }
                    }
                }

                if (!inactive){
                    if (award.info && award.info.actions){
                        var lastEvent = Number.MAX_VALUE;
                        award.info.actions.forEach((action)=>{
                            if (action.type==="K") return; //don't look at closeout events
                            var monthsAgo = Math.ceil(today.diff(new Date(action.date), 'months', true));
                            lastEvent = Math.min(lastEvent, monthsAgo);
                        });
                        if (lastEvent>12) inactive = true;
                    }
                    else{
                        inactive = true;
                    }
                }


                if (inactive){
                    var className = row.className;
                    if (!className) className = "";
                    row.className+= " inactive";
                }



                var val = award.funded;
                var updateNeg = val<0;
                val = "$" + addCommas(val, 0);
                if (updateNeg) val = "-" + val.replace("-","");

                row.set("Funding", val);

                if (award.info){
                    if (award.info.actions){
                        row.set("Actions", addCommas(award.info.actions.length));
                    }
                }
            }
        });

        grid.onRowClick = function(row, e){
            var award = row.record;
            if (!awardDetails){
                var win = new javaxt.dhtml.Window(document.body, {
                    style: config.style.window,
                    title: "Award Details",
                    width: 1000,
                    height: 800,
                    modal: true
                });
                awardDetails = new prospekt.awards.AwardDetails(win.getBody(), config);
                awardDetails.show = function(){
                    win.show();
                };
                awardDetails.hide = function(){
                    win.hide();
                };
                awardDetails.setTitle = function(title){
                    win.setTitle(title);
                };
            }
            awardDetails.update(award);
            //awardDetails.setTitle(award.name); //TODO: trim
            awardDetails.show();
        };


        var records = company.awards.slice(0, company.awards.length);
        records.sort((a, b)=>{
            if (isString(a.date)) a.date = new Date(a.date);
            if (isString(b.date)) b.date = new Date(b.date);
            return b.date.getTime() - a.date.getTime();
        });


      //Create function to get records by page
        var getData = function(page){
            var limit = 50;
            var offset = 0;
            if (page>1) offset = ((page-1)*limit)+1;

            var data = [];
            for (var i=offset; i<records.length; i++){
                data.push(records[i]);
                if (data.length===limit) break;
            }
            return data;
        };


      //Get data
        var page = 1;
        var data = getData(page);


      //Load data
        grid.load(data, page);


      //Watch for scroll events to load more data
        var pages = {};
        pages[page+''] = true;
        grid.onPageChange = function(currPage, prevPage){
            page = currPage;

            if (!pages[page+'']){
                grid.load(getData(page), page);
                pages[page+''] = true;
            }
        };
    };



  //**************************************************************************
  //** createTreeMap
  //**************************************************************************
    var createTreeMap = function(company, parent){
        //createElement("h2", parent).innerText = "Contract Mix";

        /*
            //Create treemap chart using "demo2" div
            var div = document.getElementById("demo2");
            var voronoiTreemap = new bluewave.charts.TreeMapChart(div, {});


            var chartConfig = {
                key: "username",
                value: "commits",
                groupBy: "repo",
                shape: "circle" //<--vs "square" default
            };


            var data = d3.csvParse(csv);

            voronoiTreemap.update(chartConfig, data);
         */

    };


  //**************************************************************************
  //** createOfficerInfo
  //**************************************************************************
    var createOfficerInfo = function(company, parent){

        createElement("h2", parent).innerText = "Officers";

        var table = createTable(parent);
        var tr = table.addRow();
        var leftCol = tr.addColumn({
            width: "100%",
            verticalAlign: "top"
        });
        var rightCol = tr.addColumn("chart-area");


        updateOfficers(company.officers, function(){


          //Separate current and inactive officers
            var currOfficers = [];
            var olderOfficers = [];
            var lastYear = lastUpdate.clone().subtract(1, "year");
            company.officers.forEach((officer)=>{
                var lastUpdate = moment(new Date(officer.lastUpdate));
                if (lastUpdate.isBefore(lastYear)){
                    olderOfficers.push(officer);
                }
                else{
                    currOfficers.push(officer);
                }
            });


          //Sort officer groups by salary
            currOfficers.sort((a, b)=>{
                return b.salary-a.salary;
            });
            olderOfficers.sort((a, b)=>{
                return b.salary-a.salary;
            });


          //Render officers in a grid view
            var table = createTable(leftCol);
            table.style.maxWidth = "750px";
            var tr = table.addRow("table-header");
            tr.addColumn({ width: "100$"}).innerText = "Name";
            tr.addColumn({ width: "100$"}).innerText = "Salary";
            tr.addColumn({ width: "100$"}).innerText = "Active";
            var addRow = function(officer, active){
                var tr = table.addRow();
                tr.addColumn().innerText = officer.person.fullName;
                tr.addColumn().innerText = "$" + addCommas(Math.round(officer.salary));
                tr.addColumn().innerText = active===true ? true : "-";
            };
            currOfficers.forEach((officer)=>{
                addRow(officer, true);
            });
            olderOfficers.forEach((officer)=>{
                addRow(officer);
            });




          //Render salary history
            var div = createElement("div", rightCol, {
                width: "600px",
                height: "300px"
            });
            var lineChart = new bluewave.charts.LineChart(div, {
                xGrid: false,
                yGrid: true
            });

            var addLine = function(officer, current){
                if (!officer.info) return;
                if (!officer.info.salaryHistory) return;
                var fullName = officer.person.fullName;
                var data = [];
                officer.info.salaryHistory.forEach((d)=>{
                    data.push({
                        date: moment(new Date(d.date)).format("YYYY-MM-DD"),
                        salary: d.salary
                    });
                });
                data.sort((a, b)=>{
                    return b.date-a.date;
                });
                var arr = [];
                var prevSal = 0;
                for (var i=0; i<data.length; i++){
                    var currSal = data[i].salary;

                    if (currSal>prevSal){
                        arr.push(data[i]);
                        prevSal = currSal;
                    }
                    else{
                        if (i===data.length-1){
                            arr.push({date: data[i].date, salary: prevSal});
                        }
                    }

                }

                var line = new bluewave.chart.Line();
                lineChart.addLine(line, arr, "date", "salary");
            };

            olderOfficers.sort((a, b)=>{
                return a.salary-b.salary;
            });
            olderOfficers.forEach((officer)=>{
                addLine(officer);
            });

            currOfficers.sort((a, b)=>{
                return a.salary-b.salary;
            });
            currOfficers.forEach((officer)=>{
                addLine(officer);
            });

            lineChart.update();
        });
    };


  //**************************************************************************
  //** updateOfficers
  //**************************************************************************
    var updateOfficers = function(officers, callback){

        var queue = [];
        officers.forEach((officer)=>{
            if (!officer.person) queue.push(officer);
        });

        var getNextPerson = function(){
            if (queue.length===0){
                callback();
                return;
            }
            var officer = queue.shift();
            get("person?id=" + officer.personID, {
                success: function(text){
                    officer.person = JSON.parse(text);
                    getNextPerson();
                },
                failure: function(){
                    getNextPerson();
                }
            });
        };
        getNextPerson();
    };





  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var isString = javaxt.dhtml.utils.isString;
    var merge = javaxt.dhtml.utils.merge;
    var round = javaxt.dhtml.utils.round;
    var get = javaxt.dhtml.utils.get;


    var parseResponse = prospekt.utils.parseResponse;
    var getNaicsCodes = prospekt.utils.getNaicsCodes;
    var addCommas = prospekt.utils.addCommas;

    init();

};