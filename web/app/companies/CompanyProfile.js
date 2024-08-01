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

  //Components
    var panel;
    var companyOverview, companyDescription, companyOfficers;
    var revenueChart;
    var awardDetails, linkEditor, employeeEditor, revenueEditor, tagEditor; //custom popups
    var waitmask;
    var clipboard;

  //Variables
    var currID = null;
    var loading = false;
    var naiscCodes = {};
    var listeners = [];
    var dbDate, lastUpdate;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);


        if (!config.waitmask) config.waitmask = new javaxt.express.WaitMask(document.body);
        waitmask = config.waitmask;


        panel = createOverflowPanel(parent);
        var outerDiv = panel.outerDiv;
        var innerDiv = panel.innerDiv;
        innerDiv.className = "company-profile";

        me.el = outerDiv;
        addShowHide(me);
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        currID = null;
        panel.clear();
        listeners.forEach((listener)=>{
            document.body.removeEventListener('click', listener);
        });
        listeners = [];
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(company){

        if (loading) return;
        me.clear();


        loading = true;
        waitmask.show(500);
        var onFailure = function(request){
            loading = false;
            waitmask.hide();
            alert(request);
        };


        getNaicsCodes(function(naics){
            naiscCodes = naics;


            get("Awards?recipientID=" + company.id, {
                success: function(text){
                    company.awards = parseResponse(text);


                    get("CompanyOfficers?fields=id&companyID=" + company.id, {
                        success: function(text){
                            company.officers = parseResponse(text);



                            get("CompanyAddresses?companyID=" + company.id, {
                                success: function(text){
                                    company.addresses = parseResponse(text);


                                    get("lastUpdate?source=Awards", {
                                        success: function(d){ //'2024-02-08'

                                            dbDate = d;
                                            d = moment(new Date(d)).subtract(1, "month").format("YYYY-MM-") + "01";
                                            lastUpdate = moment(new Date(d)).add(1, "month").subtract(1, "second");


                                            loading = false;
                                            waitmask.hide();
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

                },
                failure: onFailure
            });

        });
    };


  //**************************************************************************
  //** notify
  //**************************************************************************
    this.notify = function(op, model, id, userID){
        if (model==="Company" && id===currID){

            get("Company?id="+id,{
                success: function(str){
                    var company = JSON.parse(str);
                    updateCompanyOverview(company);
                }
            });

        }
        else{
            if (model==="CompanyOfficer"){
                if (op==="create" || op==="update"){



                  //Test whether the officer is a member of this company
                    get("CompanyOfficers?fields=id&companyID=" + currID, {
                        success: function(text){
                            var officers = parseResponse(text);
                            for (var i=0; i<officers.length; i++){
                                if (officers[i].id===id){

                                    get("Company?id="+currID,{
                                        success: function(str){
                                            var company = JSON.parse(str);
                                            company.officers = officers;
                                            //companyOfficers.update(company);
                                        }
                                    });

                                    break;
                                }
                            }
                        },
                        failure: function(){}
                    });
                }
            }
            else if (model==="Person"){
                if (op==="create" || op==="update"){

                  //Test whether the person is a member of this company
                    get("CompanyOfficers?fields=id,personID&companyID=" + currID, {
                        success: function(text){
                            var officers = parseResponse(text);
                            for (var i=0; i<officers.length; i++){
                                if (officers[i].personID===id){

                                    get("Company?id="+currID,{
                                        success: function(str){
                                            var company = JSON.parse(str);
                                            company.officers = officers;
                                            //companyOfficers.update(company);
                                        }
                                    });

                                    break;
                                }
                            }
                        },
                        failure: function(){}
                    });
                }
            }
        }
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    var update = function(company){
        currID = company.id;
        var innerDiv = panel.innerDiv;

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


      //Add customer logos
        createCustomers(company, createElement("div", innerDiv));


      //Add pie charts
        createPieCharts(company, createElement("div", innerDiv));


      //Add awards table
        createCurrentContractList(company, createElement("div", innerDiv));


      //Add treemap
        createTreeMap(company, createElement("div", innerDiv));


      //Add Officers
        createOfficerInfo(company, createElement("div", innerDiv));


      //Add Map
        createMap(company, createElement("div", innerDiv));


      //Update panel scroll
        panel.update();
        panel.scrollTo(0,0);
    };


  //**************************************************************************
  //** createCompanyOverview
  //**************************************************************************
    var createCompanyOverview = function(company, parent){

      //Create container for the title and logo
        var companyHeader = createElement("div", parent, "company-header");


      //Create logo
        var companyLogo = createElement("div", companyHeader, "company-logo");
        addShowHide(companyLogo);
        companyLogo.hide();


      //Create title
        var companyName = createElement("div", companyHeader, "company-name");
        var span = createElement("span", companyName);
        span.innerText = company.name;
        companyName.onclick = function(e){
            if (e.offsetX>span.offsetWidth){
                if (!clipboard) clipboard = createClipboard(parent);
                clipboard.insert(company.name);
            }
        };


        companyDescription = createElement("div", parent, "company-description");
        if (company.description) companyDescription.innerText = company.description;


      //Create stats
        var table = createTable(parent);
        table.style.height = "";
        table.className = "company-overview";
        var rows = {};
        var addRow = function(key, value, editable){
            var tr = table.addRow();
            tr.addColumn({
                whiteSpace: "nowrap",
                verticalAlign: "top"
            }).innerText = key;

            var col = tr.addColumn({
                width: "100%",
                verticalAlign: "top"
            });


          //Create custom setValue function for the column
            col.setValue = function(value){
                col.innerHTML = "";

                var d = createElement("div", col, editable ? "editable" : "");
                if (isElement(value)){
                    d.appendChild(value);
                }
                else{

                    if (!value || value=="") value = "-";
                    var span = createElement("span", d);
                    span.innerText = value;

                    d.onclick = function(e){
                        company = companyOverview.company;

                      //Special case for "Prime Contracts" field: Open revenue editor
                        if (key==="% Prime Contracts"){
                            editRevenue(company);
                            return;
                        }


                      //Special case for "# Employees" field
                        if (key==="# Employees"){
                            if (company.info && company.info.linkedInProfile){
                                var staffCount = parseInt(company.info.linkedInProfile.staffCount+"");
                                if (!isNaN(staffCount)){
                                    editEmployees(company);
                                    return;
                                }
                            }
                        }


                      //Check if the click event is over the edit icon. The edit
                      //icon appears to the right of the text. It is defined in
                      //the main.css
                        if (e.offsetX>(span.offsetWidth-16)){


                          //Click the body to hide other editors
                            document.body.click();


                          //Do not propogate the event any further
                            e.stopPropagation();


                          //Update the style of the div so we can get a 100%
                          //width on the input
                            d.className = "";
                            d.style.display = "block";


                          //Get current text and clear the div
                            var currText = this.innerText;
                            if (currText==="-") currText = "";
                            this.innerHTML = "";


                          //Create input
                            var input = createElement("input", this, "form-input");
                            input.style.width = "100%";
                            input.type = "text";
                            input.value = currText;
                            input.orgValue = currText;
                            input.onkeydown = function(event){
                                var k = event.keyCode;
                                if (k === 9 || k === 13) {
                                    col.setValue(this.value);

                                    if (this.value!==this.orgValue){
                                        if (!company.info) company.info = {};
                                        if (!company.info.edits) company.info.edits = {};


                                      //Convert key to camel case
                                        var fieldName = key;
                                        if (fieldName.indexOf("%")===0) fieldName = fieldName.substring(1).trim();
                                        if (fieldName.indexOf("#")===0) fieldName = fieldName.substring(1).trim();
                                        fieldName = fieldName.replaceAll(" ", "");
                                        if (fieldName.toUpperCase()===fieldName){ //all caps (e.g. EBITDA)
                                            fieldName = fieldName.toLowerCase();
                                        }
                                        else{
                                            fieldName = fieldName.substring(0, 1).toLowerCase() + fieldName.substring(1);
                                        }

                                        company.info.edits[fieldName] = {
                                            value: this.value,
                                            userID: document.user.id,
                                            date: new Date().getTime()
                                        };


                                        updateCompanyInfo(company);
                                    }

                                }
                            };
                            input.focus();
                        }
                    };

                }
            };


          //Special case for links
            if (key==="Links"){

                value = {
                    "Website": "",
                    "LinkedIn": "",
                    "Facebook": "",
                    "Twitter": "",
                    "Search": ""
                };


                var d = createElement("div", col, "company-links editable");
                d.onclick = function(e){
                    if (e.offsetX>(this.offsetWidth-16)){
                        editLinks(companyOverview.company);
                    }
                };


                var links = {};
                links["Website"] = createElement("i", d, "fas fa-globe inactive");
                links["LinkedIn"] = createElement("i", d, "fab fa-linkedin inactive");
                links["Facebook"] = createElement("i", d, "fab fa-facebook-square inactive");
                links["Twitter"] = createElement("i", d, "fab fa-twitter inactive");
                links["Search"] = createElement("i", d, "fas fa-search inactive");

                col.setValue = function(value){

                    for (var key in links) {
                        if (links.hasOwnProperty(key)){
                            if (value[key]){
                                var i = links[key];
                                i.className = i.className.replace("inactive", "");
                                i.url = value[key];
                                i.onclick = function(){
                                    window.open(this.url, '_blank').focus();
                                };
                            }
                        }
                    }

                };
            }



          //Special case for tags
            if (key==="Tags"){
                var d = createElement("div", col, "company-tags editable");
                d.onclick = function(e){
                    if (e.offsetX>(this.offsetWidth-16)){
                        editTags(companyOverview.company);
                    }
                };
                col.setValue = function(value){
                    if (isArray(value)){
                        d.innerHTML = "";
                        value.forEach((tag)=>{
                            createElement("div", d).innerText=tag;
                        });
                    }
                    else{
                        d.innerHTML = value ? value : "-";
                    }
                };
            }




          //Set value
            col.setValue(value);


          //Update the 'rows' map
            rows[key] = {
                setValue: col.setValue
            };


          //Add listener to watch for click events
            var listener = function(e) {
                var inputs = col.getElementsByTagName("input");
                if (inputs.length==0) return;
                var input = inputs[0];
                var className = e.target.className;
                if (input.nodeType === 1 && className != "form-input") {
                    col.setValue(input.orgValue);
                };
            };
            document.body.addEventListener('click', listener);
            listeners.push(listener);
        };


        [
            {"Headquarters": false},
            {"Links": true},
            {"Annual Revenue": false},
            //{"EBITDA": true},
            {"Prime Revenue": false},
            {"Prime Backlog": false},
            {"% Prime Contracts": true},
            {"% Full and Open": false},
            {"# Employees": true},
            {"Customers": false},
            {"Prime Contract Vehicles": false},
            {"Services Concentration": false},
            {"Total Contract Revenue": false},
            {"Last Update": false},
            {"Status": false},
            {"Tags": true}

        ].forEach((o)=>{
            var key = Object.keys(o)[0];
            var editable = o[key];
            if (document.user.accessLevel<3) editable = false;
            addRow(key, "-", editable);
        });



        companyOverview = {
            set: function(key, value){

                if (key==="logo"){
                    if (value){
                        companyLogo.style.backgroundImage = "url('" + value + "')";
                        companyLogo.show();
                    }
                    else{
                        companyLogo.hide();
                    }
                }
                else{
                    rows[key].setValue(value);
                }
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
                code = code.substring(0, 2);
                codes[code] = naiscCodes[code];
            });
            companyOverview.set("Services Concentration",
                [...new Set(Object.values(codes))].join(", ")
            );
        }

        companyOverview.set("Prime Revenue", "$" + addCommas(Math.round(company.estimatedRevenue)));
        companyOverview.set("Prime Backlog", "$" + addCommas(Math.round(company.estimatedBacklog)));


        if (company.recentAwards) companyOverview.set("Status", "Active");
        else companyOverview.set("Status", "Inactive");


        updateCompanyOverview(company);
    };


  //**************************************************************************
  //** updateCompanyOverview
  //**************************************************************************
    var updateCompanyOverview = function(company){
        companyOverview.company = company;


      //Update description
        if (company.description){
            companyDescription.innerText = company.description;
        }


        companyOverview.set("Tags", company.tags);


        if (company.info){
            var employees = parseInt("");

            for (var key in company.info) {
                if (company.info.hasOwnProperty(key)){
                    var val = company.info[key];
                    if (key==="links"){
                        companyOverview.set("Links", val);
                    }
                    /*
                    else if (key==="employees"){
                        val = parseFloat(val+"");
                        if (isNaN(val)) val = null;
                        companyOverview.set("# Employees", val);
                    }
                    */
                }
            }


            if (company.info.edits){
                var edits = company.info.edits;
                for (var key in edits) {
                    if (edits.hasOwnProperty(key)){
                        if (key==="ebitda"){
                            var val = parseFloat(edits[key].value);
                            if (!isNaN(val)){
                                //companyOverview.set("EBITDA", "$" + addCommas(Math.round(val)));
                            }
                        }
                        else if (key==="employees"){
                            employees = parseFloat(edits[key].value+"");
                        }
                    }
                }
            }

            if (company.info.logo){

            }


          //Special case for LinkedIn data
            if (company.info.linkedInProfile){


              //Get logos
                try{

                    var image = company.info.linkedInProfile.logo.image["com.linkedin.common.VectorImage"];
                    var url = image.rootUrl;

                    var smallestImage;
                    var images = {};
                    image.artifacts.forEach((img)=>{
                        var sz = img.height;
                        if (smallestImage){
                            smallestImage = Math.min(sz, smallestImage);
                        }
                        else{
                            smallestImage = sz;
                        }
                        images[sz+""] = url+img.fileIdentifyingUrlPathSegment;
                    });
                    companyOverview.set("logo", images[smallestImage+""]);
                }
                catch(e){
                    //console.log(e);
                }


              //Get employees
                if (isNaN(employees)){
                    employees = parseInt(company.info.linkedInProfile.staffCount+"");
                }

            }


          //Update employees
            companyOverview.set("# Employees", isNaN(employees) ? null : addCommas(employees));


          //Update revenue chart
            if (!isNaN(employees) && revenueChart) revenueChart.update(company);
        }
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
        var data = getMonthRevenue(company, lastUpdate);
        var totalRevenue = data.totalRevenue;
        var previousRevenue = data.previousRevenue;



      //Create main table
        var table = createTable(parent);
        table.className = "revenue-chart";
        table.style.height = "";



      //Create title
        var titleArea = table.addRow().addColumn("chart-title");
        createElement("div", titleArea, "preamble").innerText = "Estimated Annual Revenue*";

        var div = createElement("div", titleArea, {
            width: "100%",
            display: "inline-block"
        });
        var annualRevenue = createElement("div", div, "emphasis");
        annualRevenue.style.display = "inline-block";
        annualRevenue.style.float = "left";
        annualRevenue.innerText = "$" + addCommas(Math.round(company.estimatedRevenue));


        var p = ((company.estimatedRevenue-previousRevenue)/previousRevenue)*100;
        if (previousRevenue===0 && company.estimatedRevenue>0){
            p = 100;
        }
        var change = createElement("div", div, "change " + (p>0 ? "positive" : "negative") );
        change.style.display = "inline-block";
        change.style.float = "left";
        change.style.margin = "6px 0 0 10px";
        change.innerText = round(p<0 ? -p : p, 1) + "%";
        addShowHide(change);


        var monthlyRevenue = createElement("div", titleArea, "footer");
        monthlyRevenue.innerText =
        "$" + addCommas(Math.round(company.estimatedRevenue/12)) + " monthly revenue";

        companyOverview.set("Total Contract Revenue",
        "$" + addCommas(Math.round(totalRevenue-company.estimatedBacklog)) +
        " total revenue from prime contracts since " + (firstDate.substring(0, firstDate.indexOf("-"))));


        var chartArea = table.addRow().addColumn("chart-area");


        var chartLegend = table.addRow().addColumn("chart-legend");
        chartLegend.addItem = function(label, value, line){
            var div = createElement("div", chartLegend);
            addShowHide(div);

            var d = createElement("div", div, "label");
            d.innerText = label;
            label = d;

            var c = createElement("div", div, { display: "flex" });

            var color = line.getColor();
            var style = line.getStyle();
            var width = line.getWidth();
            line = createElement("div", c, "line");
            line.style.borderBottom = width + "px " + style + " " + color;

            d = createElement("div", c, "value");

            var item = {
                label: label,
                line: line,
                value: d,
                update: function(value){
                    d.innerText = "$" + addCommas(Math.round(value));
                },
                show: function(){div.show();},
                hide: function(){div.hide();}
            };

            if (!chartLegend.items) chartLegend.items = {};
            chartLegend.items[label.innerText] = item;

            item.update(value);
            return item;
        };
        chartLegend.getItem = function(label){
            if (chartLegend.items) return chartLegend.items[label];
            return null;
        };
        chartLegend.clear = function(){
            Object.values(chartLegend.items).forEach((item)=>{
                item.update(0);
            });
        };



        var footerArea = table.addRow().addColumn("chart-disclaimer");
        footerArea.innerText =
        "Revenue is based on prime contracts using the last 12 months of data, ending on " + dbDate + ". " +
        "Monthly revenue estimates are based on contract value divided over the period of performance. " +
        "In the case of IDIQ awards, total funding is used instead of contract value. ";


        var div = createElement("div", chartArea, {
            width: "600px",
            height: "300px"
        });

        var lineChart = new bluewave.charts.LineChart(div, {
            xGrid: false,
            yGrid: true,
            yAxisAlign: "right"
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


      //Create otherRevenue dataset
        var otherRevenue = JSON.parse(JSON.stringify(data));
        otherRevenue.forEach((record)=>{
            record.amount = 0;
        });


      //Create line for the otherRevenue
        var otherLine = new bluewave.chart.Line({
            smoothing: "movingAverage",
            smoothingValue: 90, //in months
            width: 3,
            style: "solid",
            color: "#EE9549",
            opacity: 0
        });
        lineChart.addLine(otherLine, otherRevenue, "date", "amount");


      //Add legend
        chartLegend.addItem("Estimated Revenue", 0, otherLine);
        chartLegend.addItem("Prime Revenue", 0, lineAvg);


        var chartElements;


      //Create chart object with a single update() method
        revenueChart = {
            update: function(company){
                chartLegend.clear();


              //Update otherLine with user-defined revenue estimate
                var percentPrime = getPercentPrime(company);
                var revenue = updateRevenue(data, otherRevenue, percentPrime);
                otherLine.setOpacity(percentPrime<100 ? 1 : 0);


              //Show/hide the "Estimated Revenue" legend
                var item = chartLegend.getItem("Estimated Revenue");
                if (percentPrime<100){
                    item.update(revenue.annualRevenue);
                    item.show();
                }
                else item.hide();


              //Show/hide the "Prime Revenue" legend
                var item = chartLegend.getItem("Prime Revenue");
                item.update(company.estimatedRevenue);
                if (percentPrime<100) item.show();
                else item.hide();


              //Update percent change label
                if (percentPrime<100){
                    companyOverview.set("% Prime Contracts", percentPrime + "%");
                    change.hide();
                }
                else{
                    companyOverview.set("% Prime Contracts", "-");
                    change.show();
                }


              //Get employee count
                var employees = parseInt("");
                var linkedIn = parseInt("");
                if (company.info){

                    if (company.info.edits && company.info.edits.employees){
                        employees = parseInt(company.info.edits.employees.value+"");
                    }

                    if (company.info.linkedInProfile){
                        linkedIn = parseInt(company.info.linkedInProfile.staffCount+"");
                    }
                }


              //Get estimated revenue
                get("/RevenueEstimate?primeRevenue=" + company.estimatedRevenue +
                    (isNaN(employees) ? "" : "&employees=" + employees) +
                    (isNaN(linkedIn) ? "" : "&linkedIn=" + linkedIn),{
                    success: function(str){



                      //Create chartElements used to render estimated revenue
                        if (!chartElements){
                            chartElements = {};
                            ["lower range","lower average","midpoint","upper average","upper range"].forEach((key)=>{

                                var d = JSON.parse(JSON.stringify(data));
                                d.forEach((record)=>{
                                    record.amount = 0;
                                });

                                var l = new bluewave.chart.Line({
                                    smoothing: "movingAverage",
                                    smoothingValue: 30, //in months
                                    width: l,
                                    style: "dashed",
                                    color: "#EE9549",
                                    opacity: 0
                                });
                                lineChart.addLine(l, d, "date", "amount");
                                var legend = chartLegend.addItem(key, 0, l);

                                chartElements[key] = {
                                    data: d,
                                    line: l,
                                    legend: legend
                                };
                            });
                        }



                      //Render estimated revenue
                        var estimate = JSON.parse(str);
                        updateEstimates(data, estimate, chartElements, company.estimatedRevenue);


                      //Render "Prime Revenue" legend if there's at least one
                      //revenue estimate rendered
                        var visibleLines = 0;
                        Object.values(chartElements).forEach((o)=>{
                            var line = o.line;
                            if (line.getConfig().opacity>0) visibleLines++;
                        });
                        if (visibleLines>0) chartLegend.getItem("Prime Revenue").show();



                      //Update disclaimer below the chart
                        if (percentPrime<100){
                            footerArea.innerText += " Monthly revenue estimates " +
                            "are further weighted using % prime estimate.";
                        }
                        else{


                          //Update the annual revenue property
                            var keys = ["midpoint", "upper average"];
                            var selectedKey;
                            for (var i=0; i<keys.length; i++){
                                var val = estimate[keys[i]];
                                if (val>company.estimatedRevenue){
                                    revenue.annualRevenue = val;
                                    selectedKey = keys[i];
                                    break;
                                }
                            }


                          //Update disclaimer
                            if (selectedKey){
                                footerArea.innerText += " Monthly revenue estimates " +
                                "are further weighted using " + selectedKey + " estimation.";
                            }
                        }
                    },
                    failure: function(request){
                        if (request.status!=501) alert(request);
                    },
                    finally: function(){

                      //Update the chart
                        lineChart.update();

                      //Update labels for the annual and monthly revenu estimates
                        annualRevenue.innerText = "$" + addCommas(Math.round(revenue.annualRevenue));
                        monthlyRevenue.innerText =
                        "$" + addCommas(Math.round(revenue.annualRevenue/12)) + " monthly revenue";
                        companyOverview.set("Annual Revenue", annualRevenue.innerText + "*");
                    }
                });
            }
        };


      //Update the chart to render the data
        revenueChart.update(company);
    };


  //**************************************************************************
  //** createCustomers
  //**************************************************************************
    var createCustomers = function(company, parent){
        if (!company.recentCustomers || company.recentCustomers.length<2) return;

        createElement("h2", parent).innerText = "Customers";
        createElement("p", parent).innerText =
        "Recent customers based on prime contract awards.";


        var container = createElement("div", parent, "customer-logos");
        company.recentCustomers.forEach((customer)=>{
            var d = createElement("div", container);
            d.style.backgroundImage = "url(/images/logos/" + customer.toLowerCase() + ".svg)";
        });

    };


  //**************************************************************************
  //** createPieCharts
  //**************************************************************************
    var createPieCharts = function(company, parent){
        createElement("h2", parent).innerText = "Revenue Mix";
        createElement("p", parent).innerText =
        "Estimated revenue mix from prime contracts. Revenue is computed using " +
        "the total value of individual awards. The only exception are IDIQs " +
        "where we ignore the total value and use the funded value instead.";


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
            var total = 0;
            Object.keys(kvp).forEach((key)=>{
                var label = key;
                if (label==null || label=="null") label = "Unknown";
                var value = kvp[key];
                total += value;
                data.push({
                    key: label,
                    value: kvp[key]
                });
            });
            data.sort((a, b)=>{
                return b.value-a.value;
            });


          //Create a "other" group using values that make up less than 5% of the pie
            for (var i=0; i<data.length; i++){
                var value = data[i].value;
                var p = value/total;
                if (p<0.05){

                    var numOthers = data.length-i;
                    if (numOthers>1){

                        var other = 0;
                        for (var j=i; j<data.length; j++){
                            other += data[j].value;
                        }

                        data = data.slice(0, i);
                        data.push({
                            key: "Other",
                            value: other
                        });
                    }
                    break;
                }
            }

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
                var desc = "";
                if (isNaisc){
                    if (naiscCodes[d.key]){
                        desc = ": " + naiscCodes[d.key];
                    }
                }

                tr.addColumn({minWidth: "150px"}).innerText = d.key + desc;
                tr.addColumn({textAlign: "right"}).innerText = "$" + addCommas(Math.round(d.value));
            });
        };

        addTable(revenueByCustomer);
        addTable(revenueBySector, true);
        addTable(revenueByType);

    };


  //**************************************************************************
  //** createCurrentContractList
  //**************************************************************************
    var createCurrentContractList = function(company, parent){

        createElement("h2", parent).innerText = "Prime Contracts";
        var p = createElement("p", parent);
        var span = createElement("span", p);
        span.innerText = "Active prime contracts as of " + dbDate + ". ";
        var a = createElement("a", p);
        a.href = "";
        a.innerText = "Click here";
        a.onclick = function(e){
            e.preventDefault();
            createAwardsList(company);
        };
        createElement("span", p).innerText = " to see a full list of current and past awards.";


        var maxHeight = 600;
        var div = createElement("div", parent, "small");
        div.style.height = maxHeight + "px";


        var records = [];
        company.awards.forEach((award)=>{
            if (isAwardActive(award, lastUpdate)){
                records.push(award);
            }
        });

        if (records.length==0){
            var text = span.innerText.substring(1);
            span.innerText = "There are no a" + text;
            companyOverview.set("Status", "Inactive");
            return;
        }

        records.sort((a, b)=>{
            var getVal = function(a){
                var val = a.extendedValue;
                if (isNaN(parseFloat(val+""))) val = a.value;
                if (isNaN(parseFloat(val+""))) val = a.funded;
                if (isNaN(parseFloat(val+""))) val = 0;
                return val;
            };
            return getVal(b)-getVal(a);
        });


      //Load data
        var awardsList = new prospekt.awards.AwardsList(div, config);
        awardsList.update(records, lastUpdate);


      //Resize container as needed
        var rect = awardsList.getRect();
        if (rect.height<maxHeight){
            div.style.height = (rect.height+20) + "px";
            panel.update();
        }


      //Add logic to enable/disable scrolling (prevent double scrolling)
        updateScroll(awardsList, div);

    };


  //**************************************************************************
  //** createAwardsList
  //**************************************************************************
    var createAwardsList = function(company){

        if (!awardDetails){

            var style = config.style.window;
            //TODO: remove padding

            var win = createWindow({
                style: style,
                title: "Awards",
                width: 1200,
                height: 800,
                modal: true
            });


            var style = config.style;
            //TODO: use compact table style
            var div = createElement("div", win.getBody(), {
                width: "100%",
                height: "100%"
            });
            div.className = "small";

            var awardsList = new prospekt.awards.AwardsList(div, {
                style: style
            });


            awardDetails = {
                clear: awardsList.clear,
                update: function(company){

                    var records = company.awards.slice(0, company.awards.length);
                    records.sort((a, b)=>{
                        if (isString(a.date)) a.date = new Date(a.date);
                        if (isString(b.date)) b.date = new Date(b.date);
                        return b.date.getTime() - a.date.getTime();
                    });

                    awardsList.update(records, lastUpdate);
                },
                show: win.show
            };
        }


        awardDetails.clear();
        awardDetails.show();
        awardDetails.update(company);
    };


  //**************************************************************************
  //** createTreeMap
  //**************************************************************************
    var createTreeMap = function(company, parent){


      //Create dataset for the treemap
        var data = [];
        company.awards.forEach((award)=>{
            if (isAwardActive(award, lastUpdate)){
                var val = award.extendedValue;
                if (isNaN(parseFloat(val+""))) val = award.value;
                if (isNaN(parseFloat(val+""))) val = award.funded;
                if (isNaN(parseFloat(val+""))) val = 0;


                data.push({
                    name: award.name,
                    value: val,
                    customer: award.customer
                });
            }
        });


      //Return early if there's not enough data
        if (data.length<2) return;


      //Create header and description
        createElement("h2", parent).innerText = "Contract Mix";
        createElement("p", parent).innerText =
        "Prime contracts grouped by customer.";


      //Create container for the treemap
        var div = createElement("div", parent, {
            position: "relative",
            width: "800px",
            height: "600px"
        });


      //Create treemap
        var treemap = new bluewave.charts.TreeMapChart(div, {
            key: "name",
            value: "value",
            groupBy: "customer",
            shape: "circle",
            showTooltip: true
        });

        treemap.getKeyLabel = function(key, data){
            if (key.length>15) key = key.substring(0, 15) + "...";
            return key;
        };

        treemap.getValueLabel = function(value, data){
            var suffix = "";
            if (value>1000){
                value = value/1000;
                suffix = "K";
                if (value>1000){
                    value = value/1000;
                    suffix = "M";
                }
            }
            value = "$" + addCommas(Math.round(value)) + suffix;
            return value;
        };


      //Render treemap and legend
        treemap.update(data, ()=>{
            var groups = treemap.getGroups();
            var groupNames = Object.keys(groups);
            if (groupNames.length>1){
                var rows = [];
                groupNames.forEach((groupName)=>{
                    var arr = groups[groupName];
                    var value = 0;
                    var color = null;
                    arr.forEach((d)=>{
                        value += d.data.value;
                        if (!color){
                            color = d.rect.style.fill;
                        }
                    });

                    rows.push({key: groupName, value: value, color: color});
                });

                rows.sort(function(a, b){
                    return b.value - a.value;
                });


                var svg = treemap.getSVG().node();
                var legend = createLegend(svg.parentNode);
                rows.forEach((row)=>{
                    legend.addItem(row.key, row.color);
                });
            }
        });
    };


  //**************************************************************************
  //** createOfficerInfo
  //**************************************************************************
    var createOfficerInfo = function(company, parent){


        var mainDiv = createElement("div", parent);
        addShowHide(mainDiv);
        mainDiv.hide();

        var profileDiv = createElement("div", mainDiv);

        var salaryDiv = createElement("div", mainDiv);
        createElement("h2", salaryDiv).innerText = "Executive Salaries";
        createElement("p", salaryDiv).innerText =
        "Salary information extracted from government prime contract awards.";
        addShowHide(salaryDiv);


        var tr = createTable(salaryDiv).addRow();
        var leftCol = tr.addColumn({
            width: "100%",
            verticalAlign: "top"
        });
        var rightCol = tr.addColumn("chart-area");


        var table, lineChart;


        companyOfficers = {
            update: function(company){

                profileDiv.innerHTML = "";
                if (table) table.clear();
                if (lineChart) lineChart.clear();

                if (company.officers.length===0){
                    mainDiv.hide();
                    panel.update();
                    return;
                }



                updateOfficers(company.officers, function(){
                    mainDiv.show();
                    renderProfiles(company, profileDiv);


                  //Separate current and inactive officers
                    var currOfficers = [];
                    var olderOfficers = [];
                    var missingSalaries = 0;
                    var lastYear = lastUpdate.clone().subtract(1, "year");
                    company.officers.forEach((officer)=>{
                        var lastUpdate = moment(new Date(officer.lastUpdate));
                        if (lastUpdate.isBefore(lastYear)){
                            olderOfficers.push(officer);
                        }
                        else{
                            currOfficers.push(officer);
                        }

                        var salary = parseFloat(officer.salary+"");
                        if (isNaN(salary) || salary<=0){
                            officer.salary = 0;
                            missingSalaries++;
                        }
                    });



                  //Show/hide salary panel as needed
                    if (missingSalaries == company.officers.length){
                        salaryDiv.hide();
                        panel.update();
                        return;

                    }
                    else{
                        salaryDiv.show();
                    }


                  //Sort officer groups by salary
                    currOfficers.sort((a, b)=>{
                        return b.salary-a.salary;
                    });
                    olderOfficers.sort((a, b)=>{
                        return b.salary-a.salary;
                    });


                  //Render officers in a grid view
                    if (!table){

                        var div = createElement("div", leftCol, "small");
                        div.style.maxWidth = "750px";
                        div.style.height = "300px";

                      //Create table
                        table = new javaxt.dhtml.Table(div, {
                            style: config.style.table,
                            columns: [
                                {header: 'Name', width:'100%'},
                                {header: 'Years of Service', width:'100', align: 'center'},
                                {header: 'Salary', width:'75', align: 'right'},
                                {header: 'Active', width:'75', align: 'center'}
                            ]
                        });


                      //Add logic to enable/disable scrolling (prevent double scrolling)
                        updateScroll(table, div);
                    }


                    var addRow = function(officer, active){


                      //Get years of service
                        var yearsOfService = "";
                        if (officer.info && officer.info.salaryHistory){
                            var salaryHistory = officer.info.salaryHistory;
                            if (salaryHistory.length>0){
                                salaryHistory.sort((a,b)=>{
                                    return a.date.localeCompare(b.date);
                                });
                                var endDate = active ? lastUpdate : moment(salaryHistory[salaryHistory.length-1].date);
                                var yearsAgo = endDate.diff(salaryHistory[0].date, 'years', true);
                                yearsOfService = Math.floor(yearsAgo);
                                if (yearsOfService<1) yearsOfService = "<1";
                                else yearsOfService = yearsOfService + "+";
                            }
                        }
                        //console.log(officer.info.salaryHistory[0], officer.info.salaryHistory[]);


                      //Get salary
                        var salary = parseFloat(officer.salary+"");
                        if (isNaN(salary) || salary<=0) salary = "";
                        else salary = "$" + addCommas(Math.round(salary));


                        table.addRow(
                            officer.person.fullName,
                            yearsOfService,
                            salary,
                            active===true ? true : "-"
                        );
                    };


                  //Add officers
                    currOfficers.forEach((officer)=>{
                        addRow(officer, true);
                    });
                    olderOfficers.forEach((officer)=>{
                        addRow(officer);
                    });

                    table.update();
                    table.disableScroll();


                  //Render salary history
                    if (!lineChart){
                        var div = createElement("div", rightCol, {
                            width: "600px",
                            height: "300px"
                        });
                        lineChart = new bluewave.charts.LineChart(div, {
                            xGrid: false,
                            yGrid: true
                        });
                    }


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

                    panel.update();
                });


            }
        };

        companyOfficers.update(company);
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
            get("CompanyOfficer?id=" + officer.id, {
                success: function(text){
                    merge(officer, JSON.parse(text));
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
  //** renderProfiles
  //**************************************************************************
    var renderProfiles = function(company, parent){
        var officers = company.officers;
        if (officers.length===0) return;


      //Create profiles
        var profiles = [];
        var others = [];
        officers.forEach((officer)=>{
            if (!officer.person.info) return;

            var profile = {};

            var title = officer.title;
            if (title) profile.title = title;

            var bio = officer.info.bio;
            if (bio) profile.bio = bio;

            var linkedIn = officer.person.info.linkedInProfile;
            if (linkedIn && !isEmpty(linkedIn)){
                profile.linkedIn = linkedIn;
                if (linkedIn.experience){
                    for (var i=0; i<linkedIn.experience.length; i++){
                        var experience = linkedIn.experience[i];

                        var companyName = experience.companyName;
                        if (matchCompany(companyName, company.name)){

                            if (!profile.title) profile.title = experience.title;

                            if (experience.timePeriod){

                                var startDate = experience.timePeriod.startDate.year;
                                var endDate;
                                if (experience.timePeriod.endDate) endDate = experience.timePeriod.endDate.year;

                                profile.startDate = startDate;
                                profile.endDate = endDate;
                            }

                            break;
                        }

                    }
                }
            }

            if (!isEmpty(profile)){
                var person = officer.person;
                profile.name = person.firstName + " " + person.lastName;
                profiles.push(profile);
            }
            else{
                others.push(officer);
            }

        });
        if (profiles.length===0) return;


        profiles.sort((a, b)=>{
            return rankTitle(b.title)-rankTitle(a.title);
        });


        createElement("h2", parent).innerText = "Leadership Team";
        profiles.forEach((profile)=>{
            if (!profile || isEmpty(profile)) return;
            var linkedIn = profile.linkedIn;
            if (!linkedIn) linkedIn = {};


          //Create new section
            var section = createElement("div", parent, {
                display: "inline-block",
                width: "100%"
            });


          //Add profile pic
            var div = createElement("div", section, "profile-pic");
            if (linkedIn.displayPictureUrl && linkedIn.img_200_200){
                div.style.backgroundImage = "url('" + linkedIn.displayPictureUrl + linkedIn.img_200_200 + "')";
            }


          //Add name
            createElement("h3", section, "employee-name").innerText = profile.name;


          //Add title
            if (profile.title){
                createElement("div", section, "employee-title").innerText = profile.title;
            }


          //Add dates
            if (profile.startDate){
                createElement("p", section, "employment-dates").innerText =
                profile.startDate + "-" + (profile.endDate?profile.endDate:"Present");
            }


            /*
            if (linkedIn.experience){
                for (var i=0; i<linkedIn.experience.length; i++){
                    var experience = linkedIn.experience[i];

                    var companyName = experience.companyName;
                    if (matchCompany(companyName, company.name)){

                    }
                }
            }
            */

            if (profile.bio){
                var p = createElement("p", section);
                p.innerText = profile.bio;
            }


          //Add linkedin summary
            var summary = linkedIn.summary;
            if (!summary) summary = linkedIn.headline;
            if (summary){

                var p = createElement("p", section);
                p.innerText = '"' + summary + '" - ';

                var a = createElement("a", p);
                a.innerText = "LinkedIn";
                a.href = "https://www.linkedin.com/in/" + linkedIn.public_id;
            }
        });
        panel.update();
    };


  //**************************************************************************
  //** rankTitle
  //**************************************************************************
  /** Returns a rank (number) for a given title
   */
    var rankTitle = function(title){
        if (!title) return 0;


      //Prep title
        var arr = title.split(" ");
        for (var i=0; i<arr.length; i++){
            var word = arr[i].toLowerCase();
            if (word=="chief"){
                var letters = ["c"];
                for (var j=i+1; j<arr.length; j++){
                    var w = arr[j].toLowerCase();
                    var l = w.substring(0, 1);
                    letters.push(l);
                    if (w=="officer"){
                        title = letters.join("") + " " + title;
                        break;
                    }
                }
                break;
            }
            else{

                var l = word.substring(0, 1);
                if (l=="c" && word.length==3){
                    title = word + " " + title;
                }

            }
        }


      //Return rank
        arr = title.split(" ");
        var prevWord = "";
        for (var i=0; i<arr.length; i++){
            var word = arr[i].toLowerCase();
            var l = word.substring(0, 1);

          //C-suite
            if (l=="c" && word.length==3){
                if (word=="ceo") return 5.5;
                if (word=="coo") return 5.4;
                if (word=="cto") return 5.3;
                return 5;
            }

          //Founders and owners
            if (word=="founder" || word=="owner"){
                return 4;
            }

          //President and vice-president
            if (word=="president"){
                if (prevWord=="vice"){
                    return 3;
                }
                return 3.8;
            }

          //Executive vice president
            if (word=="evp"){
                return 3.4;
            }
            if (word=="executive" || word=="evp"){
                var nextWords = [];
                for (var j=i+1; j<arr.length; j++){
                    var w = arr[j].toLowerCase();
                    nextWords.push(w);
                }
                nextWords = nextWords.join(" ");
                if (nextWords.indexOf("vp")==0 || nextWords.indexOf("vice president")==0){
                    return 3.4;
                }
            }

          //Vice president
            if (word=="vp"){
                return 3;
            }

          //Directors
            if (word=="director"){
                if (prevWord=="executive" || prevWord=="senior" || prevWord=="sr."){
                    return 2.5;
                }
                return 2;
            }
            prevWord = word;
        }

        return 1;
    };


  //**************************************************************************
  //** matchCompany
  //**************************************************************************
  /** Performs a simple comparison of company names to see if they are similar
   */
    var matchCompany = function(source, target){
        source = source.toLowerCase();
        target = target.toLowerCase();
        if (source==target) return true;

        var a = target.split(" ");
        var b = source.split(" ");
        [a, b].forEach((arr)=>{
            arr.forEach((word, i)=>{
                var len = word.length;
                if (word.lastIndexOf(",")===len-1) word = word.substring(0, len-1).trim();
                if (word.lastIndexOf(".")===len-1) word = word.substring(0, len-1).trim();
                if (word.length<len) arr[i] = word;
            });
        });

        if (a.length==b.length){
            var containsMismatch = false;
            for (var i=0; i<a.length; i++){
                if (a[i]!=b[i]){
                    containsMismatch = true;
                    break;
                }
            }
            if (!containsMismatch) return true;
        }

        if (a[0]===b[0]) return true;
        var numMatches = 0;
        for (var i=0; i<a.length; i++){

        }
        return false;
    };


  //**************************************************************************
  //** createMap
  //**************************************************************************
    var createMap = function(company, parent){
        if (company.addresses.length===0) return;


        updateAddresses(company.addresses, function(){

            company.addresses.sort((a,b)=>{
                return b.date.getTime()-a.date.getTime();
            });


          //Update headquaters in company info
            var companyAddress = company.addresses[0];
            var address = companyAddress.address;
            var headquarters = "";
            if (address){
                if (address.state){
                    headquarters = address.state;
                    if (address.city) headquarters = address.city + ", " + headquarters;
                }
                else{
                    if (address.city){
                        headquarters = address.city;
                        if (address.country) headquarters =  headquarters + ", " + address.country;
                    }
                    else{
                        if (address.country) headquarters = address.country;
                    }
                }

                companyOverview.set("Headquarters", headquarters);
            }




          //Update search link
            var searchTerms = "\"" + company.name + "\"";
            if (headquarters.length>0) searchTerms += " " + headquarters;
            companyOverview.set("Links", {
                "Search": "https://www.google.com/search?q=" + encodeURIComponent(searchTerms)
            });


            /*
            company.addresses.forEach((companyAddress)=>{
                var address = companyAddress.address;
                console.log(companyAddress.date, address.city, address.state);
            });
            */

        });
    };


  //**************************************************************************
  //** updateOfficers
  //**************************************************************************
    var updateAddresses = function(companyAddresses, callback){

        var queue = [];
        companyAddresses.forEach((companyAddress)=>{
            if (companyAddress.date) companyAddress.date = new Date(companyAddress.date);
            if (!companyAddress.address) queue.push(companyAddress);
        });


        var getNextAddress = function(){
            if (queue.length===0){
                callback();
                return;
            }
            var companyAddress = queue.shift();
            get("Address?id=" + companyAddress.addressID, {
                success: function(text){
                    companyAddress.address = JSON.parse(text);
                    getNextAddress();
                },
                failure: function(){
                    getNextAddress();
                }
            });
        };
        getNextAddress();
    };


  //**************************************************************************
  //** editLinks
  //**************************************************************************
    var editLinks = function(company){

        if (!linkEditor){

            var items = [];
            ["Website","LinkedIn","Facebook","Twitter"].forEach((item)=>{
                items.push({
                    name: item,
                    label: item,
                    type: "text",
                    required: false
                });
            });


            var win = createWindow({
                style: config.style.window,
                title: "Edit Links",
                width: 600,
                modal: true
            });

            var form = new javaxt.dhtml.Form(win.getBody(), {
                style: config.style.form,
                items: items,
                buttons: [
                    {
                        name: "Submit",
                        onclick: function(){

                          //Update company info
                            if (!company.info) company.info = {};
                            company.info.links = {};
                            var links = form.getData();
                            for (var key in links) {
                                if (links.hasOwnProperty(key)){
                                    var link = links[key].trim();
                                    if (link.length>0){
                                        if (!isValidUrl(link)){
                                            form.showError("Invalid URL", form.findField(key));
                                            return;
                                        }
                                        company.info.links[key] = link;
                                    }
                                }
                            }
                            updateCompanyInfo(company);


                          //Update company profile
                            companyOverview.set("Links", company.info.links);


                            win.close();
                        }
                    },
                    {
                        name: "Cancel",
                        onclick: function(){
                            win.close();
                        }
                    }
                ]
            });

            form.onChange = function(input, value){
                form.hideError(input);
            };


            linkEditor = {
                show: win.show,
                update: function(company){
                    form.clear();
                    if (company.info && company.info.links){
                        var links = company.info.links;
                        for (var key in links) {
                            if (links.hasOwnProperty(key)){
                                var link = links[key];
                                form.setValue(key, link);
                            }
                        }
                    }
                }
            };

        }

        linkEditor.update(company);
        linkEditor.show();
    };


  //**************************************************************************
  //** editTags
  //**************************************************************************
    var editTags = function(company){
        if (!tagEditor){
            var currCompany;

          //Create popup window
            var win = createWindow({
                style: config.style.window,
                title: "Edit Tags",
                width: 400,
                height: 300,
                modal: true,
                buttons: [
                    {
                        name: "Save",
                        onclick: function(){

                            var payload = {
                                id: currCompany.id,
                                tags: tagEditor.getValues().tags.join(",")
                            };

                            post("UpdateCompanyInfo", JSON.stringify(payload), {
                                success:function(str){
                                    var company = JSON.parse(str);
                                    var tags = company.tags;
                                    currCompany.tags = company.tags;
                                    companyOverview.set("Tags", tags);
                                },
                                failure:function(){}
                            });

                            win.close();
                        }
                    },
                    {
                        name: "Cancel",
                        onclick: function(){
                            win.close();
                        }
                    }
                ]

            });


          //Create tag editor from the tag filter
            tagEditor = new prospekt.filters.TagFilter(win.getBody(), config);
            tagEditor.el.style.height = "100%";
            tagEditor.show = win.show;

            var update = tagEditor.update;
            tagEditor.update = function(company){
                currCompany = company;
                update(company);
            };

        }
        tagEditor.update(company);
        tagEditor.show();
    };


  //**************************************************************************
  //** editEmployees
  //**************************************************************************
    var editEmployees = function(company){

        if (!employeeEditor){

          //Create popup window
            var win = createWindow({
                style: config.style.window,
                title: "Edit Employees",
                width: 400,
                modal: true,
                buttons: [
                    {
                        name: "Save",
                        onclick: function(){

                          //Get employees
                            var employees = form.getValue("employees").replaceAll(",","").trim();
                            if (employees.length>0){
                                employees = parseInt(employees+"");
                                if (isNaN(employees) || employees<0){
                                    form.showError("Invalid number of employees", form.findField("employees"));
                                    return false;
                                }
                            }
                            else{
                                employees = null;
                            }


                          //Update company info
                            if (!company.info) company.info = {};
                            if (!company.info.edits) company.info.edits = {};
                            company.info.edits.employees = {
                                value: employees,
                                userID: document.user.id,
                                date: new Date().getTime()
                            };
                            updateCompanyInfo(company);


                          //Update company profile
                            var numEmployees = parseInt(form.getValue("linkedIn"));
                            if (employees) numEmployees = employees;
                            companyOverview.set("# Employees", addCommas(numEmployees));

                            revenueChart.update(company);

                            win.close();
                        }
                    },
                    {
                        name: "Cancel",
                        onclick: function(){
                            win.close();
                        }
                    }
                ]

            });


          //Create form
            var form = new javaxt.dhtml.Form(win.getBody(), {
                style: config.style.form,
                items: [
                    {
                        name: "employees",
                        label: "Employee Estimate",
                        type: "text"
                    },
                    {
                        name: "linkedIn",
                        label: "LinkedIn Estimate",
                        type: "text"
                    }
                ]
            });
            form.disableField("linkedIn");
            form.onChange = function(formInput, value){
                var employees = value.replaceAll(",","").trim();
                employees = parseInt(employees+"");
                if (!isNaN(employees)) form.hideError(formInput);
            };


          //Create employeeEditor object
            employeeEditor = {
                show: win.show,
                update: function(company){
                    form.hideError("employees");

                  //Get employees from user edits
                    var employees;
                    if (company.info && company.info.edits){
                        if (company.info.edits.employees){
                            employees = parseInt(company.info.edits.employees.value+"");
                        }
                    }
                    form.setValue("employees", isNaN(employees) ? "" : employees);


                  //Get employees from linkedIn
                    var staffCount = parseInt(company.info.linkedInProfile.staffCount+"");
                    form.setValue("linkedIn", staffCount);
                }
            };
        }

        employeeEditor.update(company);
        employeeEditor.show();
    };


  //**************************************************************************
  //** editRevenue
  //**************************************************************************
    var editRevenue = function(company){

        if (!revenueEditor){

          //Create popup window
            var win = createWindow({
                style: config.style.window,
                title: "Edit Revenue",
                width: 615,
                height: 540,
                modal: true,
                buttons: [
                    {
                        name: "Save",
                        onclick: function(){
                            var edits = revenueEditor.getValue();
                            var percentPrime = edits.percentPrime;


                          //Update company info
                            if (!company.info) company.info = {};
                            if (!company.info.edits) company.info.edits = {};
                            company.info.edits.percentPrime = {
                                value: percentPrime,
                                userID: document.user.id,
                                date: new Date().getTime()
                            };
                            updateCompanyInfo(company);


                          //Update company profile
                            if (percentPrime<100) percentPrime+="%";
                            else percentPrime = "-";
                            companyOverview.set("% Prime Contracts", percentPrime);
                            revenueChart.update(company);

                            win.close();
                        }
                    },
                    {
                        name: "Cancel",
                        onclick: function(){
                            win.close();
                        }
                    }
                ]

            });

            var parent = win.getBody();



          //Create header
            createElement("div", parent, "").innerText = "Estimated Annual Revenue";
            var annualRevenue = createElement("div", parent, "revenue-estimate");



          //Create line chart
            var div = createElement("div", parent, {
                width: "600px",
                height: "300px",
                padding: "0 0 20px 0"
            });
            div.className = "chart-area";
            var lineChart = new bluewave.charts.LineChart(div, {
                animationSteps: 0,
                xGrid: false,
                yGrid: true
            });


          //Create sliders
            var div = createElement("div", parent, "revenue-sliders");
            var table = createTable(div);
            var tr = table.addRow();
            tr.addColumn("form-label").innerText = "% Prime";
            var primeSlider = new javaxt.dhtml.Slider(tr.addColumn({width: "100%"}), {
                units: "percent"
            });
            var primeVal = createElement("input", tr.addColumn(), "form-input");
            var tr = table.addRow();
            tr.addColumn("form-label").innerText = "Multiplier";
            var mSlider = new javaxt.dhtml.Slider(tr.addColumn({width: "100%"}), {
                units: "percent"
            });
            var mVal = createElement("input", tr.addColumn(), "form-input");



            revenueEditor = {
                show: win.show,
                update: function(company){
                    lineChart.clear();

                    var data = getMonthRevenue(company, lastUpdate);


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


                  //Create otherRevenue dataset with all zeros
                    var otherRevenue = JSON.parse(JSON.stringify(data));
                    otherRevenue.forEach((record)=>{
                        record.amount = 0;
                    });


                  //Create line for the otherRevenue
                    var otherLine = new bluewave.chart.Line({
                        smoothing: "movingAverage",
                        smoothingValue: 90, //in months
                        width: 3,
                        style: "solid",
                        color: "#EE9549",
                        opacity: 0
                    });
                    lineChart.addLine(otherLine, otherRevenue, "date", "amount");



                  //Update the chart to render the data
                    lineChart.update();


                    var timer;
                    primeSlider.onChange = function(val){

                      //Update input
                        primeVal.value = round(val, 1) + "%";

                      //Update chart
                        if (timer) clearTimeout(timer);
                        timer = setTimeout(function(){

                            var percentPrime = round(primeSlider.getValue(), 1);
                            var revenue = updateRevenue(data, otherRevenue, percentPrime);
                            otherLine.setOpacity(percentPrime<100 ? 1 : 0);
                            lineChart.update();

                            annualRevenue.innerText = "$" + addCommas(Math.round(revenue.annualRevenue));

                        }, 500);
                    };

                    var percentPrime = getPercentPrime(company);
                    primeSlider.setValue(percentPrime, true);
                    primeSlider.onChange(percentPrime);


                    mSlider.onChange = function(val){
                        mVal.value = round(val/100, 1);
                    };
                    mSlider.setValue(10, true);
                    mSlider.onChange(10);
                },
                getValue: function(){
                    return {
                        percentPrime: round(primeSlider.getValue(), 1)
                    };
                }
            };

        }

        revenueEditor.update(company);
        revenueEditor.show();
    };


  //**************************************************************************
  //** getPercentPrime
  //**************************************************************************
  /** Returns a user-defined percent prime contract value from the company
   *  info
   */
    var getPercentPrime = function(company){
        var percentPrime = 100;
        if (company.info && company.info.edits){
            if (company.info.edits.percentPrime){
                var obj = company.info.edits.percentPrime;
                var val = parseFloat(obj.value+"");
                if (!isNaN(val)) percentPrime = val;
            }
        }
        return percentPrime;
    };


  //**************************************************************************
  //** updateRevenue
  //**************************************************************************
  /** Used to update the "otherRevenue" using a given "percentPrime" value
   */
    var updateRevenue = function(data, otherRevenue, percentPrime){

        var annualRevenue = 0;
        var today = parseInt(lastUpdate.format("YYYYMMDD"));
        var lastYear = parseInt(lastUpdate.clone().subtract(1, "year").format("YYYYMMDD"));
        for (var i=0; i<data.length; i++){
            var primeRev = data[i].amount;
            var otherRev = 0;
            if (primeRev>0) otherRev = primeRev/(percentPrime/100.0);
            otherRevenue[i].amount = otherRev;


            var d = parseInt(otherRevenue[i].date.replaceAll("-",""));
            if (d>=lastYear && d<=today){
                if (percentPrime<100){
                    annualRevenue += otherRev;
                }
                else{
                    annualRevenue += primeRev;
                }
            }
        }

        return {
            annualRevenue: annualRevenue
        };
    };


  //**************************************************************************
  //** updateEstimates
  //**************************************************************************
  /** Used to update revenue estimates for the revenue chart
   *  @param data Monthly revenue from prime contracts
   *  @param revenueEstimates JSON object with annual revenue estimates
   *  @param chartElements JSON object with lines and data (array of
   *  monthly revenue estimates for each line).
   *  @param annualPrimeRevenue Total annual revenue from prime contracts
   */
    var updateEstimates = function(data, revenueEstimates, chartElements, annualPrimeRevenue){

        var today = parseInt(lastUpdate.format("YYYYMMDD"));
        var lastYear = parseInt(lastUpdate.clone().subtract(1, "year").format("YYYYMMDD"));
        for (var i=0; i<data.length; i++){
            var primeRev = data[i].amount;


            Object.keys(revenueEstimates).forEach((key)=>{
                var estimatedRevenue = revenueEstimates[key];
                var p = estimatedRevenue/annualPrimeRevenue;
                var o = chartElements[key];
                var d = o.data;
                var line = o.line;
                var legend = o.legend;


                if (key=="lower average" || key=="upper average" || key=="midpoint"){
                    line.setOpacity(0.8);
                }
                else{
                    line.setOpacity(0);
                    p = 0;
                }


                if (p>1){

                    d[i].amount = primeRev*p;


                  //Weigh the data for the current year to bias the moving average
                    var day = parseInt(d[i].date.replaceAll("-",""));
                    if (day>=lastYear && day<=today){
                        //d[i].amount = estimatedRevenue/12;
                    }


                    line.setOpacity(0.8);

                    legend.update(estimatedRevenue);
                    legend.show();
                }
                else{
                    d[i].amount = 0;
                    line.setOpacity(0);
                    legend.hide();
                }

            });
        }
    };


  //**************************************************************************
  //** updateCompanyInfo
  //**************************************************************************
  /** Used to save edits and other properties stored in the "info" object for
   *  a company.
   */
    var updateCompanyInfo = function(company){
        if (company && company.info){
            post("UpdateCompanyInfo?id=" + company.id, company.info, {
                success: function(str){
                    //TODO: show message
                },
                failure: function(){
                    //TODO: show failure
                }
            });
        }
    };


  //**************************************************************************
  //** isValidUrl
  //**************************************************************************
  /** Returns true if the given string is a valid URL
   */
    var isValidUrl = function(url) {
        if (!url) return false;
        url += "";
        url = url.trim();
        if (url.length==0) return false;
        return URL.canParse(url) && url.toLowerCase().startsWith('http');
    };


  //**************************************************************************
  //** createLegend
  //**************************************************************************
    var createLegend = function(parent){

        var legend = createElement("div", parent, "chart-legend");
        legend.addItem = function(label, color){
            var row = createElement("div", legend);
            if (color){
                var dot = createElement("div", row, "dot");
                dot.style.backgroundColor = color;
            }
            createElement("span", row).innerHTML = label;
        };
        legend.clear = function(){
            legend.innerHTML = "";
        };
        //javaxt.dhtml.utils.addShowHide(legend);
        return legend;
    };


  //**************************************************************************
  //** updateScroll
  //**************************************************************************
    var updateScroll = function(table, div){


      //Disable scrolling initially
        table.disableScroll();


      //Watch for scroll events in the table. If the user started scrolling
      //outside the table, nothing happens. But if a user starts scrolling
      //inside the table, then we will enable scrolling in the table, and
      //disable scrolling in the panel
        table.onScroll = function(){
            var currTime = new Date().getTime();
            if (currTime-panel.lastScrollEvent>500){
                panel.disableScroll();
                table.enableScroll();
            }
        };


      //Watch for wheel and click events. If the event originates outside the
      //table, disable the
        var listener = function(e) {
            if (panel.isScrollEnabled()) return;

            var rect = javaxt.dhtml.utils.getRect(div);
            if (e.clientX>=rect.left && e.clientX<=rect.right){
                if (e.clientY>=rect.top && e.clientY<=rect.bottom){
                    return;
                }
            }

            if (table.isScrollEnabled()){
                table.disableScroll();
                panel.enableScroll();
            }
        };
        ["click", "wheel"].forEach((event)=>{
            document.body.addEventListener(event, listener);
            listeners.push(listener);
        });

    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createClipboard = javaxt.dhtml.utils.createClipboard;
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var isElement = javaxt.dhtml.utils.isElement;
    var isString = javaxt.dhtml.utils.isString;
    var isArray = javaxt.dhtml.utils.isArray;
    var isEmpty = javaxt.dhtml.utils.isEmpty;
    var merge = javaxt.dhtml.utils.merge;
    var round = javaxt.dhtml.utils.round;
    var post = javaxt.dhtml.utils.post;
    var get = javaxt.dhtml.utils.get;


    var createOverflowPanel = prospekt.utils.createOverflowPanel;
    var getMonthRevenue = prospekt.utils.getMonthRevenue;
    var parseResponse = prospekt.utils.parseResponse;
    var getNaicsCodes = prospekt.utils.getNaicsCodes;
    var createChiclet = prospekt.utils.createChiclet;
    var isAwardActive = prospekt.utils.isAwardActive;
    var createWindow = prospekt.utils.createWindow;
    var addCommas = prospekt.utils.addCommas;

    init();

};