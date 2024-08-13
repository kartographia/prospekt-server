if(!prospekt) var prospekt={};

prospekt.utils = {


  //**************************************************************************
  //** parseResponse
  //**************************************************************************
    parseResponse: function(obj){

        if (javaxt.dhtml.utils.isString(obj)){
            var s = obj.substring(0,1);
            if (s=="{" || s=="["){
                obj = JSON.parse(obj);
            }
        }

        if (obj.cols && obj.rows){ //conflate response
            var json = obj;

            var rows = json.rows;
            var cols = {};
            for (var i=0; i<json.cols.length; i++){
                cols[json.cols[i]] = i;
            }
            for (var i=0; i<rows.length; i++){
                var row = rows[i];
                var obj = {};
                for (var col in cols) {
                    if (cols.hasOwnProperty(col)){
                        obj[col] = row[cols[col]];
                    }
                }
                rows[i] = obj;
            }

            return rows;
        }

        return obj;
    },


  //**************************************************************************
  //** createButton
  //**************************************************************************
  /** Used to create a toolbar button
   */
    createButton: function(toolbar, btn){

        btn = JSON.parse(JSON.stringify(btn));
        btn.style = {
            button: "toolbar-button",
            select: "toolbar-button-selected",
            hover:  "toolbar-button-hover",
            label: "toolbar-button-label"
        };

        if (btn.icon){
            btn.style.icon = "toolbar-button-icon " + btn.icon;
            delete btn.icon;
        }


        if (btn.menu===true){
            btn.style.arrow = "toolbar-button-menu-icon";
            btn.style.menu = "menu-panel";
            btn.style.select = "panel-toolbar-menubutton-selected";
        }

        return new javaxt.dhtml.Button(toolbar, btn);
    },


  //**************************************************************************
  //** createSpacer
  //**************************************************************************
  /** Used to create a toolbar spacer
   */
    createSpacer: function(toolbar){
        javaxt.dhtml.utils.createElement("div", toolbar, "toolbar-spacer");
    },


  //**************************************************************************
  //** createChiclet
  //**************************************************************************
    createChiclet: function(parent, label){
        var createElement = javaxt.dhtml.utils.createElement;


        var div = createElement("div", parent, "chiclet");
        var innerDiv = createElement("div", div, {});
        innerDiv.innerText = label;

        var cancelButton = createElement("div", div, "close noselect");

        var chiclet = {
            el: div,
            onClick: function(){},
            onClose: function(){}
        };

        div.onclick = function(){
            chiclet.onClick();
        };

        cancelButton.onclick = function(){
            parent.removeChild(div);
            chiclet.onClose();
        };


        return chiclet;
    },


  //**************************************************************************
  //** createSearchBar
  //**************************************************************************
    createSearchBar: function(parent){
        var createElement = javaxt.dhtml.utils.createElement;

        var searchBar = {};

      //Create outer div
        var div = createElement("div", parent, "search-bar");
        div.style.position = "relative";
        searchBar.el = div;


      //Create search icon
        var searchIcon = createElement("div", div, "search-bar-icon noselect");
        searchIcon.innerHTML = '<i class="fas fa-search"></i>';
        searchIcon.show = function(){
            this.style.opacity = "";
            input.style.paddingLeft = "26px";
        };
        searchIcon.hide = function(){
            this.style.opacity = 0;
            input.style.paddingLeft = "8px";
        };


      //Create input
        var input = createElement("input", div, "search-bar-input");
        input.type = "text";
        input.style.width = "100%";
        input.placeholder = "Search";
        input.setAttribute("spellcheck", "false");
        searchBar.input = input;

        var updateIcons = function(q){
            if (q){
                searchIcon.hide();
                cancelButton.show();
            }
            else{
                searchIcon.show();
                cancelButton.hide();
            }
        };

        var timer;
        input.oninput = function(e){
            var q = searchBar.getValue();
            updateIcons(q);
            searchBar.onChange(q);

            if (timer) clearTimeout(timer);
            timer = setTimeout(function(){
                var q = searchBar.getValue();
                searchBar.onSearch(q);
            }, 500);

        };
        input.onkeydown = function(event){
            var key = event.keyCode;
            if (key === 9 || key === 13) {
                input.oninput();
                input.blur();
                var q = searchBar.getValue();
                searchBar.onSearch(q);
            }
        };


      //Cancel button
        var cancelButton = createElement("div", div, "search-bar-cancel noselect");
        cancelButton.innerHTML = '<i class="fas fa-times"></i>';
        javaxt.dhtml.utils.addShowHide(cancelButton);
        cancelButton.hide();
        cancelButton.onclick = function(){
            searchBar.clear();
        };

        searchBar.clear = function(silent){
            input.value = "";
            cancelButton.hide();
            searchIcon.show();
            if (silent===true) return;
            searchBar.onClear();
        };

        searchBar.getValue = function(){
            var q = input.value;
            if (q){
                q = q.trim();
                if (q.length===0) q = null;
            }
            return q;
        };
        searchBar.setValue = function(q, silent){
            if (q && q.length>0){
                input.value = q;
                updateIcons(q);
            }
            else{
                searchBar.clear(silent);
            }
        };

        searchBar.onSearch = function(q){};
        searchBar.onChange = function(q){};
        searchBar.onClear = function(){};

        return searchBar;
    },


  //**************************************************************************
  //** createToolBar
  //**************************************************************************
  /** Used to create a Zillow-like toolbar
   */
    createToolBar: function(parent, config){

        var getHighestElements = javaxt.dhtml.utils.getHighestElements;
        var createElement = javaxt.dhtml.utils.createElement;
        var createTable = javaxt.dhtml.utils.createTable;
        var addShowHide = javaxt.dhtml.utils.addShowHide;
        var isArray = javaxt.dhtml.utils.isArray;


        var toolbar = {
            el: createElement("div", parent, "toolbar"),
            buttons: [],
            filter: {},
            onChange: function(){},
            onShowMenu: function(){},
            disable: function(){
                toolbar.el.classList.add("disabled");
            },
            enable: function(){
                toolbar.el.classList.remove("disabled");
            },
            isDisabled: function(){
                for (var i=0; i<toolbar.el.classList.length; i++){
                    if (toolbar.el.classList[i]==="disabled") return true;
                }
                return false;
            }
        };




      //Add text search to the toolbar
        var searchBar = prospekt.utils.createSearchBar(createElement("div", toolbar.el, {
            width: "400px",
            display: "inline-block",
            float: "left"
        }));
        searchBar.onSearch = function(q){
            toolbar.filter["Search"] = q;
            toolbar.onChange("Search", q);
        };
        searchBar.onClear = function(){
            delete toolbar.filter["Search"];
            toolbar.onChange("Search", null);
        };
        searchBar.el.onclick = function(){
            hideMenus();
        };
        toolbar.searchBar = searchBar;



      //Add buttons to the toolbar
        var createButton = function(label, cls){

            var button = createElement("div", toolbar.el, "pulldown noselect");
            button.classList.has = function(className){
                for (var i=0; i<this.length; i++){
                    if (this[i]===className) return true;
                }
                return false;
            };
            button.title = label;
            button.innerText = label;
            button.onclick = function(e){

                if (toolbar.isDisabled()){
                    e.stopPropagation();
                    return;
                }

                if (button.menu && button.menu.isVisible()){

                  //Check if client clicked on button
                    var rect = javaxt.dhtml.utils.getRect(button);
                    if ((e.clientX>=rect.left && e.clientX<=rect.right) &&
                        (e.clientY>=rect.top && e.clientY<=rect.bottom)){
                        button.menu.hide();
                        button.classList.remove("active");
                    }

                    return;
                };

                toolbar.buttons.forEach((b)=>{
                    if (b!=button) b.classList.remove("active");
                });

                if (button.classList.has("active")){
                    button.menu.hide();
                    //button.classList.remove("active");
                }
                else{
                    button.classList.add("active");
                    if (!button.menu) button.menu = createMenu(button);


                    if (!button.menu.filter && cls){
                        var fn = eval(cls);
                        if (fn){
                            button.menu.filter = new fn(button.menu.body, config);
                        }
                    }

                    if (button.menu.filter && button.menu.filter.update){
                        button.menu.filter.update(toolbar.filter[button.title]);
                    }

                    button.menu.show();
                }
            };


            button.hasFilter = function(){
                var button = this;
                var buttonFilter = toolbar.filter[button.title];
                if (!buttonFilter || javaxt.dhtml.utils.isEmpty(buttonFilter)){
                    return false;
                }
                else{
                    var values = Object.values(buttonFilter);
                    var numValues = 0;
                    values.forEach((value)=>{
                        if (value==null || value=="") return;
                        if (isArray(value) && value.length==0) return;
                        numValues++;
                    });
                    return numValues===values.length;
                }
            };


            toolbar.buttons.push(button);
            return button;
        };


        var createMenu = function(button){
            var menu = createElement("div", button, "menu");
            menu.style.minWidth = "400px";
            addShowHide(menu);

          //Override the show() method
            var _show = menu.show;
            menu.show = function(){
                if (menu.isVisible()) return;

                toolbar.buttons.forEach((b)=>{
                    if (b.menu){
                        b.menu.hide();
                        //b.classList.remove("active");
                    }
                });

                var highestElements = getHighestElements();
                var zIndex = highestElements.zIndex;
                if (!highestElements.contains(menu)) zIndex++;
                menu.style.zIndex = zIndex;

                var rect = javaxt.dhtml.utils.getRect(button);
                menu.style.left = "-2px"; //not sure why 0 doesn't work...
                menu.style.top = (rect.height+2) + "px";

                _show.apply(menu, []);
                toolbar.onShowMenu(menu, button);
            };

            menu.hide();


          //Add close button
            var closeButton = createElement("div", menu, "close-button");
            closeButton.onclick = function(e){
                e.preventDefault();
                e.stopPropagation();
                menu.hide();
                button.classList.remove("active");
            };


          //Add content
            var table = createTable(menu);
            //menu.title = table.addRow().addColumn();
            menu.body = table.addRow().addColumn({height: "100%"});
            menu.buttonBar = table.addRow();
            menu.button = createElement("div", menu.buttonBar.addColumn(), "button");
            menu.button.innerText = "Apply";
            menu.button.onclick = function(e){
                e.preventDefault();
                e.stopPropagation();


              //Hide menu
                menu.hide();
                button.classList.remove("active");


              //Update filter
                var currFilter = toolbar.filter[button.title];
                var newFilter = button.menu.filter.getValues();
                if (currFilter){
                    for (var key in newFilter) {
                        if (newFilter.hasOwnProperty(key)){
                            currFilter[key] = newFilter[key];
                        }
                    }
                }
                else{
                    currFilter = newFilter;
                }



                if (true){ //javaxt.dhtml.utils.isDirty()
                    toolbar.onChange(button.title, currFilter);
                }


            };

            return menu;
        };
        var hideMenus = function(){
            toolbar.buttons.forEach((b)=>{
                b.classList.remove("active");
                if (b.menu){
                    b.menu.hide();
                    b.classList.remove("active");
                }
            });
        };



        toolbar.addButton = function(label, className){
            return createButton(label, className);
        };
        toolbar.hideMenus = hideMenus;
        toolbar.update = function(filter){


          //Update toolbar filter
            for (var key in filter) {
                if (filter.hasOwnProperty(key)){
                    toolbar.filter[key] = filter[key];
                }
            }


          //Update searchbar
            var searchFilter = toolbar.filter["Search"];
            if (searchFilter){
                var currValue = searchBar.getValue();
                if (!currValue) currValue = "";
                if (searchFilter.toUpperCase()!=currValue.toUpperCase()){
                    searchBar.setValue(searchFilter, true);
                }
            }
            else{
                searchBar.setValue("", true);
            }


          //Update button style
            toolbar.buttons.forEach((button)=>{


              //Check if the button has any active filters associated with it
                var hasFilter = button.hasFilter();


              //Hack for revenue button. Need to figure out a better solution...
                if (button.title==="Revenue"){
                    var buttonFilter = toolbar.filter[button.title];
                    if (buttonFilter["min"]==1){
                        hasFilter = buttonFilter["max"] ? true : false;
                    }
                }


              //Update button style if there's a filter
                if (hasFilter){
                    if (!button.classList.has("filter")){
                        button.classList.add("filter");
                    }
                }
                else{
                    button.classList.remove("filter");
                    button.classList.remove("active");


                  //Update the button menu
                    if (button.menu && button.menu.filter){
                        if (button.menu.filter.update){
                            button.menu.filter.update(buttonFilter);
                        }
                    }

                }

            });
        };

        return toolbar;
    },


  //**************************************************************************
  //** createWindow
  //**************************************************************************
    createWindow: function(config){
        var win = new javaxt.dhtml.Window(document.body, config);
        if (!prospekt.windows) prospekt.windows = [];
        prospekt.windows.push(win);
        return win;
    },


  //**************************************************************************
  //** createOverflowPanel
  //**************************************************************************
    createOverflowPanel: function(parent, config){
        var createElement = javaxt.dhtml.utils.createElement;


      //Set default config options
        var defaultConfig = {
            style: {
                iscroll: javaxt.dhtml.style.default.table.iscroll
            }
        };


        if (!config) config = {};
        config = javaxt.dhtml.utils.merge(config, defaultConfig);


      //Create main div with overflow
        var outerDiv = createElement("div", parent, {
            position: "relative",
            width: "100%",
            height: "100%"
        });


      //Create content div. Oddly needed 2 divs, one with "inline-flex" to get
      //padding to work correctly
        var overflowDiv = createElement("div", outerDiv, {
            position: "absolute",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            display: "inline-flex"
        });


        var innerDiv = createElement("div", overflowDiv, {
            position: "relative",
            width: "100%",
            height: "100%"
        });

        innerDiv.tabIndex = -1; //allows the div to have focus

        var scrollEnabled = true;


      //Create response
        var ret = {
            outerDiv: outerDiv,
            innerDiv: innerDiv,
            update: function(){},
            clear: function(){
                innerDiv.innerHTML = "";
                ret.update();
            },
            focus: function(){
                innerDiv.focus();
            },
            scrollTo: function(x, y){
                outerDiv.scrollTo(x, y); //not tested...
            },
            scrollToElement: function(el){
                el.scrollIntoView(false);
            },
            enableScroll: function(){
                scrollEnabled = true;
            },
            disableScroll: function(){
                scrollEnabled = false;
            },
            isScrollEnabled: function(){
                return scrollEnabled;
            }
        };


      //Add iScroll if available
        if (typeof IScroll !== 'undefined'){

            javaxt.dhtml.utils.onRender(overflowDiv, function(){
                overflowDiv.style.overflowY = 'hidden';
                var iscroll = new IScroll(overflowDiv, {
                    scrollbars: config.style.iscroll ? "custom" : true,
                    mouseWheel: true,
                    fadeScrollbars: false,
                    hideScrollbars: false
                });
                if (config.style.iscroll) {
                    javaxt.dhtml.utils.setStyle(iscroll, config.style.iscroll);
                }


              //Override the iscroll's translate method so we can prevent
              //scrolling as needed
                var translate = iscroll._translate;
                iscroll._translate = function(x, y){
                    if (!scrollEnabled) return;
                    translate.apply(iscroll, arguments);
                    ret.lastScrollEvent = new Date().getTime();
                };


              //Create custom update function to return to the client so they
              //can update iscroll as needed (e.g. after adding/removing elements)
                ret.update = function(){
                    var h = 0;
                    for (var i=0; i<ret.innerDiv.childNodes.length; i++){
                        var el = ret.innerDiv.childNodes[i];
                        if (el.resizeElement) continue; //ignore resizer
                        h = Math.max(javaxt.dhtml.utils.getRect(el).bottom, h);
                    }
                    h = h - (javaxt.dhtml.utils.getRect(ret.innerDiv).top);
                    ret.innerDiv.style.height = h + "px";
                    iscroll.refresh();
                };
                ret.update();


              //Create custom scrollToElement function
                ret.scrollToElement = function(el){
                    overflowDiv.scrollTop = 0;
                    iscroll.scrollToElement(el);
                };


              //Create custom scrollTo
                ret.scrollTo = function(x, y){
                    overflowDiv.scrollTop = 0;
                    iscroll.scrollTo(x, y, 0);
                };


                ret.iscroll = iscroll;
                if (config.onRender) config.onRender.apply(this, [ret]);
            });

        }
        else{
            overflowDiv.style.overflowY = 'scroll';

            overflowDiv.onscroll = function(e){

                if (!scrollEnabled){ //not tested...
                    e.preventDefault();
                    return;
                }

                ret.lastScrollEvent = new Date().getTime();
            };
        }

        return ret;
    },


  //**************************************************************************
  //** createTextEditor
  //**************************************************************************
    createTextEditor: function(parent, config){
        var createElement = javaxt.dhtml.utils.createElement;
        var createTable = javaxt.dhtml.utils.createTable;
        var isArray = javaxt.dhtml.utils.isArray;
        var isString = javaxt.dhtml.utils.isString;

        var table = createTable(parent);
        var toolbar = table.addRow().addColumn();


        var buttons = {};

        [
            'bold','italic','underline',
            { list: 'ordered' }, { list: 'bullet' }

        ].forEach((option)=>{

            if (isArray(option)){

            }
            else{
                var key, val;

                if (isString(option)){
                    key = option;
                }
                else{
                    key = Object.keys(option)[0];
                    val = option[key];
                }

                var btn = createElement("button", toolbar, "ql-"+key);
                if (val) btn.value = val;

                buttons[key] = btn;
            }

        });



        var td = table.addRow().addColumn({
            width: "100%",
            height: "100%",
            paddingBottom: "7px"
        });


        var outerDiv = createElement("div", td, {
            position: "relative",
            width: "100%",
            height: "100%"
        });


        var body = createElement("div", outerDiv, {
            position: "absolute",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            border: "0 none"
        });


        var quill = new Quill(body, {
            theme: 'snow',
            modules: {
                toolbar: toolbar
            }
        });


        return {
            el: table,
            toolbar: toolbar,
            clear: function(){
                quill.setText("");
            },
            update: function(html){
                quill.clipboard.dangerouslyPasteHTML(0, html);
            },
            getValue: function(){
                var html = quill.getSemanticHTML();
                if (!html) html = "";
                else html = html.trim();
                return html;
            }
        };
    },


  //**************************************************************************
  //** getCallout
  //**************************************************************************
    getCallout: function(config){
        var callout = prospekt.utils.Callout;

        if (callout){
            var parent = callout.el.parentNode;
            if (!parent){
                callout.el.innerHTML = "";
                callout = null;
            }
        }
        if (!callout){

            var style;
            if (!config) config = {};
            if (config.style && config.style.callout) style = config.style.callout;
            else style = javaxt.dhtml.style.default.callout;

            callout = new javaxt.dhtml.Callout(document.body,{
                style: style
            });

            prospekt.utils.Callout = callout;
        }
        return callout;
    },


  //**************************************************************************
  //** getName
  //**************************************************************************
    getName: function(user){
        var name;
        if (user.fullName){
            name = user.fullName;
        }
        else{
            var firstName = user.firstName;
            var lastName = user.lastName;
            if (firstName){
                name = firstName;
                if (lastName) name += " " + lastName;
            }
            else{
                name = lastName;
            }
        }
        return name;
    },


  //**************************************************************************
  //** getCompanyLogo
  //**************************************************************************
    getCompanyLogo: function(company){
        if (!company || !company.info) return null;

      //Check info
        if (company.info.logo){
            return company.info.logo;
        }


      //Check LinkedIn data
        if (company.info.linkedInProfile){
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
                return images[smallestImage+""];
            }
            catch(e){
                //console.log(e);
            }
        }

        return null;
    },


  //**************************************************************************
  //** addCustomerLogo
  //**************************************************************************
    addCustomerLogo: function(customer, div){
        var url = "/images/logos/" + customer.toLowerCase() + ".svg";
        javaxt.dhtml.utils.get(url, {
            success: function(){
                div.style.backgroundImage = "url(" + url + ")";
            },
            failure: function(){
                div.className = "missing-logo";
                div.innerText = customer;
            }
        });
    },


  //**************************************************************************
  //** getNaicsCodes
  //**************************************************************************
    getNaicsCodes: function(callback){
        if (!callback) return;

        if (prospekt.data){
            if (prospekt.data.naics){
                callback.apply(this, [prospekt.data.naics]);
                return;
            }
        }
        else {
            prospekt.data = {};
        }


        javaxt.dhtml.utils.get("data/naics.tsv", {
            success: function(text){
                var naiscCodes = {};
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


                prospekt.data.naics = naiscCodes;
                callback.apply(this, [naiscCodes]);
            }
        });

    },


  //**************************************************************************
  //** getBusinessCodes
  //**************************************************************************
    getBusinessCodes: function(callback){
        if (!callback) return;

        if (prospekt.data){
            if (prospekt.data.business){
                callback.apply(this, [prospekt.data.business]);
                return;
            }
        }
        else {
            prospekt.data = {};
        }


        javaxt.dhtml.utils.get("data/business.tsv", {
            success: function(text){
                var businessCodes = {};
                text.split("\n").forEach((row)=>{
                    row = row.trim();
                    var arr = row.split("\t");
                    if (arr.length===2){
                        var code = arr[0];
                        var desc = arr[1];
                        businessCodes[code] = desc;
                    }
                });


                prospekt.data.business = businessCodes;
                callback.apply(this, [businessCodes]);
            }
        });

    },


  //**************************************************************************
  //** getActionCodes
  //**************************************************************************
    getActionCodes: function(callback){
        if (!callback) return;

        if (prospekt.data){
            if (prospekt.data.action){
                callback.apply(this, [prospekt.data.action]);
                return;
            }
        }
        else {
            prospekt.data = {};
        }


        javaxt.dhtml.utils.get("data/action.tsv", {
            success: function(text){
                var actionCodes = {};
                text.split("\n").forEach((row)=>{
                    row = row.trim();
                    var arr = row.split("\t");
                    if (arr.length===2){
                        var code = arr[0];
                        var desc = arr[1];
                        actionCodes[code] = desc;
                    }
                });


                prospekt.data.action = actionCodes;
                callback.apply(this, [actionCodes]);
            }
        });

    },

  //**************************************************************************
  //** getAgencies
  //**************************************************************************
    getAgencies: function(callback){
        if (!callback) return;

        if (prospekt.data){
            if (prospekt.data.agencies){
                callback.apply(this, [prospekt.data.agencies]);
                return;
            }
        }
        else {
            prospekt.data = {};
        }


        javaxt.dhtml.utils.get("data/agency.tsv", {
            success: function(text){
                var agencies = {};
                text.split("\n").forEach((row)=>{
                    row = row.trim();
                    var arr = row.split("\t");
                    if (arr.length===2){
                        var code = arr[0].trim();
                        var desc = arr[1].trim();
                        if (code.length===0) code = desc;
                        agencies[code] = desc;
                    }
                });


                prospekt.data.agencies = agencies;
                callback.apply(this, [agencies]);
            }
        });

    },


  //**************************************************************************
  //** getMonthRevenue
  //**************************************************************************
  /** Used to generate data for monthly revenue charts. Returns an array with
   *  two custom properties ("totalRevenue" and "previousRevenue").
   */
    getMonthRevenue: function(company, lastUpdate){

        var data = [];
        var totalRevenue = 0;
        var previousRevenue = 0;
        if (company.info && company.info.monthlyRevenue){


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
            if (data.length>0){
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
            }

        }
        data.totalRevenue = totalRevenue;
        data.previousRevenue = previousRevenue;
        return data;
    },


  //**************************************************************************
  //** isAwardActive
  //**************************************************************************
    isAwardActive: function(award, lastUpdate){
        var inactive = false;
        if (award.extendedDate){
            if (award.endDate==award.extendedDate){
                if (award.endDate){
                    if (moment(award.endDate).isBefore(lastUpdate)){
                        inactive = true;
                    }
                }
            }
        }
        else{
            if (award.endDate){
                if (moment(award.endDate).isBefore(lastUpdate)){
                    inactive = true;
                }
            }
        }

        if (!inactive){
            if (award.info && award.info.actions){
                var lastEvent = Number.MAX_VALUE;
                award.info.actions.forEach((action)=>{
                    if (action.type==="K") return; //don't look at closeout events
                    var monthsAgo = Math.ceil(lastUpdate.diff(new Date(action.date), 'months', true));
                    lastEvent = Math.min(lastEvent, monthsAgo);
                });
                if (lastEvent>12) inactive = true;
            }
            else{
                inactive = true;
            }
        }

        return !inactive;
    },


  //**************************************************************************
  //** addCommas
  //**************************************************************************
    addCommas: function(x, decimals) {
        if (isNaN(decimals)) decimals = 0;
        return javaxt.dhtml.utils.round(x, decimals).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },


  //**************************************************************************
  //** getTrend
  //**************************************************************************
  /** Used to calculate if trend is up, down or stable. Credit:
   *  https://stackoverflow.com/questions/30647330/
   *  @param nums An array of numbers. Example:
   *  let nums = [2781, 2667, 2785, 1031, 646, 2340, 2410];
   *  @returns A number with a trend value. Example -139.5
   */
    getTrend: function(nums){
        if (nums.length===0) return 0;

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
    }

};