var self = module.exports

// =============================================================================
// framework packages

var assert     = require('assert');         // assertions
var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

//var helper     = require('meta4helpers');   // files & mixins

var DEFAULT_ADAPTER = "loki"
var ID_ATTRIBUTE    = "_id"
var HTTP_TO_CRUD = { "POST": "create", "GET": "read", "PUT": "update", "DELETE": "delete"}

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

			    if (!crud.isServer && !crud.isRemote) {
			        return res.json( { status: "failed", message: "model ["+collection+"] is client-only" });
			    }

				// handle path args
			    if (req.parts.length>1 && req.body.json) {
			        req.body.json[crud.idAttribute] = req.parts[1]
			    }

			    // delegate the request
			    if ( crud.id == collection ) {
			        crud.home = crud.home || feature.data
	                return self.resolveCRUD(req, res, crud, meta4)
                }
            }

            return res.json( { status: "failed", message: "Missing model: "+collection, errors: [ file ] });
        })
    });

}

// =============================================================================
// Redirect to CRUD Adapter

self.resolveCRUD = function(req, res, crud, meta4) {

    // default CRUD meta-data

    _.defaults(crud, { idAttribute: ID_ATTRIBUTE, adapter: {}, schema: {}, defaults: {} } )

    // acquire the adapter

    var store = crud.store || crud.adapter.type || DEFAULT_ADAPTER
    var adapter = require("./crud/"+store)

	// send error

    if (!adapter) return res.json( { status: "failed", message: "missing adapter: "+store });

	// resolve adapter action fn()

	var action = HTTP_TO_CRUD[req.method]
	var fn = adapter[action]
	if (!fn) {
		return res.json( { status: "error", message: "unsupported method:"+req.method } );
	}

	var cmd = { meta: req.query, data: _.extend({}, req.body) }

    // delegate to the adapter && send JSON result to client

    return fn(cmd, crud, function(result) {
	    res.json(result)
    })

}

self.teardown = function(options) {
	console.log("\tclean-up: "+options.package)
}