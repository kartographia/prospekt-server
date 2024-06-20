if(!prospekt) var prospekt={};
if(!prospekt.companies) prospekt.companies={};

//******************************************************************************
//**  BookmarkEditor
//*****************************************************************************/
/**
 *   Form used to edit a company bookmark (see CompanyGroup model).
 *
 ******************************************************************************/

prospekt.companies.BookmarkEditor = function(parent, config) {
    this.className = "prospekt.companies.BookmarkEditor";

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var tabs, form; //javaxt components
    var companyList; //custom components
    var bookmark = {};


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);


        tabs = new javaxt.dhtml.TabPanel(parent, {
            style: config.style.tabPanel
        });
        tabs.addTab("Bookmark", createForm());
        tabs.addTab("Companies", createCompanyList());
        tabs.raiseTab(0);


        me.el = tabs.el;
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        bookmark = {};
        form.clear();
        companyList.clear();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(companyGroup){
        me.clear();
        tabs.raiseTab(0);


        bookmark = JSON.parse(JSON.stringify(companyGroup));
        if (!bookmark) bookmark = {};
        if (!bookmark.companies) bookmark.companies = [];


        form.update();
        companyList.update();
    };


  //**************************************************************************
  //** validateFields
  //**************************************************************************
    this.validateFields = function(callback){
        if (!callback) return;

        var name = bookmark.name;
        if (!name) {
            form.showError("Name is required", form.findField("name"));
            return;
        }

        callback.apply(me, [bookmark]);
    };


  //**************************************************************************
  //** createForm
  //**************************************************************************
    var createForm = function(){

      //Create parent container
        var parent = createElement("div", {
            padding: "0 7px"
        });


      //Create form panel
        form = new javaxt.dhtml.Form(parent, {
            style: config.style.form,
            items: [
                {
                    group: "General",
                    items: [

                        {
                            name: "name",
                            label: "Name",
                            type: "text"
                        },
                        {
                            name: "description",
                            label: "Description",
                            type: "textarea"
                        }

                    ]
                },
                {
                    group: "Thumbnail",
                    items: [
                        {
                            name: "thumbnail",
                            type: createUploadPanel()
                        }

                    ]
                },
                {
                    name: "id",
                    label: "id",
                    type: "hidden"
                }
            ]
        });


      //Update thumbnail area
        var input = form.findField("thumbnail");
        var row = input.row;
        var cols = [];
        for (var i=0; i<row.childNodes.length; i++){
            cols.push(row.childNodes[i]);
        }
        row.removeChild(cols[0]);
        row.removeChild(cols[1]);
        cols[2].colSpan = "3";
        cols[2].style.padding = "0";
        cols[2].style.textAlign = "center";



      //Watch for changes in the form
        form.onChange = function(input, value){
            if (input.name==="thumbnail"){

            }
            else{
                bookmark[input.name] = value;
            }
        };


      //Add custom update method to the form
        form.update = function(){

          //Update ID
            form.setValue("id", bookmark.id);


          //Update name
            var nameField = form.findField("name");
            if (nameField.resetColor) nameField.resetColor();
            var name = bookmark.name;
            if (name) form.setValue("name", name);


          //Update description
            var description = bookmark.description;
            if (description) form.setValue("description", description);


          //Update thumbnail
            if (bookmark.info){
                var thumbnail = bookmark.info.thumbnail;
            }

        };


        return parent;
    };


  //**************************************************************************
  //** createUploadPanel
  //**************************************************************************
    var createUploadPanel = function(){

      //Create div with enough height to match the preview panel
        var div = createElement("div", {
            width: "100%",
            height: "320px"
        });


      //Create thumbnailEditor
        var thumbnailEditor = new javaxt.dhtml.ThumbnailEditor(div, {
            thumbnailWidth: 285,
            thumbnailHeight: 255,
            mask: false,
            style: {
                uploadArea: "thumbnail-upload-area",
                slider: config.style.slider
            }
        });


      //Update vertical position of the thumbnailEditor
        thumbnailEditor.el.className = "middle";


      //Create form input
        var input = {
            el: div,
            getValue: function(){
                return thumbnailEditor.getImage();
            },
            setValue: function(src){
                //console.log(src);
            },
            onChange: function(){}
        };


      //Watch for changes to the thumbnailEditor and relay it to the form input
        thumbnailEditor.onChange = function(){
            input.onChange();
        };


      //Return form input
        return input;
    };



  //**************************************************************************
  //** createForm
  //**************************************************************************
    var createCompanyList = function(){

        var companyFilter = {};
        var currSelection = {};


      //Create spacer
        var parent = createElement("div", {
            width: "100%",
            height: "100%"
        });


        var table = createTable(parent);
        var toolbar = table.addRow().addColumn("panel-toolbar");
        var body = table.addRow().addColumn({height: "100%"});


      //Add delete button to the toolbar
        var deleteButton = createButton(toolbar, {
            label: "Remove Company",
            icon: "fas fa-times",
            disabled: true
        });
        deleteButton.onClick = function(){

            var companies = [];
            bookmark.companies.forEach((companyID)=>{
                if (!currSelection[companyID+'']){
                    companies.push(companyID);
                }
            });
            bookmark.companies = companies;

            form.onChange({name:"companies"}, companies);

            companyList.update();
        };



      //Create companyList
        companyList = new javaxt.dhtml.DataGrid(body, {
            style: config.style.table,
            url: "companies",
            post: true,
            payload: companyFilter,
            //params: extraParams,
            parseResponse: function(request){
                return parseResponse(request.responseText);
            },
            columns: [
                {header: 'x', width:'35px'},
                {header: 'Name', width:'100%'}
            ],
            update: function(row, company){
                row.set("x", company.id);
                row.set("Name", company.name);
            }
        });


      //Add custom update method to the companyList
        companyList.update = function(){
            deleteButton.disable();
            companyList.clear();
            var companyIDs = bookmark.companies.join(",");
            if (companyIDs.length==0) companyIDs = -1;
            companyFilter.id = companyIDs;
            companyList.load();
        };


      //Watch for changes to any checkboxes
        companyList.onCheckbox = function(company, checked, checkbox){

          //Update currSelection
            if (checked){
                currSelection[company.id] = company;
            }
            else{
                delete currSelection[company.id];
            }

          //Update delete button
            if (Object.keys(currSelection).length>0){
                deleteButton.enable();
            }
            else{
                deleteButton.disable();
            }
        };


        return parent;
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var createTable = javaxt.dhtml.utils.createTable;
    var merge = javaxt.dhtml.utils.merge;
    var post = javaxt.dhtml.utils.post;
    var get = javaxt.dhtml.utils.get;


    var parseResponse = prospekt.utils.parseResponse;
    var createButton = prospekt.utils.createButton;

    init();
};