const {
  dialog
} = require('electron').remote;

let folderIconPath;
let fileIconPath;
if (fs.existsSync("../Resources")) {
  folderIconPath = path.resolve(process.resourcesPath, "./app/images/folder.png");
  fileIconPath = path.resolve(process.resourcesPath, "./app/images/file.png");
} else {
  folderIconPath = path.resolve(__dirname, './images/folder.png');
  fileIconPath = path.resolve(__dirname, './images/file.png');
}

//import file button binding
function importFiles(worksapceid) {
  dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{
      name: 'Entries',
      extensions: ['htm', 'html', 'rdf']
    }]
  }).then((result) => {
    if (result.canceled === false) {
      try {

        //add all the HTML files that were selected in the dialog
        result.filePaths.filter((fullPath) => {
          //filter so all the files are either html or htm extensions
          return path.extname(fullPath) === '.html' ||
            path.extname(fullPath) === '.htm';
        }).forEach((fullPath) => {
          let stats = fs.statSync(fullPath);
          let sizeInMb = stats["size"] / 1000000.0;
          let modifiedDateMs = stats["mtimeMs"];
          let birthtime = stats["birthtime"];
          //add the new entry nodes to the jstree
          $('#file-container').jstree(true).create_node(null, {
            "id": getTimeStampWithMS(),
            "text": path.basename(fullPath),
            "type": "file",
            "icon": fileIconPath,
            "data": {
              "sourceFile": fullPath,
              "notes": "",
              "size": sizeInMb,
              "modifiedDateMs": modifiedDateMs,
              "birthtime": birthtime
            }
          });
        });

        //import all the rdf files that were selected
        result.filePaths.filter((fullPath) => {
          return path.extname(fullPath) === '.rdf';
        }).forEach((fullPath) => {
          addRDFToTree(fullPath);

        });
        let workspaceid = $('#files').attr('workspace');
        updateJSON(workspaceid);
        updateSearchIndex(workspaceid);
        // wait half a second before hiding the import tag for aesthetic purposes

      } catch (err) {
        console.error(err);
      }
    }
  }).catch(console.error);
}

//recursive function to add new JSTree nodes to current tree
function addDirectoryTreeToJSTree(parent, tree) {
  //if the current node is a directory
  if (tree.type === 'directory') {
    let childId = $('#file-container').jstree(true).create_node(parent, {
      'id': getTimeStampWithMS(),
      'text': tree.name,
      'icon': folderIconPath,
      'type': 'folder'
    });
    //recursive call for children
    if (tree.children) {
      tree.children.forEach((element) => {
        addDirectoryTreeToJSTree(childId, element)
      });
    }
  }
  //if the current node is a file
  if (tree.type === 'file') {
    let stats = fs.statSync(tree.path);
    let sizeInMb = stats["size"] / 1000000.0;
    let modifiedDateMs = stats["mtimeMs"];
    let birthtime = stats["birthtime"];
    $('#file-container').jstree(tree).create_node(parent, {
      'id': getTimeStampWithMS(),
      'text': tree.name,
      'type': 'file',
      'icon': fileIconPath,
      'data': {
        "sourceFile": tree.path,
        "notes": "",
        "size": sizeInMb,
        "modifiedDateMs": modifiedDateMs,
        "birthtime": birthtime
      },
    });
  }
}

//import directory button binding
function importDirectory(workspaceid) {
  dialog.showOpenDialog({
    properties: ['openDirectory']
  }).then((result) => {
    if (result.canceled === false) {
      try {
        let directory = result.filePaths;

        if (directory.length === 1) {
          //get the directory tree with the html files
          let tree = dirTree(directory[0], {
            extensions: /\.html/,
          });

          //add the directory tree to the js tree instance
          addDirectoryTreeToJSTree(null, tree);

          //update the workspace JSON
          let workspaceid = $('#files').attr('workspace');
          updateJSON(workspaceid);
          updateSearchIndex(workspaceid);
        } else {
          //some how the user selects multiple directories
          console.error('The user should not be able to select multiple directories');
        }
      } catch (err) {
        console.error(err);
      }
    }
  }).catch(console.error);
}

//recusivly add nodes to JS tree from RDF parse output
function convertRootTree(rdf, currentEntry, rdfPath) {

  if (rdf[currentEntry].type === 'folder') {
    let retValue = {
      'id': currentEntry,
      'text': rdf[currentEntry].title,
      'icon': folderIconPath,
      'type': 'folder',
    };

    let children = rdf._sequences[currentEntry];

    if (children) {
      retValue.children = children.map((entry) => {
        return convertRootTree(rdf, entry, rdfPath);
      }).filter((child) => {
        return jQuery.isEmptyObject(child) == false;
      });
    }

    return retValue;
  } else {
    if (fs.existsSync(path.join(path.dirname(path.format(rdfPath)), 'data', currentEntry, 'index.html')) == false) {
      return {};
    }
    let stats = fs.statSync(path.join(path.dirname(path.format(rdfPath)), 'data', currentEntry, 'index.html'));
    let sizeInMb = stats["size"] / 1000000.0;
    let modifiedDateMs = stats["mtimeMs"];
    let birthtime = stats["birthtime"];

    return {
      'id': currentEntry,
      'text': rdf[currentEntry].title,
      'type': 'file',
      'data': {
        'sourceFile': path.join(path.dirname(path.format(rdfPath)), 'data', currentEntry, 'index.html'),
        'notes': "",
        "size": sizeInMb,
        "modifiedDateMs": modifiedDateMs,
        "birthtime": birthtime
      },
    };
  }
}

//recursivly add nodes to the jstree
function appendCompleteTree(parent, completeTree) {
  completeTree.forEach((node) => {
    let parentId = $('#file-container').jstree(true).create_node(parent, node);
    if (node.children) {
      appendCompleteTree(parentId, node.children);
    }
  });
}

//get the all the ID's in a JStree object structure
function collectIDs(entry) {
  if (entry === undefined) {
    return [];
  } else {
    if (entry.type === 'file') {
      return [entry.id];
    } else {
      let retValue = [entry.id];
      if (entry.children) {
        entry.children.forEach((element) => {
          retValue = retValue.concat(collectIDs(element));
        });
      }
      return retValue;
    }
  }
}

//If the new tree to append doesn't contain all the entries from the RDF parse output
//then add those missing entries manually
function addMissingEntries(parseOutput, tree, rdfPath) {
  let collectedIDs = [];

  //get all the ID's which already exist in the tree
  tree.map(collectIDs).forEach((entry) => {
    collectedIDs = collectedIDs.concat(entry);
  });

  //get all the file entries that could be read from the RDF file
  let rdfFileEntries = Object.keys(parseOutput).filter((key) => {
    return key !== '_sequences' && parseOutput[key].type == '';
  });

  //compare the expected files with the already made tree
  //if a rdfFileentry doesn't exist in the tree then add it to root
  let forgottenEntries = rdfFileEntries.filter((entry) => {
    return collectedIDs.indexOf(entry) == -1
  });

  forgottenEntries.forEach((entry) => {
    if (fs.existsSync(path.join(path.dirname(path.format(rdfPath)), 'data', entry, 'index.html'))) {
      let stats = fs.statSync(path.join(path.dirname(path.format(rdfPath)), 'data', entry, 'index.html'));
      let sizeInMb = stats["size"] / 1000000.0;
      let modifiedDateMs = stats["mtimeMs"]
      let birthtime = stats["birthtime"];
      tree.push({
        'id': entry,
        'text': parseOutput[entry].title,
        'type': 'file',
        'icon': fileIconPath,
        'data': {
          'sourceFile': path.join(path.dirname(path.format(rdfPath)), 'data', entry, 'index.html'),
          'notes': "",
          "size": sizeInMb,
          "modifiedDateMs": modifiedDateMs,
          "birthtime": birthtime
        },
      });
    }
  });

  return tree;

}

//parse the RDF file and create JStree nodes using the parsed output
function addRDFToTree(rdfFilePath) {
  try {
    let rdfPath = path.parse(rdfFilePath);
    let parsed = rdf_parser(path.format(rdfPath));

    //if there is a root then follow that
    if (parsed._sequences.root) {

      //make the root folder for the new workspace
      let tree = {
        'id': getTimeStampWithMS(),
        'text': 'Root',
        'icon': folderIconPath,
        'type': 'folder',
      };

      //start creating the children of the root
      let seq = parsed._sequences;

      //create the children of the root recursivly
      tree.children = seq.root.map((entry) => {
        return convertRootTree(parsed, entry, rdfPath)
      });

      tree = addMissingEntries(parsed, [tree], rdfPath);

      appendCompleteTree(null, tree);
      let workspaceid = $('#files').attr('workspace');
      updateJSON(workspaceid);
      updateSearchIndex(workspaceid);
    } else {

      let seq = parsed._sequences;
      let rootEntries = Object.keys(seq).filter((entry) => {
        return seq[entry] !== undefined
      });
      if (rootEntries.length === 0) {
        //if there is no root folders
        let entries = Object.keys(parsed).filter((key) => {
          return key !== '_sequences';
        });
        let tree = entries.map((entry) => {
          return convertRootTree(parsed, entry, rdfPath)
        });
        tree = addMissingEntries(parsed, tree, rdfPath);
        appendCompleteTree(null, tree);
        let workspaceid = $('#files').attr('workspace');
        updateJSON(workspaceid);
        updateSearchIndex(workspaceid);
      } else {
        //make entries for each root entry folder
        let tree = rootEntries.forEach((entry) => {
          return convertRootTree(parsed, entry, rdfPath)
        });
        tree = addMissingEntries(parsed, tree, rdfPath);
        appendCompleteTree(null, tree);
        let workspaceid = $('#files').attr('workspace');
        updateJSON(workspaceid);
        updateSearchIndex(workspaceid);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function getTimeStampWithMS() {
  let date = new Date();
  return date.getFullYear() + ("0" + (date.getMonth() + 1)).slice(-2) + ("0" + date.getDate()).slice(-2) + ("0" + date.getHours() + 1).slice(-2) + ("0" + date.getMinutes()).slice(-2) + ("0" + date.getSeconds()).slice(-2) + ("00" + date.getMilliseconds()).slice(-3);
}