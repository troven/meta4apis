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
                // ensure store is remote
                if (!crud.isServer && !crud.isRemote) {
                    return res.json( { status: "failed", message: "model ["+collection+"] is client-only" });
                }

                // default CRUD meta-data
                _.defaults(crud, { idAttribute: "_id", adapter: {}, schema: {}, defaults: {} } )

				// handle path args
                if (req.parts.length>1 && req.body.json) {
                    req.body.json[crud.idAttribute] = req.parts[1]
                }

                // delegate the request
                if ( (!crud.id || crud.id == collection) ) {

                    // path where storage saves it's data
                    crud.home = crud.home || feature.data

                    // dispatch the request to CRUD
                    return self.redirectCRUD(req, res, crud, meta4)
                }
            }

            return res.json( { status: "failed", message: "Missing model: "+collection, errors: [ file ] });
        })
    });

}

// =============================================================================
// Redirect CRUD operations

self.redirectCRUD = function(req, res, crud, meta4) {

    // acquire the adapter
    var store = crud.store || crud.adapter.type || "loki"
    var adapter = require("./crud/"+store)
    if (!adapter)
        return res.json( { status: "failed", message: "missing adapter: "+store });

    // delegate to the adapter
    adapter.handle(req, res, crud, meta4)

}