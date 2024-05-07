if(!prospekt) var prospekt={};
if(!prospekt.filters) prospekt.filters={};

//******************************************************************************
//**  NAICS Picker
//******************************************************************************
/**
 *   Used to find and select NAICS codes
 *
 ******************************************************************************/

prospekt.filters.NaicsPicker = function(parent, config) {


    var me = this;
    var defaultConfig = {

        showTrade: false
    };

    var sectorList, subSectorList, industryList, tradeList;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);


        var div = createElement("div", parent, {
            width: "100%",
            height: "100%"
        });
        div.className = "naics-picker";



        var table = createTable(div);
        var spacer = table.addRow();
        var header = table.addRow();
        var body = table.addRow();



        var columnNames = ["Sector", "SubSector", "Industry"];
        if (config.showTrade===true) columnNames.push("Trade");
        var columnWidth = 100.0/columnNames.length;
        var columns = {};
        columnNames.forEach((label, i)=>{
            spacer.addColumn({
                width: columnWidth + "%",
                height: "1px"
            });
            header.addColumn("header").innerText = label;



            var outerDiv = createElement("div", body.addColumn({
                height: "100%",
                padding: "0 10px 10px"
            }), "body");


            columns[label] = createElement("div", outerDiv, {
               width: "100%",
               height: "100%",
               position: "absolute"
            });
        });

        createSectorList(columns["Sector"]);
        createSubSectorList(columns["SubSector"]);
        createIndustryList(columns["Industry"]);

        if (config.showTrade===true){
            createTradeList(columns["Trade"]);
        }


        me.el = div;
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        sectorList.clear();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(naiscCodes){
        sectorList.update(naiscCodes);
    };


  //**************************************************************************
  //** onSelect
  //**************************************************************************
    this.onSelect = function(d){};


  //**************************************************************************
  //** onChange
  //**************************************************************************
    this.onChange = function(d){};


  //**************************************************************************
  //** createSectorList
  //**************************************************************************
    var createSectorList = function(parent){
        sectorList = {
            clear: function(){
                parent.innerHTML = "";
                subSectorList.clear();
            },
            update: function(naiscCodes){
                sectorList.clear();

                var sectors = filterNaiscCodes(naiscCodes);



                sectors.forEach((d)=>{
                    var item = createElement("div", parent, "item");
                    item.innerText = d.sector;
                    item.onclick = function(){
                        if (item.className==="item"){
                            for (var i=0; i<parent.childNodes.length; i++){
                                parent.childNodes[i].className = "item";
                            }

                            me.onChange(d);

                            item.className="item selected";


                            subSectorList.update(d.codes, naiscCodes);
                        }
                    };
                });
            }
        };


    };


  //**************************************************************************
  //** createSubSectorList
  //**************************************************************************
    var createSubSectorList = function(parent){
        subSectorList = {
            clear: function(){
                parent.innerHTML = "";
                industryList.clear();
            },
            update: function(sector, naiscCodes){
                subSectorList.clear();

                var codes = filterNaiscCodes(naiscCodes, sector);
                codes.forEach((d)=>{
                    var item = createElement("div", parent, "item");
                    item.innerText = d.sector;
                    item.onclick = function(){
                        if (item.className==="item"){
                            for (var i=0; i<parent.childNodes.length; i++){
                                parent.childNodes[i].className = "item";
                            }

                            me.onChange(d);

                            item.className="item selected";


                            industryList.update(d.codes, naiscCodes);


                        }
                    };
                });


                if (codes.length===1){
                    parent.childNodes[0].click();
                }

            }
        };
    };


  //**************************************************************************
  //** createIndustryList
  //**************************************************************************
  /** Used to render a list of 4 digit NAICS codes
   */
    var createIndustryList = function(parent){
        industryList = {
            clear: function(){
                parent.innerHTML = "";
                if (tradeList) tradeList.clear();
            },

            /** @param sector An array of 3 digit NAICS codes*/
            update: function(sector, naiscCodes){
                industryList.clear();

                var codes = filterNaiscCodes(naiscCodes, sector);
                codes.forEach((d)=>{
                    var item = createElement("div", parent, "item");
                    item.innerText = d.sector;
                    item.onclick = function(){
                        if (item.className==="item"){
                            for (var i=0; i<parent.childNodes.length; i++){
                                parent.childNodes[i].className = "item";
                            }

                            me.onChange(d);

                            item.className="item selected";
                            if (tradeList){
                                tradeList.update(d.codes, naiscCodes);
                            }
                            else{
                                me.onSelect(d);
                            }


                        }
                    };
                });


                if (tradeList && codes.length===1){
                    parent.childNodes[0].click();
                }

            }
        };
    };


  //**************************************************************************
  //** createTradeList
  //**************************************************************************
    var createTradeList = function(parent){
        tradeList = {
            clear: function(){
                parent.innerHTML = "";
            },

            /** @param sector An array of 4 digit NAICS codes*/
            update: function(sector, naiscCodes){
                tradeList.clear();



                var codes = [];
                filterNaiscCodes(naiscCodes, sector).forEach((d)=>{
                    codes.push(...filterNaiscCodes(naiscCodes, d.codes));
                });




                codes.forEach((d)=>{
                    var item = createElement("div", parent, "item");
                    item.innerText = d.sector;
                    item.onclick = function(){
                        if (item.className==="item"){
                            for (var i=0; i<parent.childNodes.length; i++){
                                parent.childNodes[i].className = "item";
                            }

                            me.onChange(d);

                            item.className="item selected";
                            me.onSelect(d);


                        }
                    };
                });

            }
        };
    };


  //**************************************************************************
  //** filterNaiscCodes
  //**************************************************************************
  /** Returns an array of NAICS codes
   *  @param sector An array of NAICS code prefixes to filter by
   */
    var filterNaiscCodes = function(naiscCodes, filter){

        var keyLen = 2;
        if (filter && filter.length>0){
            keyLen = filter[0].length+1;
        }


        var sectors = {};
        for (var key in naiscCodes) {
            if (naiscCodes.hasOwnProperty(key)){
                if (key.length===keyLen){


                    var addKey;
                    if (keyLen>2){
                        addKey = false;
                        for (var i=0; i<filter.length; i++){
                            if (key.indexOf(filter[i])===0){
                                addKey = true;
                                break;
                            }
                        }
                    }
                    else{
                        addKey = true;
                    }



                    if (addKey){
                        var desc = naiscCodes[key];
                        var keys = sectors[desc];
                        if (!keys){
                            keys = [];
                            sectors[desc] = keys;
                        }
                        keys.push(key);
                    }
                }
            }
        }


        var arr = [];
        for (var key in sectors) {
            if (sectors.hasOwnProperty(key)){
                var keys = sectors[key];
                arr.push({
                    sector: key,
                    codes: keys
                });
            }
        }
        arr.sort((a, b)=>{
            a = parseInt(a.codes[0]);
            b = parseInt(b.codes[0]);
            if (a==81) a=a*10;
            if (b==81) b=b*10;
            return a - b;
        });
        return arr;

    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var merge = javaxt.dhtml.utils.merge;


    init();
};