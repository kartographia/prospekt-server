if(!prospekt) var prospekt={};
if(!prospekt.admin) prospekt.admin={};

//******************************************************************************
//**  FileAdmin
//******************************************************************************
/**
 *   Panel used to manage files and folders on the server
 *
 ******************************************************************************/

prospekt.admin.FileAdmin = function(parent, config) {

    var me = this;
    var defaultConfig = {

    };

    var fileService = "files/";
    var fileBrowser;
    var callout;
    var waitmask;
    var link;

  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

      //Parse config
        config = merge(config, defaultConfig);
        if (!config.style) config.style = javaxt.dhtml.style.default;
        if (!config.waitmask) config.waitmask = new javaxt.express.WaitMask(document.body);
        waitmask = config.waitmask;


        var mainDiv = createElement("div", parent, {
            width: "100%",
            height: "100%"
        });
        addShowHide(mainDiv);
        me.el = mainDiv;



      //Create file browser
        fileBrowser = new javaxt.express.FileBrowser(mainDiv, {
            fileService: fileService,
            style: {
                toolbar: {
                    panel: "panel-toolbar",
                    button: config.style.toolbarButton,
                    path: "form-input",
                    icons: {
                        back: "fas fa-arrow-left",
                        forward: "fas fa-arrow-right",
                        up: "fas fa-arrow-up",
                        refresh: "fas fa-sync-alt"
                    }
                },
                table: config.style.table
            }
        });


      //Watch for click events
        fileBrowser.onClick = function(item, path, row, e){

            var rightClick = false;
            if ("which" in e)  // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
                rightClick = e.which == 3;
            else if ("button" in e)  // IE, Opera
                rightClick = e.button == 2;

            if (rightClick){
                if (!callout) createCallout();
                callout.update(item);
                callout.showAt(e.pageX, e.pageY, "right", "top");
            }
            else{
                if (item.type==="Folder"){
                    fileBrowser.setDirectory(path);
                }
            }

        };



      //Watch for drag and drop events
        var div = fileBrowser.getGrid().el;
        div.addEventListener('dragover', onDragOver, false);
        div.addEventListener('drop', function(e) {
            e.stopPropagation();
            e.preventDefault();

          //Upload files
            var files = e.dataTransfer.files;
            var idx = 0;
            var path = fileBrowser.getDirectory();
            var uploadFiles = function(){
                if (files.length===0){

                }
                else{
                    var file = files[idx]; idx++; //files.shift();
                    if (file) uploadFile(file, path, uploadFiles);
                }
            };
            uploadFiles();



        }, false);


    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        fileBrowser.clear();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(){
        me.clear();
        fileBrowser.setDirectory("/");
    };


  //**************************************************************************
  //** notify
  //**************************************************************************
    this.notify = function(op, model, id, userID){

        if (model==="File"){
            var path = id;
            var dir = fileBrowser.getDirectory();
            if (dir.length>0){

                if (path.indexOf(dir)===0){
                    var fileName = path.substring(dir.length);
                    console.log(fileName);
                    var idx = fileName.indexOf("/");
                    if (idx==-1) fileBrowser.refresh();

                    /*
                    var grid = fileBrowser.getGrid();
                    grid.forEachRow(function(row){
                        var record = row.record;
                        var name = record[0];
                        var type = record[1];
                        if (type=="File"){

                        }
                    });
                    */
                }

            }
        }
    };


  //**************************************************************************
  //** createCallout
  //**************************************************************************
  /** Used to create a context menu for the file grid
   */
    var createCallout = function(){


      //Create callout
        callout = new javaxt.dhtml.Callout(document.body,{
            style: config.style.callout
        });


      //Create file menu
        var fileMenu = createElement("div", callout.getInnerDiv(), "callout-menu");
        addShowHide(fileMenu);
        fileMenu.hide();


      //Create folder menu
        var folderMenu = createElement("div", callout.getInnerDiv(), "callout-menu");
        addShowHide(folderMenu);
        folderMenu.hide();


        var createMenuItem = function(icon, label, parent, onClick){
            var menuItem = createElement("div", parent, "callout-menu-item noselect");
            createElement("div", menuItem, icon);
            var text = createElement("div", menuItem);
            text.innerText = label;
            menuItem.onclick = function(){
                if (onClick) onClick.apply(me, [callout.item]);
                callout.hide();
            };
            return menuItem;
        };


      //Populate file menu
        createMenuItem("fas fa-file-download", "Download", fileMenu, download);
        createMenuItem("far fa-edit", "Rename", fileMenu, (item)=>{
            console.log("Rename File");
            console.log(item);
        });
        createMenuItem("far fa-trash-alt", "Delete", fileMenu, (item)=>{
            console.log("Delete File");
            console.log(item);
        });


      //Populate folder menu
        createMenuItem("far fa-edit", "Rename", folderMenu, (item)=>{
            console.log("Rename Folder");
            console.log(item);
        });
        createMenuItem("far fa-trash-alt", "Delete", folderMenu, (item)=>{
            console.log("Delete Folder");
            console.log(item);
        });


      //Custom update method
        callout.update = function(item){
            callout.item = item;
            if (item.type==="Folder"){
                fileMenu.hide();
                folderMenu.show();
            }
            else{
                folderMenu.hide();
                fileMenu.show();
            }
        };

    };


  //**************************************************************************
  //** download
  //**************************************************************************
    var download = function(item){
        var dir = fileBrowser.getDirectory();
        var path = dir + item.name;

        if (!link) link = createElement("a", me.el, {
            display: "none"
        });
        link.setAttribute("href", fileService + "download?path=" + encodeURIComponent(path));
        link.setAttribute("download", item.name);
        link.click();
    };


  //**************************************************************************
  //** uploadFile
  //**************************************************************************
    var uploadFile = function(file, path, callback){
        var formData = new FormData();
        formData.set("path", path);
        var name = file.name;
        //console.log(file.size);
        formData.append(name, file);
        post(fileService+"upload", formData, {
            success: function(){},
            failure: function(){},
            finally: function(){
                if (callback) callback.apply(me, []);
            }
        });
    };


  //**************************************************************************
  //** onDragOver
  //**************************************************************************
  /** Called when the client drags a file over the parent.
   */
    var onDragOver = function(e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var createElement = javaxt.dhtml.utils.createElement;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var merge = javaxt.dhtml.utils.merge;
    var post = javaxt.dhtml.utils.post;
    var get = javaxt.dhtml.utils.get;


    init();
};