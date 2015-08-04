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
	self.options = feature
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

	            // convert HTTP method to a CRUD command
	            var action = HTTP_TO_CRUD[req.method]
	            var cmd = { action: action, meta: _.extend({},req.query), data: _.extend({}, req.body) }

	            // if 'id' matches a named query ... execute it
	            if (id && crud.queries && crud.queries[id]) {
		            cmd.action = "query"
		            cmd.query = crud.queries[id]
	            } else if (id && req.body.json) {
		            // assign a model ID
			        req.body.json[crud.idAttribute || ID_ATTRIBUTE] = id
			    }

			    // make sure request matches the definition
			    if ( crud.id == collection ) {
			        crud.home = crud.home || feature.data

					// execute CMD and return result to browser
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

// execute CMD and return result to browser
//return self.execute( cmd, crud, function(result) {
//	result["@id"] = req.baseUrl
//	res.json(result)
//} )


// =============================================================================
// Redirect CMD to CRUD Adapter

self.crud = function(collection, meta, model, done) {
	// path to the meta-data definition
	var file = self.options.home+"/"+collection+".json"

	// load collection's meta-data
	fs.readFile(file, function(error, data) {
		if (!error) {
			var crud = JSON.parse(data)

			// default CRUD meta-data
			_.defaults(crud, { idAttribute: ID_ATTRIBUTE, adapter: {}, schema: {}, defaults: {} } )

			if (!crud.isServer && !crud.isRemote) {
				return done && done( { status: "failed", message: "model ["+collection+"] is client-only" });
			}

			// convert HTTP method to a CRUD command
			var action = HTTP_TO_CRUD[req.method]
			var cmd = { action: action, meta: meta, data: model }

			// assign a model ID
			if (id && crud.queries && crud.queries[id]) {
				cmd.action = "query"
				cmd.query = crud.queries[id]
			} else if (id && model) {
				model[crud.idAttribute || ID_ATTRIBUTE] = id
			}

			// make sure request matches the definition
			if ( crud.id == collection ) {
				crud.home = crud.home || this.options.data
				return done && done(cmd, crud)
			}
		}

		return done && done( { status: "failed", message: "Missing model: "+collection, errors: [ file ] });
	})
}

// =============================================================================
// Redirect CMD to CRUD Adapter

self.execute = function(cmd, crud, cb) {

	assert(cmd, "{{crud}} missing cmd")
	assert(cmd.action, "{{crud}} missing cmd action")
	assert(crud, "{{crud}} execute not configured")

    _.defaults(crud, { idAttribute: ID_ATTRIBUTE, adapter: { type: DEFAULT_ADAPTER }, schema: {}, defaults: {} } )

    // acquire the adapter
	var action  = cmd.action
    var store   = crud.store || crud.adapter.type
    var adapter = require("./crud/adapter/"+store)

	// send error
    if (!adapter) return cb && cb( { status: "failed", message: "missing adapter: "+store });

	// resolve adapter action fn()
	var fn = adapter[action]
	if (!fn) {
		return cb && cb( { status: "error", message: "unsupported method:"+action } );
	}

    // delegate to the adapter && send JSON result to client
    return fn(crud, cmd, cb)

}

self.teardown = function(options) {
	console.log("\tclean-up: "+options.package)
	_.each(self._db, function(db) {

	})
}