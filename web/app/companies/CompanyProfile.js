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

    var naiscCodes = {};


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);

        //"document-panel center"


      //Create divs
        var outerDiv = createElement("div", parent, {
            position: "relative",
            height: "100%"
        });


        innerDiv = createElement("div", outerDiv, {
            position: "absolute",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            overflowY: "auto"
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
        me.clear();

        naiscCodes = {};
        get("data/naics.tsv", {
            success: function(text){
                text.split("\n").forEach((row)=>{
                    row = row.trim();
                    var arr = row.split("\t");
                    if (arr.length===2){
                        var code = arr[0];
                        var desc = arr[1];
                        if (desc.lastIndexOf("T")===desc.length-1){
                            desc = desc.substring(0, desc.length-1);
                        }
                        naiscCodes[code] = desc;
                    }
                });




                get("Awards?recipientID=" + company.id, {
                    success: function(text){
                        company.awards = parseResponse(text);


                        get("CompanyOfficers?companyID=" + company.id, {
                            success: function(text){
                                company.officers = parseResponse(text);
                                update(company);
                            },
                            failure: function(request){
                                alert(request);
                            }
                        });

                    },
                    failure: function(request){
                        alert(request);
                    }
                });


            },
            failure: function(){

            }
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


      //Compute stats
        var dates = {};
        var funding = {};
        var revenue = {};
        var totalAwards = 0;
        var totalFunding = 0;
        var totalRevenue = 0;
        company.awards.forEach((award)=>{

          //Get total value of the award
            var awardValue = award.value;
            totalAwards += awardValue;

          //Ignore total value if IDIQ. Only look at funded value
            if (award.type==="IDIQ"){
                if (award.funded) awardValue = award.funded;
                else return;
            }


          //Compute monthly revenue
            if (award.startDate && awardValue){
                var startDate = moment(award.startDate);
                var endDate = award.endDate ? moment(award.endDate) : startDate.clone().add(1, "year");
                var totalMonths =  Math.ceil(endDate.diff(new Date(startDate), 'months', true));
                var monthlyRevenue = awardValue/totalMonths;


                var d = startDate.clone();
                var t = 0;
                for (var i=0; i<totalMonths; i++){


                  //Generate key using the last day of the month
                    var nextMonth = d.clone().add(1, "month");
                    nextMonth = moment([nextMonth.year(), nextMonth.month(), 1, 0, 0, 0, 0]);
                    var key = nextMonth.subtract(1, "day").format("YYYY-MM-DD");



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



                  //Update all revenue
                    var val = revenue[key];
                    if (val) val += currRevenue;
                    else val = currRevenue;
                    revenue[key] = val;


                  //Increment date by one month
                    d.add(1, "month");
                }

                totalRevenue += t;
                //console.log(award.startDate, award.endDate, totalMonths, Math.round(monthlyRevenue), Math.round(awardValue), Math.round(t));
            }




          //Get funding data
            if (award.info){
                if (award.info.actions){
                    award.info.actions.forEach((action)=>{
                        if (action.funding) {
                            totalFunding+= action.funding;
                            var date = action.date;
                            var prevFunding = funding[date];
                            if (!prevFunding) prevFunding = 0;
                            funding[date] = action.funding + prevFunding;
                            dates[date] = true;
                        }
                    });
                }
            }
        });




        dates = Object.keys(dates).sort();
        var firstDate = dates[0];
        var lastDate = dates[dates.length-1];


        //companyOverview.set("Since", firstDate);
        companyOverview.set("Last Update", lastDate);



        var data = [];
        var totalBacklog = 0;
        var annualRevenue = 0;
        var previousRevenue = 0;
        var today = parseInt(moment().format("YYYYMMDD"));
        var lastYear = parseInt(moment().subtract(1, "year").format("YYYYMMDD"));
        var prevYear = parseInt(moment().subtract(2, "year").format("YYYYMMDD"));
        Object.keys(revenue).sort().forEach((date)=>{
            var d = parseInt(date.replaceAll("-",""));

            if (d>today){
                totalBacklog+=revenue[date];
                return;
            }
            else{
                if (d>=lastYear){
                    annualRevenue+=revenue[date];
                }
            }

            if (d>=prevYear && d<lastYear) previousRevenue+= revenue[date];


            data.push({
                date: date,
                amount: revenue[date]
            });
        });

        if (annualRevenue===0){
            data.push({
                date: moment().format("YYYY-MM-DD"),
                amount: 0
            });
        }


        companyOverview.set("Annual Revenue", "$" + addCommas(Math.round(annualRevenue)));
        companyOverview.set("Backlog", "$" + addCommas(Math.round(totalBacklog)));



      //Create main table
        var table = createTable(parent);
        table.style.height = "";



      //Create title
        var titleArea = table.addRow().addColumn("chart-title");
        createElement("div", titleArea, "preamble").innerText = "Estimated Revenue*";

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
        var revenueByNaics = {};

        company.awards.forEach((award)=>{

          //Get total value of the award
            var awardValue = award.value;


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
                    naics = naics.substring(0, 3);
                    var prevValue = revenueByNaics[naics];
                    if (!prevValue) prevValue = 0;
                    revenueByNaics[naics] = t+prevValue;
                }
            }

        });




      //Create main table
        var table = createTable(parent);


      //Create pie charts
        var tr = table.addRow();
        var addPieChart = function(kvp, title){
            var parent = tr.addColumn();
            createElement("div", parent, "subtitle").innerText = title;

            var data = [];
            Object.keys(kvp).forEach((key)=>{
                data.push({
                    key: key,
                    value: kvp[key]
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
            var pieChart = new bluewave.charts.PieChart(div, {
                pieCutout: 0.65,
                labelOffset: 120
            });

          //Update the chart using data from demo1
            pieChart.update(data, "key", "value");


          //Return sorted data
            return data;
        };

        revenueByCustomer = addPieChart(revenueByCustomer, "Revenue By Customer");
        revenueByNaics = addPieChart(revenueByNaics, "Revenue By Product/Service");
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
            table.className = "company-overview";
            data.forEach((d)=>{
                var tr = table.addRow();
                tr.addColumn({minWidth: "150px"}).innerText = d.key + (isNaisc ? (": " + naiscCodes[d.key]) : "");
                tr.addColumn({textAlign: "right"}).innerText = "$" + addCommas(Math.round(d.value));
            });
        };

        addTable(revenueByCustomer);
        addTable(revenueByNaics, true);
        addTable(revenueByType);

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
            console.log(company.officers);


          //Separate current and inactive officers
            var currOfficers = [];
            var olderOfficers = [];
            var lastYear = moment().subtract(1, "year");
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
  //** addCommas
  //**************************************************************************
    var addCommas = function(x) {
        return round(x, 2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var merge = javaxt.dhtml.utils.merge;
    var round = javaxt.dhtml.utils.round;
    var get = javaxt.dhtml.utils.get;

    var parseResponse = prospekt.utils.parseResponse;

    init();

};