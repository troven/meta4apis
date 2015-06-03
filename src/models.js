var exports = module.exports = {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper

// =============================================================================
// handle model requests

exports.handle = function(req, res, meta, meta4) {

    // dynamic delegation to a CRUD proxy
    var crud = require("./crud/"+meta.store)

    crud.handle(req, res, meta, meta4)

}