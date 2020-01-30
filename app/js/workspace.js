// name of current workspace
let currentWorkspace;

// create new folder and its corresponding json
function createNewWorkSpace(workspaceName) {
    // create empty json to put in workspace file
    let json = JSON.stringify([], null, "\t");

    // the current workspace name should not be already taken, so create its corresponding folder
    fs.mkdirSync(path.resolve(__dirname, `./workspaces/${workspaceName}`));

    // writing the empty json to the current workspace folder
    fs.writeFileSync(path.resolve(__dirname, `./workspaces/${workspaceName}/${workspaceName}.json`), json, function (err) {
        if (err) {
            console.log(err);
        }
    });

    // add to text file of all workspace names;
    fs.appendFile(path.resolve(__dirname, './workspaces/workspaceNames'), "," + workspaceName, function (err) {
        if (err) {
            console.log(err);
        }
    });

    // load new view
    changeView(workspaceName + ".json");
}

// updating notes in the specific file.
function updateNotes(workspaceid, fileid, newNote) {
    let node = $("#file-container").jstree(true).get_node(fileid);
    node.data.notes = newNote;
    $("#file-container").jstree(true).redraw(true);
    updateJSON(workspaceid);
}

// updating the workbench folder in case of move, delete, rename, etc.
function updateJSON(workspaceid) {
    // getting the new root level structure of current workspace
    let newJSON = JSON.stringify($('#file-container').jstree(true).get_json('#', {
        flat: false,
        no_state: true,
        no_li_attr: true,
        no_a_attr: true
    }), null, "\t");

    // writing new json to file
    fs.writeFileSync(path.resolve(__dirname, `./workspaces/${workspaceid}/${workspaceid}.json`), newJSON, function (err) {
        if (err) {
            console.log(err);
        }
    })
}

// loading the jstree functionality
function loadFileExplorer(workspaceid, json) {
    // setting current workspace to given workspace
    currentWorkspace = workspaceid;
    // chrome tabs instance
    let el = document.querySelector('.chrome-tabs');
    let chromeTabs = new ChromeTabs();
    chromeTabs.init(el);

    // map of title keys and path values
    let map = new Map();
    // list of all currently selected nodes (for multiple deletions)
    let selected = [];
    // flag to see if jstree is currently deleting
    let deleting = false;
    // fileid and workspaceid are stored up here
    let currentFileId = "";

    // location of folder and file icons for jstree
    let folderIcon;
    let fileIcon;
    if (fs.existsSync("../Resources")) {
        folderIcon = path.resolve(process.resourcesPath, './app/images/folder.png');
        fileIcon = path.resolve(process.resourcesPath, './app/images/file.png');
    } else {
        folderIcon = "./images/folder.png";
        fileIcon = "./images/file.png";
    }

    // event listener for iframe
    // once an iframe gets initially loaded, bind an event listener to the loaded iframe to catch any link clicks
    $('body iframe').on('load', function () {
        $(this).contents().find('a').bind('click', function (e) {
            e.preventDefault();
            let target = e.target;
            while (!target.href) {
                target = target.parentElement;
            }
            shell.openExternal(target.href).then(_ => _);
        })
    });

    // event listeners for importing a file into the current workspace
    $('#importHTML').bind('click', function () {
        importFiles(workspaceid);
    });
    $('#importDirectory').bind('click', function () {
        importDirectory(workspaceid);
    });

    // Event handler for creating new root level folder
    $('#newRoot').bind('click', function () {
        let timestamp = getTimestamp();
        $('#file-container').jstree(true).create_node('#', {
            "id": timestamp,
            "text": timestamp,
            "icon": folderIcon,
            "type": "folder"
        }, "last")
    });

    // Event handler for toggle notes
    $('#toggleNotes').bind('click', function () {
        $('#metadata').attr("style", "width: 250px");
        $('#iframe-container').attr("style", "margin-right: 250px");
    });

    // Event handler for info
    $('#data').bind('click', function () {
        var modal = document.getElementById("myModal");
        modal.style.display = "block";

        let node = $("#file-container").jstree(true).get_node(currentFileId);
        let note = node.data.notes;
        let size = node.data.size;
        let birthtime = node.data.birthtime;
        let createdDate = new Date(birthtime);

        $("#modalData").html("<b> Size: </b> " + size + " MB" + "<br/>");
        $("#modalData").append("<b> Created Date: </b>" + createdDate + "<br/>");
    });

    // Event handler for exit notes
    $('#closeNotes').bind('click', function () {
        $('#metadata').attr("style", "width: 0px");
        $('#iframe-container').attr("style", "margin-right: 0px");
    });

    // Event handler for save notes; takes notes and workspace/file IDs and records it
    $("#saveNotes").bind('click', function () {
        let note = $("#notes").val();
        updateNotes(currentWorkspace, currentFileId, note);
        updateSearchIndex(workspaceid);
    });

    // Handle changing tabs
    el.addEventListener('activeTabChange', ({
                                                detail
                                            }) => {
        try {
            // name of the tab that we changed to
            let name = detail.tabEl.outerText;
            // tabId variable in the tab instance contains id of corresponding jstree node and corresponding path
            let idAndNote = detail.tabEl.dataset.tabId;
            // just have to split it by first new line, since path can't have newline
            let id = idAndNote.substring(0, idAndNote.indexOf('\n'));
            // reading in the note of current tab
            let node = $("#file-container").jstree(true).get_node(id);
            let note = node.data.notes;
            // loading in proper source for iframe
            $("#iframe").attr("src", map.get(id));
            // want to show the button to edit notes
            $('.toggleNotes').show();
            $('#data').show();
            // load up the corresponding notes for this page
            getPageNote(note, name);
            // update current fileid
            currentFileId = id;
        } catch (_) {
            // incase user tries to add new tab by doubling clicking
            chromeTabs.removeTab(chromeTabs.activeTabEl);
        }
    });

    // Handle deleting tabs
    el.addEventListener('tabRemove', ({
                                          _
                                      }) => {
        // in case there are no tabs left
        if ($('.chrome-tab').length === 0) {
            // set iframe to blank incase no tabs left after delete
            $("#iframe").attr("src", "");
            // close the notes panel
            $("#closeNotes").trigger('click');
            // get rid of the edit notes button
            $('#toggleNotes').hide();
            $('#data').hide();
            // set current fileid to empty string
            currentFileId = "";
        }
    });

    $('#file-container')
        .jstree({
            'core': {
                'check_callback': function (operation, node, node_parent) {
                    if (operation === "move_node") {
                        // make sure we can only drag into a folder
                        return (node_parent.type !== "file");
                    } else {
                        return true;
                    }
                },
                'data': json
            },
            'types': {
                'folder': {
                    'icon': folderIcon
                },
                'file': {
                    'icon': fileIcon
                }
            },
            'contextmenu': {
                'items': function (node) {
                    let items = {
                        'create': {
                            'label': 'New Folder',
                            'action': function () {
                                let timestamp = getTimestamp();
                                $('#file-container').jstree(true).create_node(node, {
                                    "id": timestamp,
                                    "text": timestamp,
                                    "icon": folderIcon,
                                    "type": "folder"
                                }, "last")
                            }
                        },
                        'rename': {
                            'label': "Rename",
                            'action': function () {
                                $('#file-container').jstree(true).edit(node);
                            }
                        },
                        'delete': {
                            'label': "Delete",
                            'action': function () {
                                // delete all of the currently selected files in the selected array
                                deleting = true;
                                let initialLength = selected.length;
                                for (let i = 0; i < initialLength; i++) {
                                    $('#file-container').jstree(true).delete_node(selected[i]);
                                }
                                updateJSON(workspaceid);
                                updateSearchIndex(workspaceid);
                                deleting = false;
                            }
                        }
                    };
                    if (node.type === "file") {
                        delete items.create;
                    }
                    return items;
                }
            },
            'search': {
                'search_callback': function (searchValue, node) {
                    if (searchValue.length >= 3) {
                        let res = idx.search(searchValue);
                        if (res.length > 0) {
                            res = res.map(a => a.ref);
                            return res.includes(node.id);
                        }
                    }
                    return false;
                }

            },
            'plugins': ['dnd', 'wholerow', 'unique', 'types', 'contextmenu', 'search']
        })
        // Event handler for reordering
        .bind('move_node.jstree', function () {
            updateJSON(workspaceid);
        })
        // Event handler for file selection
        .bind("dblclick.jstree", function (e) {
            let tree = $(this).jstree(true);
            let node = tree.get_node(e.target);

            //Only update cache when a file is selected, not a folder
            if (node.type !== 'folder') {
                //this will load files that are somewhere else on the local file system
                let source = node.data.sourceFile;
                //let workspaceId = $('#files').attr('workspace');
                fileId = node.id;
                let name = node.text;
                let note = node.data.notes;

                if (!fs.existsSync(source)) {
                    alert("Could not find file path: " + source + "!");
                } else {
                    getPageNote(note, name);
                    $('#iframe').attr('src', source);
                    chromeTabs.addTab({
                        title: node.text,
                        id: fileId + "\n" + note
                    });
                    $('#toggleNotes').show();
                    map.set(fileId, source);
                }
            }
        })
        // Event handler for create
        .bind("create_node.jstree", function () {
            updateJSON(workspaceid);
        })
        // Event handler for rename
        .bind("rename_node.jstree", function () {
            updateJSON(workspaceid);
            updateSearchIndex(workspaceid);
        })
        // Event handler for selecting files
        .bind("changed.jstree", function (e, data) {
            // add newly selected file to array if jstree.delete is not running
            if (!deleting) {
                selected = [];
                for (let i = 0; i < data.selected.length; i++) {
                    selected.push(data.selected[i]);
                }
            }
        });

    // fixes bug where pressing enter goes back to homepage
    $('#search-input').keypress(function (event) {
        if (event.keyCode === 13 || event.which === 13) {
            event.preventDefault();
            $("#search-button").trigger('click');
        }
    });

    // Event handler for search
    //   $(".search-input").keyup(function() {
    //     if ($('#file-container').find("li").length < 100) {
    //       $('#search-button').hide()
    //       $('#file-container').jstree('search', $(this).val());
    //     } else {
    //       $('#search-button').show()
    //     }
    //   });

    // Event listener for search
    $(".search").click(function () {
        $('#file-container').jstree('search', $('#search-input').val());
    });


    // Event listener for back/start menu button
    $('#back-button').bind('click', function () {
        goHome();
    });

    // Event listener for delete workspace
    $('#delete-button').bind('click', function () {
        //are you sure
        prompt({
            title: 'Confirm',
            label: 'Enter Workspace Name to Confirm: ',
            inputAttrs: {
                type: 'text',
                required: true
            },
            type: 'input',
            alwaysOnTop: true
        }).then((result) => {
            if (result == null) { // check for correct workspace name

            } else if (result !== currentWorkspace) {
                alert("Incorrect Workspace Name!");
            } else {
                // deleting this workspace from mostRecent
                let mostRecent = fs.readFileSync(path.resolve(__dirname, './workspaces/mostRecent')).toString('utf-8').split("\n");
                let newRecent = "";
                for (let workspace of mostRecent) {
                    if (workspace !== currentWorkspace) {
                        newRecent += workspace.toString();
                        newRecent += "\n";
                    }
                }

                //get rid of last newline an write to file
                newRecent = newRecent.substring(0, newRecent.length - 1);
                fs.writeFileSync(path.resolve(__dirname, './workspaces/mostRecent'), newRecent, function (err) {
                    if (err) {
                        console.log(err);
                    }
                });

                // deleting this workspace from workspaceNames
                let workspaceNames = fs.readFileSync(path.resolve(__dirname, './workspaces/workspaceNames')).toString('utf-8').split(",");
                let newWorkspaceNames = "";
                for (let workspace of workspaceNames) {
                    if (workspace !== currentWorkspace) {
                        newWorkspaceNames += workspace.toString();
                        newWorkspaceNames += ",";
                    }
                }
                //get rid of last comma
                newWorkspaceNames = newWorkspaceNames.substring(0, newWorkspaceNames.length - 1);
                fs.writeFileSync(path.resolve(__dirname, './workspaces/workspaceNames'), newWorkspaceNames, function (err) {
                    if (err) {
                        console.log(err);
                    }
                });
                // nuke file
                rimraf.sync(path.resolve(__dirname, `./workspaces/${currentWorkspace}`));

                // go back to home page
                goHome();
            }
        }).catch(console.error);
    });
}

// go back to home view
function goHome() {
    // close notes if open
    $("#closeNotes").trigger('click');
    // get rid of edit button
    $('#toggleNotes').hide();
    // reset search bar value
    $('#search-input').val('');
    // get rid of tabs
    $('.chrome-tabs-content').empty();
    // destroy tree
    $('#file-container').jstree("destroy");
    // reset the views
    // inverse of before
    $("#workbenches").show();
    $("#files").hide();
    $("#startmenu").show();
    $('#iframe').attr("src", "");
    $("#iframe-container").hide();
    // show recents title
    $("#workspaceLabel").show();
    $("#workspacesHr").show();
    // Unbind event handlers
    $('#back-button').unbind();
    $('#delete-button').unbind();
    $('#newRoot').unbind();
    $('#toggleNotes').unbind();
    $('#saveNotes').unbind();
    $('#closeNotes').unbind();
    $('#importDirectory').unbind();
    $('#importHTML').unbind();
    $('body iframe').contents().find('a').unbind();
    $('#data').unbind();
    $('#importTwo').unbind();
    $('#importRDF').unbind();

    // go back to start page
    onStart();
}

// displays the note panel with its corresponding page notes
function getPageNote(note, pageName) {
    // displaying the title of current file name
    $("#filename").html("Notes for:&nbsp<br><b>" + pageName + "</b> ");
    // loading in the current file's notes
    $("#notes").val(note);
    // weird case when notes is undefined (should not happen)
    if (note === "undefined") {
        $("#notes").val("");
    } else {
        $("#notes").val(note);
    }
}

// get current timestamp when creating a new folder to use as the id
function getTimestamp() {
    let date = new Date();
    return date.getFullYear() + ("0" + (date.getMonth() + 1)).slice(-2) + ("0" + date.getDate()).slice(-2) + ("0" + date.getHours() + 1).slice(-2) + ("0" + date.getMinutes()).slice(-2) + ("0" + date.getSeconds()).slice(-2);
}