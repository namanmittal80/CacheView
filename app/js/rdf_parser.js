
let parentSeq = '';
let inSeq = false;
let sequences = {};
let descriptions = {};
let corrupted = false;

function pullTimestamp(triple) {
    if (triple.endsWith('root')) {
        return 'root';
    }
    return triple.substring(triple.indexOf('item') + 4, triple.length).trim()
}

const parser = new htmlparser2.Parser({

    onopentag(name, attrs) {
        if (name == 'rdf:seq') {
            //corrupted check
            if (attrs['rdf:about'] === undefined) {
                corrupted = true;
            }
            else {
                inSeq = true;
                parentSeq = pullTimestamp(attrs['rdf:about']);
                sequences[parentSeq] = [];
            }
        }

        if (name == 'rdf:li' && inSeq) {
            //corrupted check
            if (attrs['rdf:resource'] === undefined) {
                corrupted = true;
            }
            else {
                sequences[parentSeq].push(pullTimestamp(attrs['rdf:resource']));
            }


        }

        if (name == 'rdf:description') {
            //correpted check
            if (attrs['rdf:about'] === undefined) {
                corrupted = true;
            }
            else {
                let currEntry = pullTimestamp(attrs['rdf:about']);

                descriptions[currEntry] = {};

                for (let prop in attrs) {
                    if (prop.startsWith('ns1')) {
                        descriptions[currEntry][prop.substring(prop.indexOf(':') + 1, prop.length)] = attrs[prop];
                    }
                }
            }

        }
    },

    onclosetag(name) {
        if (name == 'rdf:seq') {
            inSeq = false;
            parentSeq = '';
        }
    }
}, { decodeEntities: true });

function convertToTree(data) {
    let sequnces = data['_sequences'];
    if (sequnces.root) {

        let runner = function (entry) {
            if (sequences[entry]) {
                let info = data[entry];
                let children = sequences[entry];
                let childValues = children.map(runner);
                return {
                    "text": info.title,
                    "id": info.id,
                    "icon": info.icon,
                    "data": {
                        "type": info.type,
                        "source": info.source,
                        "chars": info.chars,
                        "comment": info.comment
                    },
                    "children": childValues
                }
            }
            else {
                let info = data[entry];
                return {
                    "text": info.title,
                    "id": info.id,
                    "icon": info.icon,
                    "data": {
                        "type": info.type,
                        "source": info.source,
                        "chars": info.chars,
                        "comment": info.comment
                    }
                };
            }
        }

        let convertRoot = sequences.root.map(runner);

        return {
            "text": "Workspace",
            "id": "",
            "icon": "",
            "children": convertRoot
        };
    }
    else {


    }
}

function parseRDF(path) {
    if (fs.existsSync(path)) {
        parser.write(fs.readFileSync(path).toString());
        let retValue = { '_sequences': sequences, ...descriptions };

        if (corrupted) {
            //alert the user that the RDF file was corrupted
            //console.log('the RDF file was seen to be corrupted');
            let alertHTML = "<div class='alert alert-warning alert-dismissible fade show' role='alert'><button type='button' class='close' data-dismiss='alert'>&times;</button><strong>Warning!</strong> Corrupted RDF, interpreting input...</div>";
            $('#rdfAlert').append(alertHTML);

            corrupted = false;
        }

        parentSeq = '';
        inSeq = false;
        sequences = {};
        descriptions = {};

        return retValue;
    }
}

module.exports = parseRDF;
