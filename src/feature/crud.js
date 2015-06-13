var self = exports = module.exports = module.exports || {};

// =============================================================================
// framework packages

var assert     = require('assert');         // assertions
var fs         = require('fs');             // file system

// =============================================================================
// meta4 packages

//var helper     = require('meta4helpers');   // files & mixins

// =============================================================================
// Configure CRUD Feature

exports.feature = function(router, feature, config) {

    console.log("\tCRUD", feature.path)

    // =============================================================================
    // dynamically route model / CRUD requests

    assert(feature, "{{models}} feature not configured")

    router.use(feature.path+'/*', function(req, res) {

        var params = req.params[0]          // decode the wild-card
        req.parts  = params.split("/")      // slice into {{collection}}/{{model}}
        var collection = req.parts[0]       // {{collection}}

        // path to the meta-data definition
        var file = feature.home+"/"+collection+".json"

        // load collection's meta-data
        fs.readFile(file, function(error, data) {
            if (!error) {
                var meta = JSON.parse(data)
                if (req.parts.length>1 && req.body.json) {
                    req.body.json._id = req.parts[1]
                }

                // delegate the request
                if ( meta.store && (!meta.id || meta.id == collection) ) {
                    meta.home = meta.home || feature.data
console.log("meta home: ", meta.home)
                    return self.handle(req, res, meta, config)
                }
            }

            // something went wrong
            res.status = 404;
            return res.send('unknown collection: '+collection);
        })
    });

}

// =============================================================================
// Handle CRUD operations

exports.handle = function(req, res, meta, config) {

    // acquire the proxy
    var store = meta.store || "file"
    var crud = require("./crud/"+store)

    // dynamic delegation
    crud.handle(req, res, meta, config)

}