var exports = module.exports = {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper

// =============================================================================
// handle model requests

exports.handle = function(req, res, meta) {

    var file = meta.homeDir+"/"+meta.id+".json"
    fs.readFile(file, function(error, data) {
        if (error) {
console.log("Model Data Error: ", file, error)
            res.status = 404;
            return res.send('no model data: '+meta.id);
        }

console.log("Model: ", req.method, meta.id)
        var models = JSON.parse(data)
    res.json({ success: true, meta: meta, data: models });
    })

}