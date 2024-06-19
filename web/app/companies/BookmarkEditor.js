if(!prospekt) var prospekt={};
if(!prospekt.companies) prospekt.companies={};

//******************************************************************************
//**  Company Bookmarks
//*****************************************************************************/
/**
 *   Form used to bookmark a company
 *
 ******************************************************************************/

prospekt.companies.BookmarkEditor = function(parent, config) {
    this.className = "prospekt.companies.BookmarkEditor";

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var currID = null; //Company ID
    var newFolder, existingFolder; //Custom inputs
    var radioInputs = [];


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);

        var table = createTable(parent);
        table.style.height = "";


        var tr = table.addRow();
        tr.addColumn();
        tr.addColumn({ width: "100%" });




        newFolder = createInput("New Folder", table);
        existingFolder = createInput("Existing Folder", table);

        me.el = table;
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        currID = null;
        radioInputs.forEach((r)=>{
            r.checked = false;
            r.hideInput();
        });
        existingFolder.clear();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(companyID){
        me.clear();
        currID = companyID;

        get("Bookmarks?fields=id,name&orderby=name", {
            success: function(text){
                var rows = JSON.parse(text).rows;
                for (var i=0; i<rows.length; i++){
                    var col = rows[i];
                    var groupID = col[0];
                    var groupName = col[1];
                    existingFolder.add(groupName, groupID);
                    if (rows.length==1) existingFolder.setValue(groupID);
                }
            },
            failure: function(){

            }
        });
    };


  //**************************************************************************
  //** getValue
  //**************************************************************************
    this.submit = function(callback){


        var value, input, group;
        if (newFolder.isSelected()){
            input = newFolder;
            value = newFolder.value.trim();
            if (value.length==0){
                value = null;
                showError(input, "Please provide a folder name");
                return false;
            }

            group = {
                name: value,
                companyID: currID
            };
        }
        else if (existingFolder.isSelected()){
            input = existingFolder.getInput();
            value = existingFolder.getValue();
            if (!value){
                showError(input, "Please select a folder");
                return false;
            }

            group = {
                groupID: value,
                companyID: currID
            };
        }
        else{
            input = newFolder.radio;
            showError(input, "Please select an option");
            return false;
        }


      //If we're still here, create bookmark
        post("Bookmark", group, {
            success: function(){
                if (callback) callback.apply(me, []);
            }
        });
    };



  //**************************************************************************
  //** createInput
  //**************************************************************************
    var createInput = function(label, table){
        var radio, input;

        var tr = table.addRow();

      //Create radio input
        radio = createElement("input", tr.addColumn(), "form-radio");
        radio.type = "radio";
        radio.onclick = function(){
            radioInputs.forEach((r)=>{
                r.checked = (r==radio);
                if (r.checked) r.showInput();
                else r.hideInput();
            });
        };
        radioInputs.push(radio);


      //Create label
        var span = createElement("span", tr.addColumn(), "noselect");
        span.style.cursor = "default";
        span.innerText = label;
        span.onclick = function(){radio.click();};


      //Create input
        tr = table.addRow();
        tr.addColumn();
        var td = tr.addColumn();
        td.style.padding = "0 0 12px 0";

        if (label==="New Folder"){
            input = createElement("input", td, "form-input");
            input.type = "text";
            input.style.width = "100%";
        }
        else{
            input = new javaxt.dhtml.ComboBox(td, {
                maxVisibleRows: 5,
                style: config.style.combobox,
                readOnly: true
            });
        }



        radio.row = tr;
        radio.showInput = function(){
            radio.row.style.visibility = '';
            radio.row.style.display = '';
        };
        radio.hideInput = function(){
            radio.row.style.visibility = 'hidden';
            radio.row.style.display = 'none';
        };
        radio.hideInput();

        input.radio = radio;

        input.select = function(){
            radio.click();
        };

        input.isSelected = function(){
            return radio.checked;
        };

        return input;
    };


  //**************************************************************************
  //** showError
  //**************************************************************************
    var showError = function(input, errorMessage){

        var rect = javaxt.dhtml.utils.getRect(input);


        input.blur();

        var cls = config.style.form.error.input;
        if (input.className){
            if (input.className.indexOf(cls)==-1) input.className += " " + cls;
        }
        else{
            input.className = cls;
        }


        var callout = javaxt.dhtml.Form.Error;
        if (!callout){
            callout = new javaxt.dhtml.Callout(document.body,{
                style: config.style.form.error.callout
            });
            javaxt.dhtml.Form.Error = callout;
        }

        callout.getInnerDiv().innerHTML = errorMessage;

        var x = rect.x + (rect.width/2);
        var y = rect.y;
        callout.showAt(x, y, "above", "center");
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var merge = javaxt.dhtml.utils.merge;
    var post = javaxt.dhtml.utils.post;
    var get = javaxt.dhtml.utils.get;


    init();
};