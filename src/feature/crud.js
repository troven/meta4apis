var self = module.exports

// =============================================================================
// framework packages

var assert     = require('assert');         // assertions
var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

//var helper     = require('meta4helpers');   // files & mixins

// =============================================================================
// Configure CRUD Feature

self.feature = function(router, feature, config) {

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

                // nested defaults
                _.defaults(meta, { adapter:{}, schema: {}, defaults: {} } )

                // delegate the request
                if ( meta.store && (!meta.id || meta.id == collection) ) {
                    meta.home = meta.home || feature.data

                    // ensure store is remote
                    if (!meta.isServer && !meta.isRemote) {
                        return res.json( { status: "failed", message: "model ["+collection+"] is client-only" });
                    }

                    return self.redirectCRUD(req, res, meta, config)
                }
            }

            return res.json( { status: "failed", message: "Missing model: "+collection });
        })
    });

}

// =============================================================================
// Redirect CRUD operations

self.redirectCRUD = function(req, res, meta, config) {

    // acquire the adapter
    var store = meta.store || meta.adapter.type || "loki"
    var crud = require("./crud/"+store)
    if (!crud)
        return res.json( { status: "failed", message: "Missing store: "+store });

    // dynamic delegation
    crud.handle(req, res, meta, config)

}