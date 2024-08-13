if(!prospekt) var prospekt={};
if(!prospekt.filters) prospekt.filters={};

//******************************************************************************
//**  Entity Filter
//******************************************************************************
/**
 *   Used to find and select business codes
 *
 ******************************************************************************/

prospekt.filters.EntityFilter = function(parent, config) {

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var tabs, selectedEntities, checkboxList;
    var checkboxes = {};
    var businessTypes;
    var waitmask;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);


        var div = createElement("div", parent, "entity-filter");

        tabs = new javaxt.dhtml.TabPanel(div, {
            style: config.style.tabPanel
        });
        tabs.addTab("Selected", createSelectedEntities());
        tabs.addTab("Search", createCheckboxes());


        me.el = div;
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        checkboxList.clear();
        selectedEntities.clear();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(filter){
        me.clear();
        checkboxList.update(filter);
    };


  //**************************************************************************
  //** getValues
  //**************************************************************************
    this.getValues = function(){

        var codes = [];
        for (var key in checkboxes) {
            if (checkboxes.hasOwnProperty(key)){
                var checkbox = checkboxes[key];
                if (checkbox.isChecked()) codes.push(checkbox.getValue());
            }
        }
        return {businessType: codes};
    };


  //**************************************************************************
  //** createSelectedEntities
  //**************************************************************************
    var createSelectedEntities = function(){

        var div = createElement("div", {
            position: "relative",
            width: "100%",
            height: "100%"
        });

        var panel = createOverflowPanel(div);
        var innerDiv = panel.innerDiv;


        selectedEntities = {
            clear: function(){
                innerDiv.innerHTML = "";
                setTimeout(panel.update, 500);
            },
            add: function(key, value){

                var info = {
                    key: key,
                    value: value
                };

                for (var i=0; i<innerDiv.childNodes.length; i++){
                    var div = innerDiv.childNodes[i];
                    if (div.info.key===key) return;
                }

                var label = value;

                var chiclet = createChiclet(innerDiv, label);
                chiclet.el.info = info;
                chiclet.onClose = function(){
                    var checkbox = checkboxes[key];
                    if (checkbox) checkbox.deselect();
                    updateCounter();
                };
                setTimeout(panel.update, 500);

                updateCounter();

            },
            remove: function(key, value){

                for (var i=0; i<innerDiv.childNodes.length; i++){
                    var div = innerDiv.childNodes[i];
                    if (div.info.key===key){
                        innerDiv.removeChild(div);
                        break;
                    }
                }
                setTimeout(panel.update, 500);

                updateCounter();
            }
        };


        var updateCounter = function(){
            var selectedTab = tabs.getTabs()[0];
            var counter = selectedTab.header.getElementsByTagName("div");
            if (counter.length>0) counter = counter[0];
            else{
                counter = createElement("div", selectedTab.header, "count");
                addShowHide(counter);
            }

            counter.innerText = addCommas(innerDiv.childNodes.length);
            if (innerDiv.childNodes.length>0){
                counter.show();
            }
            else{
                counter.hide();
            }
        };


        return div;
    };


  //**************************************************************************
  //** createCheckboxes
  //**************************************************************************
    var createCheckboxes = function(){

        var div = createElement("div", {
            position: "relative",
            width: "100%",
            height: "100%"
        });

        var panel = createOverflowPanel(div);

        waitmask = new javaxt.express.WaitMask(div);

        checkboxList = {
            clear: function(){
                checkboxes = {};
                panel.clear();
            },
            update: function(filter){
                getBusinessCodes(function(codes){
                    getBusinessTypes(function(businessTypes){
                        businessTypes.forEach((code)=>{
                            var label = codes[code];
                            if (!label) label = code;

                            switch(code){
                                case 'F':
                                case 'MF':
                                case '2X':
                                case 'XS':
                                case 'LJ':
                                    break;
                                default:
                                    var checkbox = createCheckbox(label, code, panel);
                                    checkboxes[code] = checkbox;
                            }
                        });


                        if (filter && filter.businessType){
                            if (isString(filter.businessType)){
                                filter.businessType = filter.businessType.split(",");
                            }

                            filter.businessType.forEach((code)=>{
                                var checkbox = checkboxes[code];
                                if (checkbox) checkbox.select();
                            });
                        }

                        setTimeout(panel.update, 500);
                    });
                });
            }
        };

        return div;
    };

  //**************************************************************************
  //** createCheckbox
  //**************************************************************************
    var createCheckbox = function(label, code, panel){
        var div = createElement("div", panel.innerDiv, "checkbox");
        var checkbox = new javaxt.dhtml.Checkbox(div, {
            style: config.style.checkbox,
            label: label,
            value: code,
            checked: false
        });
        checkbox.onChange = function(checked){
            if (checked){
                selectedEntities.add(code, label);
            }
            else{
                selectedEntities.remove(code, label);
            }
        };
        return checkbox;
    };


  //**************************************************************************
  //** getBusinessTypes
  //**************************************************************************
    var getBusinessTypes = function(callback){
        if (businessTypes){
            callback.apply(me, [businessTypes]);
        }
        else{
            waitmask.show(500);
            get("BusinessTypes", {
                success: function(str){
                    businessTypes = JSON.parse(str);
                    callback.apply(me, [businessTypes]);
                },
                finally: function(){
                    waitmask.hide();
                }
            });
        }
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var isString = javaxt.dhtml.utils.isString;
    var merge = javaxt.dhtml.utils.merge;
    var get = javaxt.dhtml.utils.get;

    var createOverflowPanel = prospekt.utils.createOverflowPanel;
    var getBusinessCodes = prospekt.utils.getBusinessCodes;
    var createChiclet = prospekt.utils.createChiclet;
    var addCommas = prospekt.utils.addCommas;


    init();

};