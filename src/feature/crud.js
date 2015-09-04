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
	self.options = feature // TODO: deprecate? -- too much state?

	// merge local and global upload configuration
    var feature_upload = _.extend( {}, require('../features').get('upload'), feature.upload )

    if (!feature_upload.disabled) {
        router.use(feature.path+'/:collection/_upload_', upload.uploader( feature_upload, meta4) )
    }

	self.install(feature, function(err) {
		console.log("CRUD installed", err)
	})

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
	    if (id && crud.queries && crud.queries[id]) {
		    action = id;
	    }

	    // Instantiate dynamic CRUD
	    var CRUD = self.CRUD(crud);

	    // unknown action / unknown query
	    if (!CRUD[action]) {
		    res.send(404);
		    return;
	    }

	    // hedge our bets - merge form fields (POST) & query params (GET)
	    var cmd = _.extend({}, req.query, req.body );

	    // execute
		CRUD[action](cmd, function(result) {

			cmd.id = id;
			cmd.collection = collection;

            console.log("CRUD %s %s -> %s @ %s", feature.id, action, id, collection)

			// vent our intentions
			meta4.vents.emit(feature.id, req.user||false, cmd, result.data||false);
			meta4.vents.emit(feature.id+":"+collection+":"+action, req.user||false, cmd, result.data||false);

			// send results
			result["@src"] = req.baseUrl;
			res.json(result);
		})

    });
}

self.get = function(collection) {
    var crud = self.models[collection]
    // Instantiate dynamic CRUD
    return self.CRUD(crud);
}


self.install = function(feature, cb) {
	_.each(self.models, function(crud, id) {
		var CRUD = self.CRUD(crud);
		if (!CRUD || !CRUD.install) {
			return;
		};
		CRUD.install(crud, cb);
	})
}
// =============================================================================
// A factory method turn a crud-model definition into an adapter-specific CRUD Object
// returns a switch-back / closures for create, read, update, delete, exists, finds, query
// plus injects closures for each named-query
// each closure has the same signature: fn(model,callback)

self.CRUD = function(crud, user) {

	// default CRUD meta-data
	crud = _.extend({ idAttribute: ID_ATTRIBUTE, adapter: {}, schema: {}, defaults: {} }, crud )

	if (!crud.isServer && !crud.isRemote) {
		throw new Error( "model ["+crud.id+"] is client-only" );
	}

	// resolve database-specific adapter implementation
	var adapter = require( crud.requires || "./crud/adapter/"+(crud.store || crud.adapter.type) )

	// send error
	if (!adapter) throw new Error("[meta4crud] missing adapter: "+requires);

	// Switchback encapsulates a raw Adapter
	var CRUD = {
		install: function (config, cb) {
			return adapter.install ? adapter.install(crud, config, cb) : false;
		},
		create: function (model, cb) {
			self.meta.create(model, crud, user);
			return adapter.create ? adapter.create(crud, model, cb) : false;
		},
		read  : function (model, cb) {
			self.meta.read(model, crud, user);
			return adapter.read ? adapter.read(crud, model, cb) : false;
		},
		update: function (model, cb) {
			self.meta.update(model, crud, user);
			return adapter.update ? adapter.update(crud, model, cb) : false;
		},
		delete: function (model, cb) {
			self.meta.delete(model, crud, user);
			return adapter.delete ? adapter.delete(crud, model, cb) : false;
		},
		find  : function (model, cb) {
			self.meta.find(model, crud, user);
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

self.meta = {

	modified: function(model, crud, user) {
		var meta = model.meta4 = model.meta4 || {}
		var by = user?user.username:"meta4"
		var now = new Date().getTime()
		meta.modifiedOn = now
		meta.modifiedBy = by
		return meta
	},
	create: function(model, crud, user) {
		var meta = self.meta.modified(model, crud, user)
		meta.createdBy = meta.modifiedBy
		meta.createdOn = meta.modifiedOn
		return model;
	},
	read: function(models, crud, user) {
		return models;
	},
	update: function(model, crud, user) {
		var meta = self.meta.modified(model, crud, user)
		return model;
	},
	delete: function(model, crud, user) {
		return model;
	},
	passwords: function(models, crud, user) {
		_.each(models, function(model) {
			if (model.password) delete model.password
		})
		return models
	},
	find: function(model) {
		if (model.password) delete model.password
		return model
	}

}
self.teardown = function(options) {
	console.log("\tclean-up: "+options.package)
	_.each(self._db, function(db) {

	})
}