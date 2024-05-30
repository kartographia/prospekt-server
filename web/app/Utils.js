if(!prospekt) var prospekt={};

prospekt.utils = {


  //**************************************************************************
  //** parseResponse
  //**************************************************************************
    parseResponse: function(response){
        var s = response.substring(0,1);
        if (s=="{" || s=="["){
            var json = JSON.parse(response);
            if (json.cols && json.rows){ //conflate response

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

                json = rows;
            }
            response = json;
        }
        return response;
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


        var toolbar = {
            el: createElement("div", parent, "toolbar"),
            buttons: [],
            filter: {},
            onChange: function(){},
            onShowMenu: function(){}
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
        var createButton = function(label, className){

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

                if (button.menu && button.menu.isVisible()){
                    //TODO: Check if client clicked on button. Only return if
                    //client clicked outside the button (e.g. menu)
                    return;
                };

                toolbar.buttons.forEach((b)=>{
                    if (b!=button) b.classList.remove("active");
                });

                if (button.classList.has("active")){
                    button.classList.remove("active");
                    button.menu.hide();
                }
                else{
                    button.classList.add("active");
                    if (!button.menu) button.menu = createMenu(button);


                    if (!button.menu.filter && className){
                        var cls = eval(className);
                        if (cls){
                            button.menu.filter = new cls(button.menu.body, config);
                        }
                    }

                    if (button.menu.filter && button.menu.filter.update){
                        button.menu.filter.update(toolbar.filter[button.title]);
                    }

                    button.menu.show();
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
                    if (b.menu) b.menu.hide();
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
            closeButton.onclick = function(){
                menu.hide();
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


              //Update style based on filter
                if (javaxt.dhtml.utils.isEmpty(currFilter)){
                    button.classList.remove("filter");
                }
                else{
                    if (!button.classList.has("filter")){
                        button.classList.add("filter");
                    }
                }

            };

            return menu;
        };
        var hideMenus = function(){
            toolbar.buttons.forEach((b)=>{
                b.classList.remove("active");
                if (b.menu) b.menu.hide();
            });
        };



        toolbar.addButton = function(label, className){
            return createButton(label, className);
        };
        toolbar.hideMenus = hideMenus;
        toolbar.update = function(filter){

          //Update filter
            for (var key in filter) {
                if (filter.hasOwnProperty(key)){
                    toolbar.filter[key] = filter[key];
                }
            }


          //Update searchbar
            var searchFilter = toolbar.filter["Search"];
            if (searchFilter){
                searchBar.setValue(searchFilter, true);
            }


          //Update buttons
            toolbar.buttons.forEach((button)=>{


              //Check if the button has any active filters associated with it
                var hasFilter;
                var buttonFilter = toolbar.filter[button.title];
                if (!buttonFilter || javaxt.dhtml.utils.isEmpty(buttonFilter)){
                    hasFilter = false;
                }
                else{
                    hasFilter = true;

                  //Hack for revenue button. Need to figure out a better solution...
                    if (button.title==="Revenue"){
                        if (buttonFilter["min"]==1) hasFilter=false;
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
                }


                if (button.menu && button.menu.filter){
                    if (button.menu.filter.update) button.menu.filter.update(filter);
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



      //Create response
        var ret = {
            outerDiv: outerDiv,
            innerDiv: innerDiv,
            update: function(){},
            clear: function(){
                innerDiv.innerHTML = "";
                ret.update();
            },
            scrollToElement: function(el){
                el.scrollIntoView(false);
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


                ret.iscroll = iscroll;
                if (config.onRender) config.onRender.apply(this, [ret]);
            });

        }
        else{
            overflowDiv.style.overflowY = 'scroll';
        }

        return ret;
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