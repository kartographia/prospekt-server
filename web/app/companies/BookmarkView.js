if(!prospekt) var prospekt={};
if(!prospekt.companies) prospekt.companies={};

//******************************************************************************
//**  Bookmark View
//*****************************************************************************/
/**
 *   Panel that used to render company bookmarks. Bookmarks are user-defined
 *   groups of companies (see CompanyGroup model).
 *
 ******************************************************************************/

prospekt.companies.BookmarkView = function(parent, config) {
    this.className = "prospekt.companies.BookmarkView";

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var panel;
    var callout;
    var bookmarkEditor;
    var bookmarks = {};


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);


        if (!config.waitmask) config.waitmask = new javaxt.express.WaitMask(document.body);
        waitmask = config.waitmask;


        panel = createOverflowPanel(parent);
        var outerDiv = panel.outerDiv;
        var innerDiv = panel.innerDiv;
        innerDiv.className = "company-bookmarks";

        me.el = outerDiv;
        addShowHide(me);
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        bookmarks = {};
        panel.clear();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(){
        me.clear();


        get("CompanyGroups", {
            success: function(text){
                var bookmarks = JSON.parse(text);
                bookmarks.forEach((bookmark)=>{
                    addBookmark(bookmark);
                });
                panel.update();
            },
            failure: function(){

            }
        });
    };


  //**************************************************************************
  //** onClick
  //**************************************************************************
    this.onClick = function(bookmark){};


  //**************************************************************************
  //** notify
  //**************************************************************************
    this.notify = function(op, model, id, userID){

        if (model==="CompanyGroup"){
            if (op==="delete"){
                var bookmark = bookmarks[id+""];
                if (bookmark){
                    panel.innerDiv.removeChild(bookmark.card);
                    panel.update();
                }
            }
            else{
                get("CompanyGroup?id="+id, {
                    success: function(text){
                        var bookmark = JSON.parse(text);
                        if (op==="create"){
                            addBookmark(bookmark);
                            panel.update();
                        }
                        else if (op==="update"){
                            var orgBookmark = bookmarks[bookmark.id+""];
                            var card = orgBookmark.card;
                            orgBookmark = JSON.parse(JSON.stringify(orgBookmark));
                            delete orgBookmark["card"];
                            if (isDirty(bookmark, orgBookmark)){
                                card.update(bookmark);
                                bookmarks[bookmark.id+""] = bookmark;
                                bookmark.card = card;
                            }
                        }
                    },
                    failure: function(){} //ignore
                });
            }
        }
    };


  //**************************************************************************
  //** addBookmark
  //**************************************************************************
    var addBookmark = function(bookmark){
        var card = createCard();
        card.update(bookmark);
        bookmark.card = card;
        bookmarks[bookmark.id+""] = bookmark;
    };


  //**************************************************************************
  //** createCard
  //**************************************************************************
    var createCard = function(){
        var div = createElement("div", panel.innerDiv, "bookmark");
        var menu = createElement("div", div, "menu-button");
        createElement("div", menu, "menu-icon");

        var preview = createElement("div", div, "preview");
        var users = createElement("div", div, "users");
        var title = createElement("div", div, "title");
        var info = createElement("div", div, "info");


        var idx = panel.innerDiv.childNodes.length;




        div.update = function(bookmark){

            menu.onclick = function(e){
                e.stopPropagation();
                showMenu(bookmark, this);
            };


          //Render users
            for (var i=0; i<bookmark.users.length; i++){
                var img = createElement("div", users, "user");
                //img.style.backgroundImage = "url(/images/people/" + user + ".jpg)";
                if (i==3){
                    break;
                }
                else{

                }
            }

          //Render title
            title.innerText = bookmark.name;

          //Render metadata
            var numCompanies = bookmark.companies.length;
            info.innerText = addCommas(numCompanies) + " Compan" + (numCompanies==1 ? "y" : "ies");


          //Update image
            var thumbnail;
            if (bookmark.info && bookmark.info.thumbnail){

            }
            else{
                thumbnail = "00" + idx;
                if (thumbnail.length>3) thumbnail = thumbnail.substring(1);
                thumbnail = "/images/thumbnails/" + thumbnail + ".jpg";
            }

            preview.style.backgroundImage = "url(" + thumbnail + ")";



          //Broadcast click events
            div.onclick = function(e){
                e.stopPropagation();
                me.onClick(bookmark);
            };

        };

        return div;
    };


  //**************************************************************************
  //** editBookmark
  //**************************************************************************
    var editBookmark = function(bookmark, menu){
        if (!bookmarkEditor){

            var win = createWindow({
                style: config.style.window,
                title: "Edit Bookmark",
                valign: "top",
                width: 450,
                height: 685,
                modal: true,
                buttons: [
                    {
                        name: "Save",
                        onclick: function(){
                            bookmarkEditor.validateFields((bookmark)=>{

                                console.log(bookmark);


                                post("CompanyGroup", bookmark, {
                                    success: function(){
                                        win.close();
                                    }
                                });


                            });
                        }
                    },
                    {
                        name: "Cancel",
                        onclick: function(){
                            win.close();
                        }
                    }
                ]
            });


            var body = win.getBody();
            body.style.padding = "0px";

            bookmarkEditor = new prospekt.companies.BookmarkEditor(body, config);
            bookmarkEditor.show = win.show;
        }

        bookmarkEditor.update(bookmark);
        bookmarkEditor.show();
    };


  //**************************************************************************
  //** deleteBookmark
  //**************************************************************************
    var deleteBookmark = function(bookmark, menu){

        confirm({
            title: "Delete Bookmark",
            text: "Are you sure you wish to delete this bookmark?",
            leftButton: {
                label: "Yes",
                value: true
            },
            rightButton: {
                label: "No",
                value: false
            },
            callback: function(yes){
                if (yes){
                    del("CompanyGroup?id="+bookmark.id);
                }
            }
        });

    };


  //**************************************************************************
  //** showMenu
  //**************************************************************************
    var showMenu = function(bookmark, target){

        var accessLevel = 0;
        bookmark.users.forEach((user)=>{
            if (document.user.id===user.userID){
                accessLevel = user.accessLevel;
            }
        });
        if (accessLevel<2) return;


      //Get callout
        callout = getCallout(config);


      //Remove contents
        var innerDiv = callout.getInnerDiv();
        while (innerDiv.firstChild) {
            innerDiv.removeChild(innerDiv.lastChild);
        }


      //Create menu items
        var div = createElement("div", innerDiv, "bookmark menu");
        div.appendChild(createMenuOption("Edit Properties", "edit", function(){
            editBookmark(bookmark, target.parentNode);
        }));
        if (accessLevel===3){
            div.appendChild(createMenuOption("Manage Access", "users", function(){
                //deleteBookmark(bookmark, target.parentNode);
            }));
            div.appendChild(createMenuOption("Delete Bookmark", "trash", function(){
                deleteBookmark(bookmark, target.parentNode);
            }));
        }


      //Render callout to the right of the target button
        var rect = javaxt.dhtml.utils.getRect(target);
        var x = rect.x+(rect.width-3);
        var y = rect.y+(rect.height/2);
        callout.showAt(x, y, "right", "top");
    };


  //**************************************************************************
  //** createMenuOption
  //**************************************************************************
    var createMenuOption = function(label, icon, onClick){
        var div = createElement("div", "bookmark menu-item noselect");
        if (icon && icon.length>0){
            div.innerHTML = '<i class="fas fa-' + icon + '"></i>' + label;
        }
        else{
            div.innerHTML = label;
        }
        div.label = label;
        div.onclick = function(e){
            e.stopPropagation();
            callout.hide();
            onClick.apply(this, [label]);
        };
        addShowHide(div);
        return div;
    };



  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var isDirty = javaxt.dhtml.utils.isDirty;
    var merge = javaxt.dhtml.utils.merge;
    var post = javaxt.dhtml.utils.post;
    var del = javaxt.dhtml.utils.delete;
    var get = javaxt.dhtml.utils.get;

    var createOverflowPanel = prospekt.utils.createOverflowPanel;
    var createWindow = prospekt.utils.createWindow;
    var getCallout = prospekt.utils.getCallout;
    var addCommas = prospekt.utils.addCommas;

    init();
};