var exports = module.exports = {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper

// =============================================================================
// handle model requests

exports.handle = function(req, res, meta, meta4) {

    var db = require("./store/"+meta.store)
    db.handle(req, res, meta, meta4)


}