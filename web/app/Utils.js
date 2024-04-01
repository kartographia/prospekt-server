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
  //** createWindow
  //**************************************************************************
    createWindow: function(config){
        var win = new javaxt.dhtml.Window(document.body, config);
        if (!prospekt.windows) prospekt.windows = [];
        prospekt.windows.push(win);
        return win;
    }

};