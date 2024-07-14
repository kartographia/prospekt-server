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

    var companyList, companyProfile, bookmarks; //panels
    var bookmarkCreator, notes; //popup
    var waitmask;
    var filter = {};
    var extraParams = {};
    var lastUpdate;
    var title;
    var naiscCodes;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);

        if (!config.waitmask || !config.waitmask.el.parentNode)
        config.waitmask = new javaxt.express.WaitMask(document.body);
        waitmask = config.waitmask;


        var div = createElement("div", parent, "company-panel center");
        createList(div);
        createProfile(div);

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

        for (var key in extraParams) {
            if (extraParams.hasOwnProperty(key)){
                extraParams[key] = "";
            }
        }

        companyProfile.companyID = null;
        companyProfile.clear();
        companyProfile.hide();
        bookmarks.clear();
        bookmarks.hide();
        companyList.clear();
        companyList.show();

        if (bookmarkCreator) bookmarkCreator.hide();
        if (notes) notes.hide();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(){
        me.clear();


      //Enable 'popstate' listener
        enablePopstateListener();


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


        var companyParams = document.user.preferences.get("CompanyParams");
        if (companyParams){
            for (var key in companyParams) {
                if (companyParams.hasOwnProperty(key)){
                    extraParams[key] = companyParams[key];
                }
            }
        }


        getNaicsCodes(function(naics){
            naiscCodes = naics;

            get("lastUpdate?source=Awards", {
                success: function(dbDate){ //'2024-02-08'

                    dbDate = moment(new Date(dbDate)).subtract(1, "month").format("YYYY-MM-") + "01";
                    lastUpdate = moment(new Date(dbDate)).add(1, "month").subtract(1, "second");


                    title = document.title;
                    updateHistory({
                        view: "list",
                        title: title,
                        url: window.location.href
                    });


                  //Update list or jump directly into the profile depending on the url
                    var uei = getParameter("uei");
                    if (uei && uei.length>0){

                        get("companies?&fields=id,name&format=json&uei="+uei,{
                            success: function(str){
                                var companies = JSON.parse(str);
                                if (companies.length>0){
                                    var company = companies[0];
                                    companyList.showProfile(company.id);

                                  //Update history
                                    var url = window.location.href;
                                    var idx = url.indexOf("?");
                                    if (idx>-1) url = url.substring(0, idx);
                                    updateHistory({
                                        view: "list",
                                        title: title,
                                        url: url
                                    });
                                    addHistory({
                                        view: "profile",
                                        title: company.name,
                                        companyID: company.id,
                                        url: "?tab=companies&uei="+uei
                                    });

                                  //Update list after short delay
                                    setTimeout(()=>{
                                        companyList.update();
                                    },2000);

                                }
                                else{
                                    companyList.update();
                                }
                            },
                            failure: function(){
                                companyList.update();
                            }
                        });
                    }
                    else{
                        companyList.update();
                    }

                },
                failure: function(request){
                    alert(request);
                }
            });

        });


    };


  //**************************************************************************
  //** notify
  //**************************************************************************
    this.notify = function(op, model, id, userID){
        companyList.notify(op, model, id, userID);
        companyProfile.notify(op, model, id, userID);
        bookmarks.notify(op, model, id, userID);
    };


  //**************************************************************************
  //** createList
  //**************************************************************************
  /** Used to create a list view of companies
   */
    var createList = function(parent){

      //Create main div
        var div = createElement("div", parent, {
            width: "100%",
            height: "100%"
        });



      //Create table with toolbar and body
        var table = createTable(div);
        var toolbar = createToolBar(table.addRow().addColumn(), config);
        var body = table.addRow().addColumn({height:"100%"});


      //Populate toolbar with buttons
        toolbar.addButton("Customer", prospekt.filters.CustomerFilter);
        toolbar.addButton("NAICS", prospekt.filters.NaicsFilter);
        toolbar.addButton("Revenue", prospekt.filters.RevenueFilter);
        toolbar.addButton("More", prospekt.filters.CompanyFilter);
        var resetButton = createElement("div", toolbar.el, "toolbar-button reset noselect");
        resetButton.innerText = "Reset Filters";
        resetButton.onclick = function(e){

            if (toolbar.isDisabled()){
                e.stopPropagation();
                return;
            }

            var orgFilter = JSON.parse(JSON.stringify(filter));
            for (var key in filter) {
                if (filter.hasOwnProperty(key)){
                    filter[key] = "";
                }
            }
            filter.recent_award_val = ">1";
            filter.estimated_revenue = "";


            var orgParams = JSON.parse(JSON.stringify(extraParams));
            for (var key in extraParams) {
                if (extraParams.hasOwnProperty(key)){
                    extraParams[key] = "";
                }
            }

            toolbar.hideMenus();
            if (isDirty(filter, orgFilter) || isDirty(extraParams, orgParams)){
                document.user.preferences.set("CompanyFilter", filter);
                document.user.preferences.set("CompanyParams", extraParams);
                companyList.update();
            }
        };

        var toggleView = createElement("div", toolbar.el, "button-group");
        toggleView.style.float = "right";
        toggleView.style.margin = "0 5px";
        var folderButton = createButton(toggleView, {
            label: "",
            icon: "fas fa-folder",
            toggle: true,
            selected: false
        });
        folderButton.onClick = function(){
            listButton.toggle();
            toolbar.disable();
            companyList.hide();
            bookmarks.show();
        };
        var listButton = createButton(toggleView, {
            label: "",
            icon: "fas fa-list",
            toggle: true,
            selected: true
        });
        listButton.onClick = function(){
            folderButton.toggle();
            toolbar.enable();
            bookmarks.hide();
            companyList.show();
        };


      //Watch for toolbar changes (filter updates)
        toolbar.onChange = function(field, values){
            //console.log(field, values);
            var orgFilter = JSON.parse(JSON.stringify(filter));
            var orgParams = JSON.parse(JSON.stringify(extraParams));


            if (field==="Search"){
                if (values && values.length>0){
                    values = values.trim();
                    if (values.indexOf(" ")===-1){
                        filter.name = "'" + values.toUpperCase() + "%'" +
                        " OR company.name like " + "'% " + values.toUpperCase() + "%'";
                    }
                    else{
                        filter.name = "'" + values.toUpperCase() + "%'";
                    }
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
                if (naics && naics.length>0){
                    filter.recent_naics = naics.join(",");
                }
                else{
                    delete filter["recent_naics"];
                }
            }
            else if (field==="Customer"){
                var customers = values["customers"];
                if (customers && customers.length>0){
                    filter.recent_customers = customers.join(",");
                }
                else{
                    delete filter["recent_customers"];
                }
            }
            else if (field==="More"){
                var likes = values["likes"];
                if (likes){
                    filter.likes = likes;
                }
                else{
                    delete filter["likes"];
                }


              //Special case for orderby
                var orderby = values["orderby"];
                if (orderby){
                    if (orderby==="estimated_revenue") orderby += " desc";
                    extraParams.orderby = orderby + ",id";
                }
                else{
                    delete extraParams.orderby;
                }
            }


            if (isDirty(filter, orgFilter) || isDirty(extraParams, orgParams)){
                document.user.preferences.set("CompanyFilter", filter);
                document.user.preferences.set("CompanyParams", extraParams);
                companyList.update();
            }
        };


      //Override the update() method in the toolbar
        var updateToolbar = toolbar.update;
        toolbar.update = function(){


          //Create filter for the toolbar
            var toolbarFilter = {};
            for (var key in filter) {
                if (filter.hasOwnProperty(key)){
                    var val = filter[key];

                    if (key==="name"){

                        if (val.indexOf("'")===0 && val.lastIndexOf("'")===val.length-1){
                            val = val.substring(1, val.length-1).trim();
                            val = val.replaceAll("%", " ").trim();
                            val = val.replace("OR company.name like","");
                            var v = {};
                            val.split(" ").forEach((word, i)=>{
                                word = word.trim();
                                if (word.length==0) return;
                                if (i>0 && word=="OR") return;
                                if (word.indexOf("'")===0) word = word.substring(1).trim();
                                if (word.lastIndexOf("'")===word.length-1) word = word.substring(0, word.length-1).trim();
                                if (!v[word]) v[word] = true;
                            });
                            val = Object.keys(v).join(" ").trim();
                        }

                        toolbarFilter.Search = val;

                    }
                    else if (key==="recent_naics"){
                        toolbarFilter.NAICS = {
                            naics: val
                        };
                    }
                    else if (key==="recent_customers"){
                        toolbarFilter.Customer = {
                            customers: val
                        };
                    }
                    else if (
                        key==="recent_award_val" ||
                        key==="estimated_revenue"){

                        var f = toolbarFilter.Revenue;
                        if (!f){
                            f = {};
                            toolbarFilter.Revenue = f;
                        }


                        if (!isArray(val)) val = [val];

                        val.forEach((v)=>{
                            if (v.indexOf(">")==0) f.min = parseFloat(v.substring(1));
                            if (v.indexOf("<")==0) f.max = parseFloat(v.substring(1));
                        });

                        if (!(isNaN(f.min) && isNaN(f.max))){
                            f.type = key==="recent_award_val" ? "Awards" : "Revenue";
                        }

                    }
                    else {
                        if (!toolbarFilter.More) toolbarFilter.More = {};

                        if (key==="likes"){
                            if (val) toolbarFilter.More.likes = val;
                            else delete toolbarFilter.More["likes"];
                        }


                    }
                }
            }


          //Special case for orderby
            for (var key in extraParams) {
                if (extraParams.hasOwnProperty(key)){
                    if (key==="orderby"){
                        var orderby = extraParams[key].replaceAll(",id","").trim();
                        var idx = orderby.indexOf(" ");
                        if (idx>-1) orderby = orderby.substring(0, idx).trim();
                        if (!toolbarFilter.More) toolbarFilter.More = {};
                        toolbarFilter.More.orderby = orderby;
                    }
                }
            }


          //Update toolbar
            updateToolbar(toolbarFilter);

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





      //Add bookmarks to the body
        bookmarks = new prospekt.companies.BookmarkView(body, config);
        bookmarks.onClick = function(bookmark){
            if (bookmark.companies && bookmark.companies.length>0){
                for (var key in filter) {
                    if (filter.hasOwnProperty(key)){
                        filter[key] = "";
                    }
                }
                filter.id = bookmark.companies.join(",");
                companyList.update();
            }
            listButton.click();
        };




      //Add company list to the body
        companyList = new javaxt.dhtml.DataGrid(body, {
            style: config.style.table,
            hideHeader: true,
            url: "companies",
            post: true,
            payload: filter,
            params: extraParams,
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


                var data = getMonthRevenue(company, lastUpdate);


                var companyName = createElement("div", companyInfo, "company-name");
                companyName.innerText = company.name;

                var annualRevenue = createElement("div", companyInfo, "company-info");
                annualRevenue.innerText = "Annual Revenue: $" + addCommas(company.estimatedRevenue);

                var recentAwards = createElement("div", companyInfo, "company-info");
                recentAwards.innerText = "Recent Awards: $" + addCommas(company.recentAwardVal);

                var customers = createElement("div", companyInfo, "company-info");
                customers.innerText = "Recent Customers: " + (company.recentCustomers ? company.recentCustomers.join(", ") : "");

                var services = createElement("div", companyInfo, "company-info");
                var recentNaics = {};
                if (company.recentNaics) company.recentNaics.forEach((code)=>{
                    if (code.length>2) code = code.substring(0, 2);
                    recentNaics[code] = naiscCodes[code];
                });
                services.innerText = "Services Concentration: " +
                [...new Set(Object.values(recentNaics))].join(", ");



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

        companyList.el.className = "company-list";


        var showList = companyList.show;
        companyList.show = function(){
            companyProfile.hide();
            div.style.opacity = 1;
            showList();
        };


        companyList.onRowClick = function(row, e){

            updateHistory({
                view: "list",
                title: title
            });

            var company = row.record;
            companyList.showProfile(company.id);

            addHistory({
                view: "profile",
                title: company.name,
                companyID: company.id,
                url: "?tab=companies&uei="+company.uei
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
            toolbar.update();
            bookmarks.update();
            companyList.load();
        };



        companyList.notify = function(op, model, id, userID){

        };
    };


  //**************************************************************************
  //** createProfile
  //**************************************************************************
  /** Used to create a company profile view
   */
    var createProfile = function(parent){

        var div = createElement("div", parent, "popover-panel");


        var table = createTable(div);
        var toolbar = table.addRow().addColumn();
        var body = table.addRow().addColumn({height:"100%"});


      //Create profile
        companyProfile = new prospekt.companies.CompanyProfile(body, config);
        companyProfile.show = function(){
            div.style.left = 0;
            div.style.opacity = 1;
        };
        companyProfile.hide = function(){
            div.style.left = "";
            div.style.opacity = 0;
        };


      //Create toolbar
        toolbar.className = "toolbar";
        toolbar.style.paddingLeft = "5px";
        var t = createTable(toolbar);
        t.style.width = "";
        var tr = t.addRow();


      //Add back button
        var backButton = createButton(tr.addColumn(), {
            label: "Back",
            icon: "fas fa-arrow-left"
        });
        backButton.onClick = function(){

            var state = window.history.state;
            if (state){

              //Get last update for this component
                var lastUpdate = state[me.className] ? state[me.className].lastUpdate.date : 0;


              //Check if there are any updates from any other components
                var otherUpdates = 0;
                for (var key in state) {
                    if (state.hasOwnProperty(key)){
                        if (key===me.className) continue;
                        var appState = state[key];
                        if (appState.lastUpdate){
                            otherUpdates = Math.max(appState.lastUpdate.date, otherUpdates);
                        }
                    }
                }


              //Hide popups
                if (bookmarkCreator) bookmarkCreator.hide();
                if (notes) notes.hide();


              //Show companyList
                if (otherUpdates<lastUpdate){
                    history.back();
                }
                else{
                  //Simulate a "back" event as best we can. Unfortunately,
                  //with this approach, we lose the forward button...
                    companyProfile.hide();
                    companyList.show();
                    var url = window.location.href;
                    var idx = url.indexOf("?");
                    if (idx>-1) url = url.substring(0, idx);
                    updateHistory({
                        view: "list",
                        title: title,
                        url: url
                    });
                }
            }
        };


      //Check whether the user can edit the company profile
        var editable = document.user.accessLevel>=3;



      //Create bookmark button
        var bookmarkButton = createButton(tr.addColumn(), {
            label: "Bookmark",
            icon: "fas fa-star",
            disabled: !editable
        });
        bookmarkButton.onClick = function(){
            if (!editable) return;
            createBookmark(companyProfile.companyID);
        };



      //Create share button
        var shareButton = createButton(tr.addColumn(), {
            label: "Share",
            icon: "fas fa-share-square",
            disabled: true
        });



      //Create like/dislike buttons
        var likeButton = createButton(tr.addColumn("like-button-container"), {
            label: "",
            icon: "far fa-thumbs-up",
            disabled: !editable
        });
        likeButton.onClick = function(){
            if (!editable) return;
            updateLikes(+1);
        };

        var dislikeButton = createButton(tr.addColumn("dislike-button-container"), {
            label: "",
            icon: "far fa-thumbs-down",
            disabled: true
        });
        dislikeButton.onClick = function(){
            if (!editable) return;
            updateLikes(-1);
        };



      //Create function to update likes
        var updateLikes = function(currLikes, silent){

            var updateButtons = function(currLikes){
                if (currLikes===0){
                    likeButton.setLabel("");
                    dislikeButton.disable();
                }
                else{
                    likeButton.setLabel(addCommas(currLikes));
                    dislikeButton.enable();
                }
            };


            if (silent===true){
                updateButtons(currLikes);
            }
            else{
                var payload = {
                    id: companyProfile.companyID,
                    likes: currLikes //server only cares about positive vs negative values
                };

                post("UpdateCompanyInfo", JSON.stringify(payload), {
                    success:function(str){
                        var company = JSON.parse(str);
                        var currLikes = parseFloat(company.likes);
                        if (isNaN(currLikes)) currLikes = 0;
                        updateButtons(currLikes);
                    },
                    failure:function(){}
                });
            }

        };



      //Create share button
        var notesButton = createButton(tr.addColumn(), {
            label: "Notes",
            icon: "far fa-clipboard",
            toggle: true
        });
        notesButton.onClick = function(){
            if (!notes) createNotes(notesButton);
            if (notesButton.isSelected()){
                waitmask.show(500);
                notes.update(companyProfile.companyID, ()=>{
                    waitmask.hide();
                    notes.show();
                });

            }
            else{
                notes.hide();
            }
        };



      //Override the update() method in the CompanyProfile panel
        var updateCompanyProfile = companyProfile.update;
        companyProfile.update = function(company){
            updateCompanyProfile(company);
            if (!isNaN(parseInt(company.likes+""))){
                updateLikes(company.likes, true);
            }
        };
    };


  //**************************************************************************
  //** createNotes
  //**************************************************************************
    var createNotes = function(notesButton){
        if (notes) return;
        var win = createWindow({
            style: config.style.window,
            title: "Notes",
            width: 450,
            height: 350,
            modal: false
        });
        win.onClose = function(){
            notes.clear();
            notes.x = parseFloat(win.el.style.left);
            notes.y = parseFloat(win.el.style.top);
            notesButton.deselect();
        };
        var body = win.getBody();
        body.style.padding = 0;
        notes = new prospekt.companies.CompanyNotes(body);
        notes.show = function(){
            if (isNaN(parseInt(notes.x+""))){
                var rect = javaxt.dhtml.utils.getRect(notesButton.el);
                notes.x = rect.right;
                notes.y = rect.bottom;
            }
            win.showAt(notes.x, notes.y);
        };
        notes.hide = win.hide;
    };


  //**************************************************************************
  //** createBookmark
  //**************************************************************************
    var createBookmark = function(companyID){
        if (!bookmarkCreator){

            var win = createWindow({
                style: config.style.window,
                title: "Create Bookmark",
                valign: "top",
                width: 450,
                modal: true,
                buttons: [
                    {
                        name: "Save",
                        onclick: function(){
                            bookmarkCreator.submit(win.close);
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


            var body = win.getBody();
            body.style.padding = "12px";

            bookmarkCreator = new prospekt.companies.BookmarkCreator(body, config);
            bookmarkCreator.show = win.show;
            bookmarkCreator.hide = win.hide;
        }

        bookmarkCreator.update(companyID);
        bookmarkCreator.show();
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

        var title = params.title;
        if (!title) title = document.title;

        var url = "";
        if (params.url){
            url = params.url;
            delete params.url;
        }

        var state = window.history.state;
        if (!state) state = {};

        state[me.className] = params;
        state[me.className].lastUpdate = {
            date: new Date().getTime(),
            event: replace ? "replaceState" : "pushState"
        };

        if (replace){
            document.title = title;
            history.replaceState(state, title, url);
        }
        else{
            history.pushState(state, title, url);
            document.title = title;
        }
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
        if (state){
            if (state.view==="profile"){
                companyList.showProfile(state.companyID);
            }
            else if (state.view==="list"){

              //Hide popups
                if (bookmarkCreator) bookmarkCreator.hide();
                if (notes) notes.hide();

              //Show list
                companyList.show();
            }
        }
    };



  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var getParameter = javaxt.dhtml.utils.getParameter;
    var createTable = javaxt.dhtml.utils.createTable;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var getRect = javaxt.dhtml.utils.getRect;
    var isDirty = javaxt.dhtml.utils.isDirty;
    var isArray = javaxt.dhtml.utils.isArray;
    var merge = javaxt.dhtml.utils.merge;
    var post = javaxt.dhtml.utils.post;
    var get = javaxt.dhtml.utils.get;


    var getMonthRevenue = prospekt.utils.getMonthRevenue;
    var getNaicsCodes = prospekt.utils.getNaicsCodes;
    var parseResponse = prospekt.utils.parseResponse;
    var createToolBar = prospekt.utils.createToolBar;
    var createWindow = prospekt.utils.createWindow;
    var createButton = prospekt.utils.createButton;
    var addCommas = prospekt.utils.addCommas;
    var getTrend = prospekt.utils.getTrend;

    init();
};