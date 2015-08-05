var exports = module.exports = {};

// =============================================================================
// framework packages

var nedb        = require('nedb')           // nedb data store
var assert     = require('assert');         // assertions
var _          = require('underscore');     // collections helper

// =============================================================================
// handle model requests

var sendError = function(res, status, message) {
    res.status = status
    return res.send(message);
}

exports.handle = function(req, res, meta, meta4) {

	var router = meta4.router, config = meta4.config

    var config = meta.nedb || { path: meta4.home+"/"+meta4.paths.data+"/"+meta.id }

    assert(config.path, "{{nedb.path}} is missing")

    console.log(req.method, "query:", req.query, "params:", req.params)
    console.log("nedb path:", config.path)

    var db = new nedb({ filename: config.path+".nedb", autoload: true });


    switch( req.method ) {

        // CREATE
        case 'POST':
console.log("POST:", typeof (req.body), _.isObject(req.body.json))
            db.insert(req.body.json)
            break;

        // READ
        case 'GET':
console.log("GET query:", req.query, req.parts)

              db.find({}, function(err, items) {
console.log("FOUND: ", err, items)
                err ? sendError(res, 500, "READ failed: "+e) : res.json( { data: items })
              })
            break;

        // UPDATE
        case 'PUT':
            var data = JSON.parse(req.body )
            db.update(req.body.json)
            break;

        // DELETE
        case 'DELETE':
            var data = JSON.parse(req.body)
            db.delete(req.body.json)
            break;

        // ERRORS
        default:
            return sendError(res, 405, 'method not support: '+meta.id)
    }

}