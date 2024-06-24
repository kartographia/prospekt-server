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
    var companyList, userList; //custom components
    var userEditor; //popup
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
        tabs.addTab("Users", createUserList());
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
        userList.clear();
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
        userList.update();
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
  //** createCompanyList
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
            params: {
                orderBy: "name"
            },
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
  //** createUserList
  //**************************************************************************
    var createUserList = function(){
        var userFilter = {};


      //Create container
        var parent = createElement("div", {
            width: "100%",
            height: "100%"
        });


        var table = createTable(parent);
        var toolbar = table.addRow().addColumn("panel-toolbar");
        var body = table.addRow().addColumn({height: "100%"});


      //Add button
        var addButton = createButton(toolbar, {
            label: "Add",
            icon: "fas fa-plus-circle"
        });
        addButton.onClick = function(){
            editUser(null, addButton);
        };


      //Edit button
        var editButton = createButton(toolbar, {
            label: "Edit",
            icon: "fas fa-edit",
            disabled: true
        });
        editButton.onClick = function(){
            var records = userList.getSelectedRecords();
            if (records.length>0){
                var userID = records[0].id;
                bookmark.users.forEach((user)=>{
                    if (user.userID==userID){
                        user = JSON.parse(JSON.stringify(user));
                        user.user = records[0];
                        editUser(user, editButton);
                    }
                });

            }
        };


      //Delete button
        var deleteButton = createButton(toolbar, {
            label: "Delete",
            icon: "fas fa-trash",
            disabled: true
        });
        deleteButton.onClick = function(){
            var records = userList.getSelectedRecords();
            if (records.length>0){
                var userID = records[0].id;
                var users = [];
                bookmark.users.forEach((user)=>{
                    if (user.userID!=userID) users.push(user);
                });

            }
            bookmark.users = users;

            form.onChange({name:"users"}, users);

            userList.update();
        };



      //Create userList
        userList = new javaxt.dhtml.DataGrid(body, {
            style: config.style.table,
            url: "users",
            post: true,
            payload: userFilter,
            params: {
                orderBy: "firstName,lastName"
            },
            parseResponse: function(request){
                return parseResponse(request.responseText);
            },
            columns: [
                {header: 'Name', width:'100%'},
                {header: 'Role', width:'150'}
            ],
            update: function(row, user){

              //Render name
                row.set("Name", getName(user));


              //Render role
                var accessLevel;
                for (var i=0; i<bookmark.users.length; i++){
                    if (bookmark.users[i].userID===user.id){
                        accessLevel = bookmark.users[i].accessLevel;
                        break;
                    }
                }
                var role = '';
                if (accessLevel==3) role = "Administrator";
                if (accessLevel==2) role = "Contributor";
                if (accessLevel==1) role = "Read Only";
                row.set("Role", role);
            }
        });


      //Add custom update method to the userList
        userList.update = function(){
            deleteButton.disable();
            userList.clear();

            var userIDs = bookmark.users.map(a => a.userID);
            if (userIDs.length==0) userFilter.id = -1;
            else userFilter.id = userIDs.join(",");

            userList.load();
        };


      //Watch for selection changes in the grid and update buttons accordingly
        userList.onSelectionChange = function(){
            var records = userList.getSelectedRecords();
            if (records.length>0){
                var userID = records[0].id;
                if (userID==document.user.id){
                    editButton.disable();
                    deleteButton.disable();
                }
                else{
                    editButton.enable();
                    deleteButton.enable();
                }
            }
            else{
                editButton.disable();
                deleteButton.disable();
            }
        };


        return parent;
    };


  //**************************************************************************
  //** editUser
  //**************************************************************************
    var editUser = function(user, button){
        if (!userEditor){

            var win = createWindow({
                title: "Edit User",
                width: 450,
                valign: "top",
                modal: true,
                style: config.style.window
            });

            var userInput = new javaxt.dhtml.ComboBox(createElement("div"), {
                style: config.style.combobox,
                scrollbar: true
            });


            var form = new javaxt.dhtml.Form(win.getBody(), {
                style: config.style.form,
                items: [
                    {
                        name: "userID",
                        label: "User",
                        type: userInput
                    },
                    {
                        name: "accessLevel",
                        label: "Permissions",
                        type: "radio",
                        alignment: "vertical",
                        options: [
                            {
                                label: "Administrator",
                                value: 3
                            },
                            {
                                label: "Contributor",
                                value: 2
                            },
                            {
                                label: "Read Only",
                                value: 1
                            }
                        ]
                    }
                ],
                buttons: [
                    {
                        name: "Submit",
                        onclick: function(){

                            var values = form.getData();
                            var userID = parseInt(values.userID);
                            var accessLevel = parseInt(values.accessLevel);
                            if (isNaN(userID)) {
                                form.showError("User is required", form.findField("userID"));
                                return;
                            }

                            var addUser = true;
                            if (!bookmark.users) bookmark.users = [];
                            bookmark.users.forEach((user)=>{
                                if (user.userID==userID){
                                    user.accessLevel = accessLevel;
                                    addUser = false;
                                }
                            });
                            if (addUser){
                                bookmark.users.push({
                                    userID: userID,
                                    accessLevel: accessLevel
                                });
                            }


                            win.close();
                            userList.update();
                        }
                    },
                    {
                        name: "Cancel",
                        onclick: function(){
                            form.clear();
                            win.close();
                        }
                    }
                ]
            });


            var lastSearch = 0;
            form.onChange = function(field){
                if (field.name==="userID"){
                    var name = field.getText();
                    var userID = field.getValue();

                    if (userID){ //user either selected an item in the list or typed in an exact match

                    }
                    else{

                        if (name.trim().length>0){
                            (function (name) {

                                get("users?lower(firstName)="+encodeURIComponent("'"+name.toLowerCase()+"%'")+
                                    "&active=true&fields=id,firstName,lastName&limit=50", {
                                    success: function(str){
                                        var arr = parseResponse(str);

                                        var currTime = new Date().getTime();
                                        if (currTime<lastSearch) return;
                                        lastSearch = currTime;

                                        userInput.removeAll();
                                        userInput.hideMenu();
                                        var numItems = 0;

                                        for (var i=0; i<arr.length; i++){
                                            var user = arr[i];
                                            if (user.id!==document.user.id){
                                                userInput.add(getName(user), user.id);
                                                numItems++;
                                            }
                                        }

                                        if (numItems>0) userInput.showMenu();
                                    }
                                });
                            })(name);
                        }
                    }
                }
            };


            userEditor = {
                showAt: function(x,y){
                    win.showAt(x,y);
                },
                hide: function(){
                    win.hide();
                }
            };


            userEditor.update = function(user){
                form.clear();
                if (userInput.resetColor) userInput.resetColor();
                userInput.enable();

                if (user){
                    win.setTitle("Edit User");

                    var userID = user.userID;
                    var name = user.user? getName(user.user) : "";

                    userInput.add(name, userID);
                    userInput.setValue(userID);
                    userInput.disable();

                    form.setValue("accessLevel", user.accessLevel);
                }
                else{
                    win.setTitle("Add User");
                    form.setValue("accessLevel", 1);
                }
            };
        }


        userEditor.update(user);

        var rect = javaxt.dhtml.utils.getRect(button.el);
        userEditor.showAt(rect.x+(rect.width/2), rect.bottom);
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
    var createWindow = prospekt.utils.createWindow;
    var createButton = prospekt.utils.createButton;
    var getName = prospekt.utils.getName;

    init();
};