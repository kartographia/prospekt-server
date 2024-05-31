if(!prospekt) var prospekt={};
if(!prospekt.awards) prospekt.awards={};

//******************************************************************************
//**  Awards List
//*****************************************************************************/
/**
 *   Used to render a list of awards
 *
 ******************************************************************************/

prospekt.awards.AwardsList = function(parent, config) {

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var grid;
    var awardDetails;
    var lastUpdate;

    var records = [];
    var page = 1;


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
        createList(div);


        me.el = div;
        addShowHide(me);
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        grid.clear();
        records = [];
        page = 1;
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(awards, _lastUpdate){
        me.clear();

        records = awards;
        page = 1;
        lastUpdate = _lastUpdate;


        var data = getData(page);
        grid.load(data, page);


      //Watch for scroll events to load more data
        var pages = {};
        pages[page+''] = true;
        grid.onPageChange = function(currPage, prevPage){
            page = currPage;

            if (!pages[page+'']){
                grid.load(getData(page), page);
                pages[page+''] = true;
            }
        };

    };


  //**************************************************************************
  //** createList
  //**************************************************************************
    var createList = function(parent){

        grid = new javaxt.dhtml.DataGrid(parent, {
            style: config.style.table,
            columns: [
                {header: 'Customer', width:'80px'},

                {header: 'Name', width:'100%'},

                {header: 'Contract', width:'75px', align: "left"},

                {header: 'Competed', width:'75px', align: "center"},
                {header: 'Start Date', width:'75px', align: "right"},
                {header: 'End Date', width:'75px', align: "right"},
                {header: 'Funding', width:'100px', align: "right"},
                {header: 'Ceiling', width:'100px', align: "right"},
                {header: 'Actions', width:'24px', align: 'center'}
            ],
            update: function(row, award){
                row.set("Customer", award.customer);
                row.set("Name", award.name);
                row.set("Contract", award.type);

                if (award.competed==true){}
                else{
                    row.set("Competed", "<i class=\"fas fa-times\" style=\"color:#e7a2a2;\"></i>");
                }


                row.set("Start Date", moment(award.date).format("YYYY-MM-DD"));

                if (award.endDate){
                    row.set("End Date", moment(award.endDate).format("YYYY-MM-DD"));
                }
                else{
                    row.set("End Date", "-");
                }


                if (!isAwardActive(award, lastUpdate)){
                    var className = row.className;
                    if (!className) className = "";
                    row.className+= " inactive";
                }


                var val = award.funded;
                var updateNeg = val<0;
                val = "$" + addCommas(val, 0);
                if (updateNeg) val = "-" + val.replace("-","");
                row.set("Funding", val);


                var val = award.extendedValue;
                if (isNaN(parseFloat(val+""))) val = award.value;
                //if (isNaN(parseFloat(val+""))) val = award.funded;
                var updateNeg = val<0;
                val = "$" + addCommas(val, 0);
                if (updateNeg) val = "-" + val.replace("-","");
                row.set("Ceiling", val);


                if (award.info){
                    if (award.info.actions){
                        row.set("Actions", addCommas(award.info.actions.length));
                    }
                }
            }
        });

        grid.onRowClick = function(row, e){
            var award = row.record;
            if (!awardDetails){
                var win = createWindow({
                    style: config.style.window,
                    title: "Award Details",
                    width: 1000,
                    height: 800,
                    modal: true
                });
                awardDetails = new prospekt.awards.AwardDetails(win.getBody(), config);
                awardDetails.show = function(){
                    win.show();
                };
                awardDetails.hide = function(){
                    win.hide();
                };
                awardDetails.setTitle = function(title){
                    win.setTitle(title);
                };
            }
            awardDetails.update(award);
            //awardDetails.setTitle(award.name); //TODO: trim
            awardDetails.show();
        };

    };


  //**************************************************************************
  //** getData
  //**************************************************************************
  /** Returns records by page
   */
    var getData = function(page){
        var limit = 50;
        var offset = 0;
        if (page>1) offset = ((page-1)*limit)+1;

        var data = [];
        for (var i=offset; i<records.length; i++){
            data.push(records[i]);
            if (data.length===limit) break;
        }
        return data;
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var merge = javaxt.dhtml.utils.merge;

    var isAwardActive = prospekt.utils.isAwardActive;
    var createWindow = prospekt.utils.createWindow;
    var addCommas = prospekt.utils.addCommas;

    init();

};