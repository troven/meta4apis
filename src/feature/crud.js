var self = module.exports

// =============================================================================
// framework packages

var express    = require('express');        // call express
var assert     = require('assert');         // assertions
var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var debug      = require("../debug")("feature:crud");

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

	var app = meta4.app, config = meta4.config
    var router = express.Router();

    // configure CRUD
    feature = _.extend({
        path: "/models",
        requires: "./feature/crud",
        home: config.home+"/models/meta",
        data: config.home+"/models/data",
    }, feature);


    app.use(config.basePath, router)

    // =============================================================================

	// prevent multiple init calls
	if (self.models) {
		debug("Skip re-init CRUD")
		return
	}
	self.models = helper.mvc.reload.models(feature.home, feature)

    feature.can = _.extend({ download: true, upload: true }, feature.can);

    self.options = feature // TODO: deprecate? -- too much state?

    if (feature.can.upload) {
        // merge local and global upload configuration
        var feature_upload = _.extend( {}, require('../features').get('upload'), feature.upload )

        var path = feature.path+'/:collection/_upload_'
        debug("upload: %s %j", path, feature.can )
        router.use(path, upload.uploader( feature_upload, meta4) )

        if (feature.can.download) {
            // TODO
        }
    }

    // ensure CRUD permissions - feature permissions take precedence
    var modelDefaults = function(model) {
        model.can = _.extend({create: true, read: true, update: true, delete: true}, model.can, feature.can);
    }

    _.each(self.models, modelDefaults)

	self.install(feature, function(err) {
		debug("CRUD installed", err)
	})

    if (feature.can.install) {
        router.post(feature.path+'/install', function(req, res, next) {
            self.install(feature, function() {
                res.json()
            })
        });
    }

    router.get(feature.path+'/about', function(req, res, next) {
        var models = [];
        _.each(self.models, function(_model) {
            // selective pick meta-data
            var model = _.pick(_model, "id", "label", "comment", "idAttribute", "collection", "schema", "defaults", "can" )
            models.push(model);
        })
        var meta = _.pick(feature, ["id", "path"]);

        res.json({ data: models, meta: meta } );
    });

    router.use(feature.path+'/:collection/:id?', function(req, res, next) {

        var id = req.params.id
        // kludge to prevent match on duplicate routes
        if (id == "_upload_") return next()

        var action = HTTP_TO_CRUD[req.method]
        var collection = req.params.collection

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

        debug("GET: %j -> %j", req.query, req.body)
        // unified command meta-data by merging Form fields (POST) & query params (GET)
        var cmd = _.extend({}, req.query, req.body);

        // Instantiate dynamic CRUD
        var CRUD = self.CRUD(crud);

        // unknown action / unknown query
        if (!CRUD[action]) {
            res.send(404);
            return;
        }

        if (id) cmd.id = id;
        cmd.collection = collection;
        cmd.action = action;

        var renderResult = function (result) {

            debug("result %s %j -> (%s rows)", feature.path, cmd, result.data.length)

            // vent our intentions
            meta4.vents.emit(feature.id, req.user || false, cmd, result.data || false);
            meta4.vents.emit(feature.id + ":" + collection + ":" + action, req.user || false, cmd, result.data || false);

            // send results
            result["@src"] = req.baseUrl;
            res.json(result);
        };

        // execute
        CRUD[action](cmd, renderResult);
    });
}

self.get = function(collection) {
    var crud = self.models[collection]
    // Instantiate dynamic CRUD
    return self.CRUD(crud);
}


self.execute = function(action,  collection, options, cb) {
    if (!_.isString(action)) throw new Error("Action is valid: "+action)
    if (!_.isString(collection)) throw new Error("Collection is valid: "+action)

    var cmd = _.extend({ "@action": action, "@CLASS": collection }, options);

    // Instantiate dynamic CRUD
    var crud = self.models[ cmd['@CLASS'] ]
    var CRUD = self.CRUD(crud);

    // options is optional, it may be our callback
    return CRUD[cmd['@action']](cmd, _.isFunction(options)?options:cb );
}

self.install = function(feature, cb) {
	_.each(self.models, function(crud, id) {
		var CRUD = self.CRUD(crud);
		if (!CRUD || !CRUD.install) {
			return;
		};
		CRUD.install(crud, cb);
        crud.id = crud.id || id

        // ensure we have a namespace for each model
        self[crud.id] = _.extend({}, self[crud.id])
//        self[crud.id] = _.extend({}, self[crud.id])
	})
}
// =============================================================================
// A factory method turn a crud-model definition into an adapter-specific CRUD Object
// returns a switch-back / closures for create, read, update, delete, exists, finds, query
// plus injects closures for each named-query
// each closure has the same signature: fn(model,callback)

self.CRUD = function(crud, user) {

	// default CRUD meta-data
	crud = _.extend({ idAttribute: ID_ATTRIBUTE, adapter: {}, schema: {}, defaults: {}, filters: {} }, crud )

	if (!crud.isServer && !crud.isRemote) {
		throw new Error( "model ["+crud.id+"] is client-only" );
	}

	// resolve database-specific adapter implementation
	// crud.store is legacy config
	var adapter = require( crud.requires || "./crud/adapter/"+(crud.store || crud.adapter.type) )

	// send error
	if (!adapter) throw new Error("missing adapter: "+requires);

	// Switchback encapsulates a raw Adapter
    // call before / after functions

	var CRUD = {
		install: function (config, cb) {
			return adapter.install ? adapter.install(crud, config, cb) : false;
		},
		create: function (model, cb) {
            model = self.before.create(model, crud, user);
			var done = adapter.create ? adapter.create(crud, model, cb) : {}
            //return self.after.create(, crud, user);
            return done;
		},
		read  : function (model, cb) {
            model = self.before.read(model, crud, user);
			var done = adapter.read ? adapter.read(crud, model, cb) : []
            //return self.after.read(    , crud, user);
            return done;
		},
		update: function (model, cb) {
            model = self.before.update(model, crud, user);
            done = adapter.update ? adapter.update(crud, model, cb) : {}
//            done = self.after.update(model, crud, user);
            return done;
		},
		delete: function (model, cb) {
            model = self.before.delete(model, crud, user);
			var done = adapter.delete ? adapter.delete(crud, model, cb) : {};
            return done;
		},
		find  : function (model, cb) {
            model = self.before.find(model, crud, user);
debug("Find: %j %j", model, crud, _.keys(adapter) )
            var found = adapter.find ? adapter.find(crud, model, cb) : {};
//debug("Found: %s -> %j", crud.id, found)
//			self.after.find(found.data, crud, user);
            return found
        },
		exists: function (model, cb) {
            model = self.before.find(model, crud, user);
			self.after.find(adapter.exists ? (adapter.exists(crud, model, cb) ? true : {}) : false, crud, user);
            return model;
		},
		query : function (queryName, model, cb) {
            model = self.before.read(model, crud, user);
			return self.after.read(adapter.query ? adapter.query(crud, queryName, model, cb) : [], crud, user);
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

self.before = {

	modified: function(model, crud, user) {
		var meta = model.meta4 = model.meta4 || {}
		var by = user?user.username:"meta4"
		var now = new Date().getTime()
		meta.modifiedOn = now
		meta.modifiedBy = by
		return meta
	},
	create: function(model, crud, user) {
		var meta = self.before.modified(model, crud, user)
		meta.createdBy = meta.modifiedBy
		meta.createdOn = meta.modifiedOn
		return model;
	},
	read: function(models, crud, user) {
		return models;
	},
	update: function(model, crud, user) {
		var meta = self.before.modified(model, crud, user)
		return model
	},
	delete: function(model, crud, user) {
		return model;
	},
	find: function(model) {
		return model
	}

}

self.after = {

    create: function(model, crud, user) {
        return model;
    },
    read: function(models, crud, user) {
        return self.after.passwords(models, crud, user);
    },
    update: function(model, crud, user) {
        return model;
    },
    delete: function(model, crud, user) {
        return model;
    },
    passwords: function(result, crud, user) {
        _.each(result.data, function(model) { return self.after.find(model, crud, user) } );
        return result
    },
    find: function(result, crud, user) {
        var model = result.data
        if (model.password) delete model.password
        return result
    }

}
self.teardown = function(options) {
	debug("\tclean-up: "+options.package)
	_.each(self._db, function(db) {
        // NOP
	})
}