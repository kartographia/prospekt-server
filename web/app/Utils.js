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

        var timer;
        input.oninput = function(e){
            var q = searchBar.getValue();
            if (q){
                searchIcon.hide();
                cancelButton.show();
            }
            else{
                searchIcon.show();
                cancelButton.hide();
            }
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


        var o = {
            filter: {},
            onChange: function(){}
        };


        var toolbar = createElement("div", parent, "toolbar");



      //Add text search to the toolbar
        var searchBar = prospekt.utils.createSearchBar(createElement("div", toolbar, {
            width: "400px",
            display: "inline-block",
            float: "left"
        }));
        searchBar.onSearch = function(q){
            o.filter["Search"] = q;
            o.onChange("Search", q);
        };
        searchBar.el.onclick = function(){
            hideMenus();
        };



      //Add buttons to the toolbar
        var buttons = [];
        var createButton = function(label, className){

            var button = createElement("div", toolbar, "pulldown noselect");
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

                buttons.forEach((b)=>{
                    if (b!=button) b.classList.remove("active");
                });

                if (button.classList.has("active")){
                    button.classList.remove("active");
                    button.menu.hide();
                }
                else{
                    button.classList.add("active");
                    if (!button.menu) button.menu = createMenu(button);
                    button.menu.show();
                    //if (onShowMenu) onShowMenu.apply(me, [button.menu]);
                    if (!button.menu.filter && className){
                        var cls = eval(className);
                        if (cls){
                            button.menu.filter = new cls(button.menu.body, config);
                        }
                    }

                    if (button.menu.filter && button.menu.filter.update){
                        button.menu.filter.update(o.filter[button.title]);
                    }
                }
            };


            buttons.push(button);
            return button;
        };
        var createMenu = function(button){
            var menu = createElement("div", button, "menu");
            menu.style.width = "400px";
            addShowHide(menu);

          //Override the show() method
            var _show = menu.show;
            menu.show = function(){
                if (menu.isVisible()) return;

                buttons.forEach((b)=>{
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
            var apply = createElement("div", table.addRow().addColumn(), "button");
            apply.innerText = "Apply";
            apply.onclick = function(){

              //Hide menu
                menu.hide();


              //Update filter
                var currFilter = o.filter[button.title];
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
                    o.onChange(button.title, o.filter[button.title]);
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
            buttons.forEach((b)=>{
                b.classList.remove("active");
                if (b.menu) b.menu.hide();
            });
        };



        o.el = toolbar;
        o.buttons = buttons;
        o.searchBar = searchBar;
        o.addButton = function(label, className){
            return createButton(label, className);
        };
        o.hideMenus = hideMenus;
        o.update = function(filter){

          //Update filter
            for (var key in filter) {
                if (filter.hasOwnProperty(key)){
                    o.filter[key] = filter[key];
                }
            }


          //Update searchbar
            var searchFilter = o.filter["Search"];
            if (searchFilter){
                searchBar.setValue(searchFilter, true)
            }


          //Update buttons
            buttons.forEach((button)=>{
                var buttonFilter = o.filter[button.title];


              //Update style based on filter
                if (!buttonFilter || javaxt.dhtml.utils.isEmpty(buttonFilter)){
                    button.classList.remove("filter");
                }
                else{
                    if (!button.classList.has("filter")){
                        button.classList.add("filter");
                    }
                }


                if (button.menu && button.menu.filter){
                    if (button.menu.filter.update) button.menu.filter.update(filter);
                }
            });
        };
        return o;

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
    }

};