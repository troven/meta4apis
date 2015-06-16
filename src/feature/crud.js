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

self.feature = function(meta4, feature) {

    assert(meta4, "feature needs meta4")
    assert(feature, "{{crud}} feature not configured")

	var router = meta4.router, config = meta4.config

    // =============================================================================
    // dynamically route model / CRUD requests

    router.use(feature.path+'/*', function(req, res) {

        var params = req.params[0]          // decode the wild-card
        req.parts  = params.split("/")      // slice into {{collection}}/{{model}}
        var collection = req.parts[0]       // {{collection}}

        // path to the meta-data definition
        var file = feature.home+"/"+collection+".json"

        // load collection's meta-data
        fs.readFile(file, function(error, data) {
            if (!error) {
                var crud = JSON.parse(data)
                if (req.parts.length>1 && req.body.json) {
                    req.body.json._id = req.parts[1]
                }

                // nested defaults
                _.defaults(crud, { adapter: {}, schema: {}, defaults: {} } )

                // delegate the request
                if ( crud.store && (!crud.id || crud.id == collection) ) {
                    crud.home = crud.home || feature.data

                    // ensure store is remote
                    if (!crud.isServer && !crud.isRemote) {
                        return res.json( { status: "failed", message: "model ["+collection+"] is client-only" });
                    }

                    // dispatch the request to CRUD
                    return self.redirectCRUD(req, res, crud, meta4)
                }
            }

            return res.json( { status: "failed", message: "Missing model: "+collection });
        })
    });

}

// =============================================================================
// Redirect CRUD operations

self.redirectCRUD = function(req, res, crud, meta4) {

    // acquire the adapter
    var store = crud.store || crud.adapter.type || "loki"
    var crud = require("./crud/"+store)
    if (!crud)
        return res.json( { status: "failed", message: "missing store "+store });

    // dynamic delegation
    crud.handle(req, res, crud, config)

}