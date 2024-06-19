if(!prospekt) var prospekt={};
if(!prospekt.companies) prospekt.companies={};

//******************************************************************************
//**  Bookmark View
//*****************************************************************************/
/**
 *   Panel that used to render user-defined groups of companies.
 *
 ******************************************************************************/

prospekt.companies.BookmarkView = function(parent, config) {
    this.className = "prospekt.companies.BookmarkView";

    var me = this;
    var defaultConfig = {
        style: javaxt.dhtml.style.default
    };

    var panel;

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
        panel.clear();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(){
        me.clear();


        get("Bookmarks", {
            success: function(text){
                var bookmarks = JSON.parse(text);
                bookmarks.forEach((bookmark, i)=>{

                    var thumbnail = "00" + (i+1);
                    if (thumbnail.length>3) thumbnail = thumbnail.substring(1);
                    bookmark.thumbnail = "/images/thumbnails/" + thumbnail + ".jpg";

                    createCard(bookmark);
                });
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
  //** createCard
  //**************************************************************************
    var createCard = function(bookmark){
        var div = createElement("div", panel.innerDiv, "bookmark");
        var preview = createElement("div", div, "preview");
        var users = createElement("div", div, "users");
        var title = createElement("div", div, "title");
        var info = createElement("div", div, "info");


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
        preview.style.backgroundImage = "url(" + bookmark.thumbnail + ")";

      //Broadcast click events
        div.onclick = function(e){
            e.stopPropagation();
            me.onClick(bookmark);
        };
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var merge = javaxt.dhtml.utils.merge;
    var get = javaxt.dhtml.utils.get;

    var createOverflowPanel = prospekt.utils.createOverflowPanel;
    var addCommas = prospekt.utils.addCommas;

    init();
};