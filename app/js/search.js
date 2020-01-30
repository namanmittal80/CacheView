const htmlparser2 = require('htmlparser2');
const fs = require('fs-extra');
const lunr = require('lunr');
const path = require('path');

// Entry point for child process
process.on('message', function (m) {
    createNewLunrIndex(m).then(function (res) {
        // After index has been written, msg parent
        process.send('Done');
    })
});


// Creates lunr index file for given workspace
function createNewLunrIndex(workspace) {
    return new Promise(function (res, err) {

        // Index workspace and when all promises settle
        indexEntireWorkspace(workspace).then(function (documents) {

            // Create Lunr index, identify fields
            idx = lunr(function () {
                this.ref('id');
                this.field('text');
                this.field('title');
                this.field('notes');

                // For each fulfilled promise, add to index
                documents.forEach(function (doc) {
                    if (doc.status === "fulfilled") {
                        this.add(doc.value)
                    }
                }, this)
            });

            // Create serialization of index and write to file
            let serializedIdx = JSON.stringify(idx);
            fs.writeFileSync(path.resolve(__dirname, `../workspaces/${workspace}/search_index.json`), serializedIdx, function (err) {
                console.error()
            });

            // Resolve current promise
            res()
        }).catch(console.error());
    })
}

// Parses all html files for a given workspace
function indexEntireWorkspace(workspace) {
    let workspaceJSON = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../workspaces/${workspace}/${workspace}.json`)).toString('utf-8'));

    filePathsMap = {};
    fileTitleMap = {};
    fileNotesMap = {};
    seen = new Set();


    // Create mapping from file id to source path
    while (workspaceJSON.length !== 0) {
        curr = workspaceJSON.pop();
        if (!seen.has(curr.id)) {
            seen.add(curr.id);
            if (curr.type === 'folder') {
                workspaceJSON = workspaceJSON.concat(curr.children)
            } else {
                if (curr.data.size <= 10) {
                    filePathsMap[curr.id] = curr.data.sourceFile
                } else {
                    filePathsMap[curr.id] = ""
                }
                fileTitleMap[curr.id] = curr.text.replace(".html", "")
                fileNotesMap[curr.id] = curr.data.notes
            }
        }
    }

    // Create html parser that extracts text
    const parser = new htmlparser2.Parser(
        {
            ontext(text) {
                text = text.trim();
                if (text.length < 5000 && text.length > 1) {
                    full_text += ' ' + text
                }
            }
        },
        {decodeEntities: true}
    );

    // Create list of promises for reading each html file and sending it to parser
    promises = Object.keys(filePathsMap).map(function (id) {
        return new Promise(function (resolve, reject) {
            full_text = '';
            try {
                if (filePathsMap[id] != "") {
                    rawHTML = fs.readFileSync(filePathsMap[id]).toString('utf-8');
                    parser.write(rawHTML);
                    parser.end()
                }
            } catch {
                reject()
            }
            // Create dict containing id and all text in a webpage
            resolve({
                'id': id,
                'text': full_text,
                'title': fileTitleMap[id],
                'notes': fileNotesMap[id]
            })
        });
    });

    return Promise.allSettled(promises)
}
