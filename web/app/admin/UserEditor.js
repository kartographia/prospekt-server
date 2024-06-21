if(!prospekt) var prospekt={};
if(!prospekt.admin) prospekt.admin={};

//******************************************************************************
//**  UserEditor
//******************************************************************************
/**
 *   Window with a form used to create and edit users
 *
 ******************************************************************************/

prospekt.admin.UserEditor = function(parent, config) {

    var me = this;
    var form, win;
    var user = {};

  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        if (!config.style) config.style = {};


      //Create form
        var div = createElement("div");
        form = new javaxt.dhtml.Form(div, {
            style: config.style.form,
            items: [
                {
                    group: "Credentials",
                    items: [
                        {
                            name: "username",
                            label: "Username",
                            type: "text",
                            required: true
                        },
                        {
                            name: "password",
                            label: "Password",
                            type: "password",
                            required: true
                        },
                        {
                            name: "status",
                            label: "Active",
                            type: "radio",
                            alignment: "horizontal",
                            options: [
                                {
                                    label: "True",
                                    value: true
                                },
                                {
                                    label: "False",
                                    value: false
                                }
                            ]
                        }
                    ]
                },
                {
                    group: "Contact",
                    items: [
                        {
                            name: "fullName",
                            label: "Name",
                            type: "text",
                            required: false
                        },
                        {
                            name: "email",
                            label: "Email",
                            type: "text",
                            required: false
                        },
                        {
                            name: "phone",
                            label: "Phone",
                            type: "text",
                            required: false
                        }
                    ]
                },
                {
                    group: "Permissions",
                    items: [
                        {
                            name: "accessLevel",
                            label: "", //Permissions
                            type: "radio",
                            alignment: "vertical",
                            options: [
                                {
                                    label: "Administrator", //Create users, manage settings, etc
                                    value: 5
                                },
                                {
                                    label: "Advanced", //Create dashboards
                                    value: 4
                                },
                                {
                                    label: "Contributor", //Create rules
                                    value: 3
                                },
                                {
                                    label: "Browser", //Read-Only access to dashboards
                                    value: 2
                                },
                                {
                                    label: "Custom", //Super limited custom account
                                    value: 1
                                }
                            ]
                        }
                    ]
                }
            ],

            buttons: [

                {
                    name: "Submit",
                    onclick: function(){
                        var values = form.getData();


                        var username = trim(values.username);
                        if (!username) {
                            form.showError("Username is required", form.findField("username"));
                            return;
                        }


                        var password = trim(values.password);
                        if (!password) {
                            form.showError("Password is required", form.findField("password"));
                            return;
                        }
                        //TODO: Check password complexity?


                        var fullName = trim(values.fullName);
                        if (!fullName) {
                            form.showError("Name is required", form.findField("fullName"));
                            return;
                        }


                        var firstName, lastName;
                        var arr = fullName.split(" ");
                        firstName = arr[0];
                        if (arr.length>1){
                            lastName = arr[arr.length-1];
                        }



                        if (!user.person) user.person = {};
                        user.person.firstName = firstName;
                        user.person.lastName = lastName;
                        user.person.fullName = fullName;

                        if (user.authentication){
                            user.authentication.forEach((auth)=>{
                                if (auth.service==='database'){
                                    auth.key = username;
                                    auth.value = password;
                                }
                            });
                        }
                        else{
                            user.authentication = [{
                                service: "database",
                                key: username,
                                value: password
                            }];
                        }

                        user.accessLevel = parseInt(values.accessLevel);
                        user.status = (values.status==="true" ? 1 : 0);


                        if (!user.person.contact) user.person.contact = {};
                        user.person.contact.phone = trim(values.phone);
                        user.person.contact.email = trim(values.email);


                        me.onSubmit();
                    }
                },

                {
                    name: "Cancel",
                    onclick: function(){
                        form.clear();
                        win.close();
                        me.onCancel();
                    }
                }
            ]

        });




      //Create window
        if (parent===document.body){
            win = new javaxt.dhtml.Window(document.body, {
                width: 450,
                valign: "middle",
                modal: true,
                resizable: false,
                body: div,
                style: config.style.window
            });
        }
        else{
            win = div;
            win.setTitle = function(){};
            win.show = function(){};
            win.hide = function(){};
            win.close = win.hide;
        }




      //Watch for enter key events
        form.el.addEventListener("keyup", function(e){
            if (e.keyCode===13){
                form.getButton("Submit").click();
            }
        });


      //Broadcast onChange events
        form.onChange = function(formInput, value){
            me.onChange(formInput.name, value);
        };
    };


  //**************************************************************************
  //** getValues
  //**************************************************************************
    this.getValues = function(){
        return user;
    };


  //**************************************************************************
  //** setValue
  //**************************************************************************
    this.setValue = function(name, value){
        form.setValue(name, value);
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(_user){
        form.clear();

        if (_user){
            user = _user;


            for (var key in user) {
                if (user.hasOwnProperty(key)){
                    var value = user[key];

                    if (key==="status"){
                        if ((value+"")==="1"){
                            value = "true";
                        }
                        else{
                            value = "false";
                        }
                    }

                    form.setValue(key, value);
                }
            }


            if (user.person){


                for (var key in user.person) {
                    if (user.person.hasOwnProperty(key)){
                        var value = user.person[key];
                        form.setValue(key, value);
                    }
                }


                if (user.person.contact){
                    for (var key in user.person.contact) {
                        if (user.person.contact.hasOwnProperty(key)){
                            var value = user.person.contact[key];
                            form.setValue(key, value);
                        }
                    }
                }
            }


            if (user.authentication){
                user.authentication.forEach((auth)=>{
                    if (auth.service==='database'){
                        form.setValue("username", auth.key);
                        form.setValue("password", auth.value);
                    }
                });
            }

        }
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        user = {};
        form.clear();
    };


    this.onCancel = function(){};
    this.onSubmit = function(){};
    this.onChange = function(name, value){};


  //**************************************************************************
  //** setTitle
  //**************************************************************************
    this.setTitle = function(str){
        win.setTitle(str);
    };


  //**************************************************************************
  //** show
  //**************************************************************************
    this.show = function(){
        win.show();
    };


  //**************************************************************************
  //** hide
  //**************************************************************************
    this.hide = function(){
        win.hide(); //same as close
    };


  //**************************************************************************
  //** close
  //**************************************************************************
    this.close = function(){
        win.close();
    };


    var trim = function(str){
        if (str){
            str = str.trim();
            if (str==="") {
                str = null;
            }
        }
        return str;
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;



    init();
};