var self = exports = module.exports = module.exports || {};

// =============================================================================
// framework packages

var assert     = require('assert');         // assertions
var fs         = require('fs');             // file system

// =============================================================================
// meta4 packages

// =============================================================================
// Configure CRUD Feature

exports.configure = function(router, config) {

    var feature = config.features.crud
    console.log("\tCRUD", feature)

    // =============================================================================
    // dynamically route model / CRUD requests

    assert(feature, "{{models}} feature not configured")

    router.use(feature.path+'/*', function(req, res) {
        var collection = req.params[0] // decode the wild-card
        var file = config.homeDir+"/"+feature.home+"/"+collection+".json"

        // load model's meta-data
        fs.readFile(file, function(error, data) {
            if (!error) {
                var meta = JSON.parse(data)

                // delegate the request, if collection meta-data concurs
                if (meta.id == collection) {
                    meta.homeDir = config.homeDir+"/"+feature.data
                    return self.handle(req, res, meta, config)
                }
            } else {
                res.status = 404;
                return res.send('unknown collection: '+collection);
            }
        })
    });

    console.log("[meta4node] CRUD initialized")
}

// =============================================================================
// Handle CRUD operations

exports.handle = function(req, res, meta, meta4) {

    // define the CRUD proxy
    var store = meta.store || "tingodb"

    // acquire the proxy
    var crud = require("./crud/"+store)

    // dynamic delegation
    crud.handle(req, res, meta, meta4)

}