var self = module.exports

// =============================================================================
// framework packages

var assert     = require('assert');         // assertions
var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

var helper     = require('meta4helpers');   // files & mixins
var upload      = require('./upload');        // uploads & attachments

var ID_ATTRIBUTE    = "id"
var HTTP_TO_CRUD = { "POST": "create", "GET": "read", "PUT": "update", "DELETE": "delete"}

// =============================================================================
// Configure CRUD Feature

self.feature = function(meta4, feature) {

	// Sanity Checks
	assert(meta4,       "feature missing {{meta4}}")
	assert(meta4.router,"feature missing {{meta4.router}}")
	assert(meta4.config,"feature missing {{meta4.config}}")
	assert(meta4.vents, "feature missing {{meta4.vents}}")

    assert(feature, "{{crud}} feature not configured")

	// =============================================================================

	var router = meta4.router, config = meta4.config

    // =============================================================================

	// prevent multiple init calls
	if (self.models) {
		console.log("Skip re-init CRUD")
		return
	}
	self.models = helper.mvc.reload.models(feature.home, feature)
	self.options = feature

	// dynamically route model / CRUD requests

    router.use(feature.path+'/:collection/_upload_', upload.uploader( feature.upload || meta4.config.features.upload ))

    router.use(feature.path+'/:collection/:id?', function(req, res, next) {

		var collection = req.params.collection
		var id = req.params.id
		var action = HTTP_TO_CRUD[req.method]

		// kludge to prevent match on duplicate routes
		if (id == "_upload_" ) return next()

	    // resolve CRUD configuration
	    var crud = self.models[collection]
	    if (!crud) {
		    next();
		    return;
	    }

	    // dynamic query support
	    if (id && crud.queries[id]) {
		    action = id
	    }

	    // Instantiate dynamic CRUD
	    var CRUD = self.CRUD(crud)

	    // unknown action / unknown query
	    if (!CRUD[action]) {
		    res.send(404);
		    return;
	    }

	    // hedge our bets
	    var cmd = _.extend({}, req.query, req.body )

	    // execute
		CRUD[action](cmd, function(result) {

			// vent our intentions
			meta4.vents.emit(feature.id, action, req.user||false, cmd, result.data||false);
			meta4.vents.emit(feature.id+":"+action, req.user||false, cmd, result.data||false);

			// send results
			result["@src"] = req.baseUrl
			res.json(result)
		})

    });
}

// =============================================================================
// A factory method turn a crud-model definition into an adapter-specific CRUD Object
// returns a switch-back / closures for create, read, update, delete, exists, finds, query
// plus injects closures for each named-query
// each closure has the same signature: fn(model,callback)

self.CRUD = function(crud) {

	// default CRUD meta-data
	crud = _.extend({ idAttribute: ID_ATTRIBUTE, adapter: {}, schema: {}, defaults: {} }, crud )

	if (!crud.isServer && !crud.isRemote) {
		throw new Error( "model ["+collection+"] is client-only" );
	}

	// resolve database-specific adapter implementation
	var adapter = require( crud.requires || "./crud/adapter/"+(crud.store || crud.adapter.type) )

	// send error
	if (!adapter) throw new Error("[meta4crud] missing adapter: "+requires);

	// Switchback encapsulates a raw Adapter
	var CRUD = {
		create: function (model, cb) {
			return adapter.create ? adapter.create(crud, model, cb) : false;
		},
		read  : function (model, cb) {
			return adapter.read ? adapter.read(crud, model, cb) : false;
		},
		update: function (model, cb) {
			return adapter.update ? adapter.update(crud, model, cb) : false;
		},
		delete: function (model, cb) {
			return adapter.delete ? adapter.delete(crud, model, cb) : false;
		},
		find  : function (model, cb) {
			return adapter.find ? adapter.find(crud, model, cb) : false;
		},
		exists: function (model, cb) {
			return adapter.exists ? (adapter.exists(crud, model, cb) ? true : false) : false;
		},
		query : function (queryName, model, cb) {
			return adapter.query ? adapter.query(crud, queryName, model, cb) : false;
		}
	}

	// inject closures for each named-query
	if (adapter.query && crud.queries) {
		_.each(crud.queries, function(query, key) {
			CRUD[key] = function(model, cb) {
				adapter.query(crud, key, model, cb);
			}
		})
	}
	return CRUD
}

self.teardown = function(options) {
	console.log("\tclean-up: "+options.package)
	_.each(self._db, function(db) {

	})
}