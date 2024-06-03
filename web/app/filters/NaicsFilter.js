if(!prospekt) var prospekt={};
if(!prospekt.filters) prospekt.filters={};


//******************************************************************************
//**  NAICS Filter
//******************************************************************************
/**
 *   Used to find and select NAICS codes
 *
 ******************************************************************************/

prospekt.filters.NaicsFilter = function(parent, config) {

    var me = this;
    var defaultConfig = {
        showTrade: false,
        style: javaxt.dhtml.style.default
    };

    var tabs, selectedNaisc, naiscPicker, messageBox;
    var naicsCodes;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);


        var div = createElement("div", parent, "naics-filter");
        createMessageBox(div);


        tabs = new javaxt.dhtml.TabPanel(div, {
            style: config.style.tabPanel
        });
        tabs.addTab("Selected", createNaiscList());
        tabs.addTab("Search", createNaiscPicker());
        //tabs.raiseTab(0);

        me.el = div;
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        naiscPicker.clear();
        selectedNaisc.clear();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(filter){
        me.clear();
        getNaicsCodes(function(naics){
            naicsCodes = naics;

          //Update naiscPicker
            naiscPicker.update(naics);
            tabs.raiseTab(1);


          //Update selectedNaisc
            if (filter && filter.naics){
                if (isString(filter.naics)){
                    filter.naics = filter.naics.split(",");
                }

                var selectedCodes = {};
                for (var i=0; i<filter.naics.length; i++){
                    var str = filter.naics[i] + "";
                    if (str.length>4) str = str.substring(0, 4);
                    selectedCodes[str] = true;
                }
                selectedCodes = Object.keys(selectedCodes);
                if (selectedCodes.length>0){
                    selectedCodes.forEach((code)=>{
                        code = parseInt(code);
                        var d = {
                            sector: naicsCodes[code],
                            codes: [code]
                        };
                        selectedNaisc.update(d);
                    });
                    tabs.raiseTab(0);
                }
            }

        });
    };


  //**************************************************************************
  //** getValues
  //**************************************************************************
    this.getValues = function(){
        return {naics: selectedNaisc.getCodes()};
    };


  //**************************************************************************
  //** onApply
  //**************************************************************************
    this.onApply = function(){};


  //**************************************************************************
  //** createNaiscList
  //**************************************************************************
    var createNaiscList = function(){

        var table = createTable();
        var td = table.addRow().addColumn({
            height: "100%"
        });

        var div = createElement("div", td, {
            width: "100%",
            height: "100%",
            position: "relative",
            overflow: "hidden auto"
        });

        var innerDiv = createElement("div", div, {
            width: "100%",
            height: "100%",
            position: "absolute"
        });


        selectedNaisc = {
            clear: function(){
                innerDiv.innerHTML = "";
            },
            update: function(d){

                for (var i=0; i<innerDiv.childNodes.length; i++){
                    var div = innerDiv.childNodes[i];
                    if (div.info===d) return;
                }

                var chiclet = createChiclet(innerDiv, d.sector);
                chiclet.el.info = d;
            },
            getCodes: function(){

                var codes = [];
                for (var i=0; i<innerDiv.childNodes.length; i++){
                    var info = innerDiv.childNodes[i].info;

                    info.codes.forEach((code)=>{
                        if ((code+"").length<6){

                            for (var naicsCode in naicsCodes) {
                                if (naicsCodes.hasOwnProperty(naicsCode)){
                                    var str = naicsCode+"";
                                    if (str.length===6 && str.indexOf(code+"")===0){
                                        codes.push(naicsCode);
                                    }
                                }
                            }
                        }
                    });

                }
                return codes;
            }
        };


      //Add custom "Apply" button
        var td = table.addRow().addColumn();
        var button = createElement("div", td, "button");
        button.innerText = "Apply";
        button.onclick = function(){
            me.onApply();
        };


        return table;
    };


  //**************************************************************************
  //** createNaiscPicker
  //**************************************************************************
    var createNaiscPicker = function(){

      //Create container
        var div = createElement("div", {
            width: "100%",
            height: "100%",
            position: "relative"
        });


      //Create table with 2 rows
        var table = createTable(div);
        var tr, td;


      //Add NaicsPicker to the first row
        td = table.addRow().addColumn({
            height: "100%"
        });
        naiscPicker = new prospekt.filters.NaicsPicker(td, {
            showTrade: false
        });


        var currSelection;


      //Add custom input to the decond row
        td = table.addRow().addColumn({
            padding: "0 10px 8px"
        });
        table = createTable(td);
        table.style.height = "";
        tr = table.addRow();

        var input = createElement('input', tr.addColumn({width: "100%"}), "form-input");
        input.style.width="100%";
        input.type = "text";
        input.disabled = true;
        input.readOnly = true;

        var button = createElement('input', tr.addColumn(), "form-button");
        button.type = "button";
        button.value = "+";
        button.disabled = true;
        button.onclick = function(){
            if (currSelection){
                selectedNaisc.update(currSelection);
                input.value = "";
                currSelection = null;
                input.disabled = true;
                button.disabled = true;
                messageBox.show();
            }
        };


      //Watch for NaicsPicker events
        naiscPicker.onChange = function(d){
            input.value = "";
            currSelection = null;
            input.disabled = true;
            button.disabled = true;
        };
        naiscPicker.onSelect = function(d){
            input.value = d.sector;
            currSelection = d;
            input.disabled = false;
            button.disabled = false;
        };


        return div;
    };


  //**************************************************************************
  //** createMessageBox
  //**************************************************************************
    var createMessageBox = function(parent){
        messageBox = createElement("div", parent);

        var timer;

        messageBox.show = function(){

            messageBox.style.visibility = '';
            messageBox.style.display = '';
            setTimeout(()=>{
                messageBox.className = "message-box visible noselect";

              //Hide message box after a few seconds
                if (timer) clearTimeout(timer);
                timer = setTimeout(()=>{
                    messageBox.hide();
                }, 2800);

            }, 200);
        };

        messageBox.hide = function(){
            messageBox.className = "message-box hidden noselect";
            setTimeout(()=>{
                messageBox.className = "message-box initial noselect";
                messageBox.style.visibility = 'hidden';
                messageBox.style.display = 'none';
            }, 200);
        };

        messageBox.onclick = function(){
            tabs.raiseTab(0);
        };

        messageBox.hide();
        messageBox.innerText = "Added NAICS to Selection";
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var isString = javaxt.dhtml.utils.isString;
    var merge = javaxt.dhtml.utils.merge;

    var getNaicsCodes = prospekt.utils.getNaicsCodes;
    var createChiclet = prospekt.utils.createChiclet;

    init();
};