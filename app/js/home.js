// lunr search index for search api
let idx;

// loads home page/s tart menu. contains 2 components: most recent tab and options for workspaces
function onStart() {
    // create workspaces directory containing workspaces with their JSON file and search index if not created yet
    if (!fs.existsSync(path.resolve(__dirname, "./workspaces"))) {
        fs.mkdirSync(path.resolve(__dirname, './workspaces/'));
    }

    // create most recent workspaces text file if not created yet
    if (!fs.existsSync(path.resolve(__dirname, "./workspaces/mostRecent"))) {
        fs.writeFileSync(path.resolve(__dirname, './workspaces/mostRecent'), "", function (err) {
            console.log(err);
        });
    }

    // create workspace names folder if not created yet
    if (!fs.existsSync(path.resolve(__dirname, "./workspaces/workspaceNames"))) {
        fs.writeFileSync(path.resolve(__dirname, './workspaces/workspaceNames'), "", function (err) {
            console.log(err);
        })
    }

    // most recent tab
    loadMostRecent();

    // event listener for closing out of existing workspace search
    $("body").bind("click", function (e) {
        if (e.target.id === "existingSearch" || e.target.id === "existing" || e.target.id === "existing_workspace_dropdown")
            return;
        $("#existing_workspace_dropdown").hide();
    });

    // event handler for open existing workbench
    $("#existing").bind("click", function () {
        if ($('#list').html() === '') {
            var x = document.getElementById("emptyWorkspacesToast");
            x.className = "show";
            setTimeout(function () {
                x.className = x.className.replace("show", "");
            }, 3000);
        } else {
            // clear previous search
            $('#existingSearch').val('');
            loadExistingWorkbenches();
            $("#existing_workspace_dropdown").show();
        }
    });

    // event handler for search existing workspace
    $("#existingSearch").bind("keyup", function () {
        let input = $('#existingSearch').val().toLowerCase();
        $("#workplaces_list a").each(function () {
            let workbench = $(this)[0].id.toLowerCase();
            if (workbench.indexOf(input) > -1) {
                $(this).show();
            } else {
                $(this).hide();
            }
        })
    });

    // close button for all workspaces
    $("#closeWorkspaces").bind("click", function () {
        $("#existing_workspace_dropdown").hide();
    });

    // event listener to open recent workbench
    $('#list a').bind('click', function () {
        changeView($(this).attr("id") + ".json");
    });

    // event listener to create blank workspace
    $('#blank').bind('click', function () {
        // prompt user for workspace name
        prompt({
            title: 'Enter a Workspace Name',
            label: 'Workspace Name:',
            inputAttrs: {
                type: 'text',
                required: true
            },
            type: 'input',
            alwaysOnTop: true
        }).then((result) => {
            if (result != null) {
                let desiredName = sanitize(result);
                if (desiredName === "") {
                    alert("Please enter a valid name!");
                } else {
                    if (isAvailable(desiredName)) {
                        createNewWorkSpace(desiredName);
                    } else {
                        // keep prompting user until they provide valid workspace name
                        alert(desiredName + " is already taken!");
                    }
                }
            }
        }).catch(console.error);
    });
}

// loads most recent workspaces to the left tab
function loadMostRecent() {
    // first clear any previous recent caches
    $('#list').empty();

    // load most recent workbenches
    let mostRecent = fs.readFileSync(path.resolve(__dirname, './workspaces/mostRecent')).toString('utf-8').split("\n");

    // programmatically add most recent workbenches to side bar
    for (let i = 0; i < mostRecent.length; i++) {
        if (mostRecent[i] !== "") {
            $("#list").append("<a id=" + mostRecent[i] + " href='#' style=\"padding-left:10%\" class=\"list-group-item list-group-item-action flex-column align-items-start\">\n" +
                "<div class=\"recent\"><span class=\"recent_workspace_name\">" + mostRecent[i] + "</span><br><span class=\"recent_workspace_path\">~/workspaces/" + mostRecent[i] + "/" + mostRecent[i] + ".json</span></div>\n" + "</a>"
            )
        }
    }
}

function loadExistingWorkbenches() {
    // directory with all of the workspaces
    let workspaceNames = fs.readFileSync(path.resolve(__dirname, './workspaces/workspaceNames')).toString('utf-8').split("\,");

    // first clear any previous recent caches
    $('#workplaces_list').empty();

    // iterate over all workspace names and programmatically add to list
    for (let workspace of workspaceNames) {
        if (workspace !== "") {
            $("#workplaces_list").append("<a id=" + workspace + " href='#' style=\"padding-left:10%\" class=\"workspaceItems list-group-item list-group-item-action flex-column align-items-start\">\n" +
                "<div class=\"workbench\">" + workspace + "<br>~/workspaces/" + workspace + "/" + workspace + ".json</div>\n" + "</a>"
            );
        }
    }

    // event listener for clicking on workspace name from existing workspaces
    $(document).on("click", "#workplaces_list a", function () {
        changeView($(this).attr("id") + ".json");
    });
}

// sanitize name when creating new workbench to get rid of all non alphanumeric characters
function sanitize(result) {
    if (result == null || result === "") return "";
    else {
        return result.replace(/[^a-zA-Z0-9]/g, "");
    }
}

// unbind event handlers
function unbindHome() {
    // Unbind event handlers so they don't get triggered 2x after back button is pressed
    $("body").unbind();
    $("#closeWorkspaces").unbind();
    $("#existing").unbind();
    $('#list a').unbind();
    $('#blank').unbind();
    $('#existingSearch').unbind();
}

// go from start menu to actual workspace
function changeView(workspacePath) {
    try {
        // get the workspace ID to update most recent list then load appropriate workbench
        let directories = workspacePath.split("\\");
        let directory = directories[directories.length - 1];
        let workspace = directory.substring(0, directory.length - 5);
        // json representation of file structure of workspace
        let workspaceJSON = JSON.parse(fs.readFileSync(path.resolve(__dirname, './workspaces/' + workspace + '/' + workspace + '.json')).toString('utf-8'));

        // unbind stuff
        unbindHome();
        // hide existing workspaces dropdown
        $("#existing_workspace_dropdown").hide();
        // hide most recent workbenches and open selected workbench
        $("#workbenches").hide();
        $("#files").show();
        $("#workspaceLabel").hide();
        $("#workspacesHr").hide();
        // hide start menu and show iframe
        $("#startmenu").hide();
        $("#iframe-container").show();
        $('#files').attr('workspace', workspace);
        $('#workspaceName').text(workspace);

        // update mostRecent text file
        updateRecent(workspace);
        // load workspace view
        loadFileExplorer(workspace, workspaceJSON);
        // load lunr search index for workspace
        loadSearchIndex(workspace);
    } catch (_) {
        // remove workspace from recent tab if error
        let name = workspacePath.split(".")[0];
        removeFromSidebar(name);
    }
}

// load lunr search index for workspace for searching
function loadSearchIndex(workspace) {
    $("#indexing").show();
    try {
        let lunrIdx = JSON.parse(fs.readFileSync(path.resolve(__dirname, `./workspaces/${workspace}/search_index.json`)).toString('utf-8'));
        idx = lunr.Index.load(lunrIdx);
        $("#indexing").hide();
    } catch {
        updateSearchIndex(workspace)
    }
}

// update lunr search index for when changes to the workspace occur (adding new files, changing notes, etc)
function updateSearchIndex(workspace) {
    $("#indexing").show();
    $("#search-input").prop("disabled", true);
    let child = cp.fork(path.resolve(__dirname, './js/search.js'));
    child.send(workspace);
    child.on('message', function (m) {
        let lunrIdx = JSON.parse(fs.readFileSync(path.resolve(__dirname, `./workspaces/${workspace}/search_index.json`)).toString('utf-8'));
        idx = lunr.Index.load(lunrIdx);
        $("#search-input").prop("disabled", false);
        $("#indexing").hide();
    });
}

// remove workspace from recent tab in case of error
function removeFromSidebar(name) {
    // load most recent workbenches
    let mostRecent = fs.readFileSync(path.resolve(__dirname, './workspaces/mostRecent')).toString('utf-8').split("\n");
    // new recent workbenches
    let newRecent = mostRecent.filter(x => x !== name);
    let output = newRecent.join("\n");
    // write new recent workbenches to file
    fs.writeFileSync(path.resolve(__dirname, './workspaces/mostRecent'), output, function (err) {
        if (err) {
            console.log(err);
        }
    });

    // reset views and unbind stuff
    unbindHome();
    onStart();
}

// update the most recently used list
function updateRecent(workspaceid) {
    // loading in the current most recent file and appending new one
    let mostRecent = fs.readFileSync(path.resolve(__dirname, './workspaces/mostRecent')).toString('utf-8').split("\n");
    let newRecent = workspaceid.toString();
    for (let workspace of mostRecent) {
        if (workspace !== workspaceid.toString()) {
            newRecent += "\n";
            newRecent += workspace.toString();
        }
    }
    // writing new most recent
    fs.writeFileSync(path.resolve(__dirname, './workspaces/mostRecent'), newRecent, function (err) {
        if (err) {
            console.log(err);
        }
    })
}

// check if the workspace name is available
function isAvailable(workspaceName) {
    // read from list of all workspace names from text file
    let workspaceNames = fs.readFileSync(path.resolve(__dirname, './workspaces/workspaceNames')).toString('utf-8').split("\,");
    // loop over all of them to see if selected one is available
    for (let i = 0; i < workspaceNames.length; i++) {
        if (workspaceName === workspaceNames[i]) return false;
    }
    return true;
}