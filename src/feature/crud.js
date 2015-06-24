var self = module.exports

// =============================================================================
// framework packages

var assert     = require('assert');         // assertions
var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

//var helper     = require('meta4helpers');   // files & mixins

var upload      = require('./upload');        // uploads & attachments

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


    router.use(feature.path+'/:collection/_upload_', upload.uploader( feature.upload || meta4.config.features.upload ))

    router.use(feature.path+'/:collection/:id?', function(req, res, next) {

		 var collection = req.params.collection
		 var id = req.params.id

		 // ugly hack to prevent match on duplicate routes
		 if (id == "_upload_" ) return next()

        // path to the meta-data definition
        var file = feature.home+"/"+collection+".json"

        // load collection's meta-data
        fs.readFile(file, function(error, data) {
            if (!error) {
                var crud = JSON.parse(data)

			    // default CRUD meta-data
			    _.defaults(crud, { idAttribute: ID_ATTRIBUTE, adapter: {}, schema: {}, defaults: {} } )

			    if (!crud.isServer && !crud.isRemote) {
			        return res.json( { status: "failed", message: "model ["+collection+"] is client-only" });
			    }

				// handle path args
			    if (id && req.body.json) {
			        req.body.json[crud.idAttribute || ID_ATTRIBUTE] = id
			    }

			    // make sure request matches the definition
			    if ( crud.id == collection ) {
			        crud.home = crud.home || feature.data

					// convert to a CRUD operation
					var action = HTTP_TO_CRUD[req.method]
					var cmd = { action: action, meta: req.query, data: _.extend({}, req.body) }

					// resolve CRUD & return result to browser
	                return self.execute( cmd, crud, function(result) {
		                result["@id"] = req.baseUrl
					    res.json(result)
	                } )
                }
            }

            return res.json( { status: "failed", message: "Missing model: "+collection, errors: [ file ] });
        })
    });
}

// =============================================================================

self.executeXXX = function(cmd, crud, cb) {
}


// =============================================================================
// Redirect CMD to CRUD Adapter

self.execute = function(cmd, crud, cb) {

    _.defaults(crud, { idAttribute: ID_ATTRIBUTE, adapter: {}, schema: {}, defaults: {} } )

    // acquire the adapter
	var action  = cmd.action
    var store   = crud.store || crud.adapter.type || DEFAULT_ADAPTER
    var adapter = require("./crud/"+store)

	// send error
    if (!adapter) return cb && cb( { status: "failed", message: "missing adapter: "+store });

	// resolve adapter action fn()
	var fn = adapter[action]
	if (!fn) {
		return cb && cb( { status: "error", message: "unsupported method:"+action } );
	}

    // delegate to the adapter && send JSON result to client
    return fn(cmd, crud, cb)

}

self.teardown = function(options) {
	console.log("\tclean-up: "+options.package)
	_.each(self._db, function(db) {

	})
}