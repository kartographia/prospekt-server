if(!prospekt) var prospekt={};
if(!prospekt.filters) prospekt.filters={};


//******************************************************************************
//**  Tag Filter
//******************************************************************************
/**
 *   Used to define a filter for company specific fields (e.g. likes)
 *
 ******************************************************************************/

prospekt.filters.TagFilter = function(parent, config) {


    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };


    var input, tagView;

  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);


        var div = createElement("div", parent, "tag-filter");


        var table = createTable(div);
        input = new javaxt.dhtml.ComboBox(
            table.addRow().addColumn(),
            {
                style: config.style.combobox
            }
        );
        var button = input.getButton();
        button.onclick = function(e){
            e.preventDefault();
            e.stopPropagation();

            var tag = input.getInput().value;
            if (!tag) return;

            tag = tag.trim();
            if (tag.length==0) return;

            var d = tagView.innerDiv;
            for (var i=0; i<d.childNodes.length; i++){
                var div = d.childNodes[i];
                if (div.innerText.toLowerCase()===tag.toLowerCase()){
                    input.reset();
                    return;
                }
            }

            input.reset();
            //input.hideMenu();
            //input.getInput().value = "";
            createChiclet(d, tag);
            tagView.update();
            tagView.focus();
        };

        input.onChange = function(value, data){
            if (data) button.click();
        };

        input.getInput().addEventListener("keyup", (e) => {
            if (e.keyCode===13){
                button.click();
            }
        });


        tagView = createOverflowPanel(table.addRow().addColumn({
            height: "100%"
        }));


        me.el = div;
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        input.clear();
        tagView.clear();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(filter){
        me.clear();


        if (!filter) filter = {};
        if (!filter.tags) filter.tags = [];
        if (isString(filter.tags)){
            filter.tags = filter.tags.split(",");
        }


        filter.tags.forEach((tag)=>{
            createChiclet(tagView.innerDiv, tag);
        });

        tagView.update();


        get("tags?source=companies",{
            success: function(str){
                JSON.parse(str).forEach((tag)=>{
                    input.add(tag, tag);
                });
            }
        });
    };


  //**************************************************************************
  //** getValues
  //**************************************************************************
    this.getValues = function(){

        var tags = [];
        for (var i=0; i<tagView.innerDiv.childNodes.length; i++){
            var div = tagView.innerDiv.childNodes[i];
            tags.push(div.innerText);
        }

        return {tags: tags};
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var isString = javaxt.dhtml.utils.isString;
    var merge = javaxt.dhtml.utils.merge;
    var get = javaxt.dhtml.utils.get;

    var createOverflowPanel = prospekt.utils.createOverflowPanel;
    var createChiclet = prospekt.utils.createChiclet;



    init();
};