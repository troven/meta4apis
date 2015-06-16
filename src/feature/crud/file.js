var exports = module.exports = {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions

var upload     = require('../upload');       // upload

// =============================================================================
// handle model requests

exports.handle = function(req, res, meta, meta4) {

    assert(meta.home, "CRUD FILE missing {{home}}")
    assert(meta.id, "CRUD FILE missing {{id}}")

    var contentType = req.get('Content-Type')
    if (contentType && contentType.indexOf("multipart/form-data")>=0) {
        console.log("Attachment: ", req.method, req.get('Content-Type'), file)
    }

    var file = meta.home+"/"+meta.id+".json"
    console.log("CRUD File:", req.method, contentType, file)

    // switch back
    var cmd = {
        GET: function(req, res) {
            fs.readFile(file, function(error, data) {
                if (error) {
        console.log("Model Data Error: ", file, error)
                    res.status = 404;
                    return res.send('no model data: '+meta.id);
                }

                var models = JSON.parse(data)
                res.json({ status: 'success', meta: meta, data: models });
            })
        },
        POST: function(req, res) {
console.log("File POST:", file, req.body)
                res.json({ status: 'todo', meta: meta, data: [] });
        },
        PUT: function(req, res) {
console.log("File PUT:", file, req.body)
                res.json({ status: 'todo', meta: meta, data: [] });
        },
        DELETE: function(req, res) {
console.log("File DELETE:", file)
                res.json({ status: 'todo', meta: meta, data: [] });
        }
    }


    cmd[req.method] && cmd[req.method](req,res)


}