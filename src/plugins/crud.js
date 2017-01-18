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

var helper     = require('meta4common');   // files & mixins
var upload      = require('./upload');        // uploads & attachments

var ID_ATTRIBUTE    = "id"
var HTTP_TO_CRUD = { "POST": "create", "GET": "read", "PUT": "update", "DELETE": "delete"}

// =============================================================================
// Configure CRUD Feature

self.install = function(feature, cb) {
    assert(feature, "Missing feature");
    assert(cb, "Missing install callback");


    _.each(self.models, function(crud, id) {

        crud = _.extend({ adapter: { type: "default" }, schema: {}, defaults: {}, filters: {} }, crud );
        crud.id = crud.id || id;
        var DEBUG = crud.debug || feature.debug;

        var adapter = self.options.adapters[crud.adapter.type];
        assert(adapter, "Missing ("+crud.adapter.type+") Adapter: "+id);

        crud.adapter = _.extend(crud.adapter, adapter);
        assert(crud.adapter, "Missing CRUD adapter for: "+crud.adapter.type);

        var CRUD = self.CRUD(crud, feature);
        assert(CRUD, "Missing CRUD: "+crud);
        assert(CRUD.install, "Missing CRUD install: "+crud);

        CRUD.test(crud, feature, function(err, data) {
            debug("Tested: %s -> %j", err, data);
        })

        // ensure we have a namespace for each model
        assert(!self[crud.id], "CRUD namespace already exists: "+crud.id);
        self[crud.id] = _.extend({}, self[crud.id]);

        if (CRUD.install) {
            DEBUG && debug("installing %s", crud.id);
            CRUD.install(crud, cb);
        } else {
            DEBUG && debug("collection: %s", crud.id);
            cb && cb(crud, feature);
        }

    })
}

self.fn = function(meta4, feature) {

    // Sanity Checks
    assert(meta4,       "feature missing {{meta4}}")
    assert(meta4.router,"feature missing {{meta4.router}}")
    assert(meta4.config,"feature missing {{meta4.config}}")
    assert(meta4.vents, "feature missing {{meta4.vents}}")

    assert(feature, "{{crud}} feature not configured");

    feature.adapters = feature.adapters || { "default": { type: "loki" }};
    assert(feature.adapters, "{{crud}} adapters not configured");

    // =============================================================================

    var config = meta4.config, router = meta4.router;
    assert(config.home, "Missing config home");

    // configure CRUD
    feature = _.extend({
        path: "models",
        home: config.home+"/models",
        data: config.home+"/data",
    }, feature);


    // app.use(config.basePath, router)
    debug("CRUD @ %s -> %s", config.basePath, feature.path);

    // =============================================================================

    // prevent multiple init calls
    if (self.models) {
        debug("Skip re-init CRUD");
        return;
    }

    self.models = helper.mvc.reload.models(feature.home, feature);

    feature.can = _.extend({ download: true, upload: true }, feature.can);

    self.options = _.extend({ adapters: { default: {} }}, feature );
    self.options.adapters = _.extend({ default: {} }, self.options.adapters );

    debug("adapters: %j", _.keys(self.options.adapters));

    if (feature.can.upload) {
        // merge local and global upload configuration
        var feature_upload = _.extend( {}, require('../features').get('upload'), feature.upload );

        var path = feature.path+'/:collection/_upload_'
        debug("upload: %s %j", path, feature.can );
        router.use(path, upload.uploader( feature_upload, meta4) );

        if (feature.can.download) {
            // TODO
        }
    }

    // ensure CRUD permissions - feature permissions take precedence
    var modelDefaults = function(model) {
        model.can = _.extend({create: true, read: true, update: true, delete: true}, model.can, feature.can);
    }

    _.each(self.models, modelDefaults);

    self.install(feature, function() {} );

    if (feature.can.install) {
        router.post(feature.path+'/install', function(req, res, next) {
            self.install(feature, function() {
                res.json();
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
        debug("ABOUT: %j -> %j", req.query, meta);

        res.json({ data: models, meta: meta } );
    });

    router.use(feature.path+'/:collection/:id?', function(req, res, next) {

        var id = req.params.id
        // kludge to prevent match on duplicate routes
        if (id == "_upload_") return next();

        var collection = req.params.collection;
        if (!self.models[collection]) {
            next();
            return;
        }

        // prepare command
        var cmd = _.extend({
            action: HTTP_TO_CRUD[req.method],
            collection: collection, id: id,
            options: {
                home: feature.home || config.data
            },
            query: req.query,
            data: req.body
        });

        var renderResult = function (err, result) {
            assert(!err, "CRUD: "+err);
            debug("%s x results for %s %s", result.data.length, cmd.action, cmd.collection);
            res.json(result);
        };

        // execute action and return response
        try {
            debug("execute: %j -> %j -> %j", cmd.action, req.method, id);
            self.execute(cmd, feature, renderResult);
        } catch(e) {
            debug(e);
            res.status(500).send(e);
        }
    });
}

self.get = function(collection, feature) {
    var crud = self.models[collection];
    // Instantiate dynamic CRUD
    return self.CRUD(crud, feature || {} );
}


self.execute = function(cmd, feature, cb) {
    assert(cmd, "Missing CRUD command");
    assert(cmd.action, "Missing CRUD action");
    assert(cmd.collection, "Missing CRUD collection");
    assert(feature, "Missing CRUD feature");
    assert(cb, "Missing callback");
    assert(_.isFunction(cb), "Invalid callback");

// resolve CRUD configuration
    var crud = _.extend({ queries: {} }, cmd.options, self.models[cmd.collection]);
// unified command meta-data by merging Form fields (POST) & query params (GET)

    feature.debug && debug("CRUD: %j", crud);

    assert( (cmd.collection == crud.id), "Mismatched collection: "+crud.id+" for "+cmd.collection);
    cmd.query = _.extend({}, cmd.query, crud.queries[cmd.id]);

// acquire CRUD adapter (switchback)
    var CRUD = self.CRUD(crud, feature);

// find action in CRUD switchback
    var action = CRUD[cmd.action];
    if (!action) throw new Error("meta4:crud:action:missing#"+cmd.action);
    assert(_.isFunction(action), "meta4:crud:action:invalid#"+cmd.action);

    // execute action and return response
    action(cmd, cb);

}
// =============================================================================
// A factory method turn a crud-model definition into an adapter-specific CRUD Object
// returns a switch-back / closures for create, read, update, delete, exists, finds, query
// plus injects closures for each named-query
// each closure has the same signature: fn(model,callback)

self.CRUD = function(crud, feature, user) {
//    assert(meta4, "Missing meta4");
    assert(crud, "Missing CRUD config");
    assert(feature, "Missing CRUD feature");
    feature.adapters = feature.adapters || {};

    // default CRUD meta-data
    crud = _.extend({ adapter: { type: "default" }, schema: {}, defaults: {}, filters: {}, queries: {} }, crud, crud.server );
    user = user || {};
    var DEBUG = feature.debug || crud.debug || false;

    delete crud.client;
    delete crud.server;

    var isServer = (crud.isServer || crud.server || crud.adapter)?true:false;
    var isClient = (crud.isClient || crud.client)?true:false;

    assert( isServer, "CRUD model ["+crud.id+"] is client only" );

    assert(crud.adapter, "Missing CRUD adapter");
    var adapterType = crud.adapter.type;

    assert(adapterType, "Missing CRUD adapter.type");

    // resolve database-specific adapter implementation
    // crud.store is legacy config
    var adapter = require( "./crud/adapter/"+adapterType );
    assert(adapter,"missing adapter: "+crud.requires);

    // features over-ride model defaults
    crud.adapter = _.extend( crud.adapter, feature.adapters[adapterType]);
    crud.idAttribute = crud.idAttribute || adapter.idAttribute;

    // assign the idAttribute used by Adapter

    // assert(adapter.idAttribute, "Missing "+adapterType+" default idAttribute");
    // assert(crud.idAttribute && (adapter.idAttribute == crud.idAttribute), "Mimatched "+crud.id+" idAttribute: "+crud.idAttribute+" not "+adapter.idAttribute);


    // Switchback encapsulates a raw Adapter
    // call before / after functions

    var CRUD = {
        test: function (config, cb) {
            return adapter.selftest ? adapter.selftest(crud, feature, cb) : false;
        },
        install: function (config, cb) {
            return adapter.install ? adapter.install(crud, feature, cb) : false;
        },
        create: function (model, cb) {
            model = self.before.create(model, crud, user);
            DEBUG && debug("create (%s): %s -> %j", adapter.create?true:false, crud.collection, model );
            var done = adapter.create ? adapter.create(crud, model, cb) : {}
            //return self.after.create(done, crud, user);
            return done;
        },
        read  : function (cmd, cb) {
            model = self.before.read(cmd, crud, user);
            DEBUG && debug("read: %s @ %j", crud.id, crud.adapter.type);
            var done = adapter.read ? adapter.read(crud, cmd, cb) : []
            //return self.after.read(done, crud, user);
            return done;
        },
        update: function (model, cb) {
            DEBUG && debug("update: %s -> %j", crud.collection, model);
            model = self.before.update(model, crud, user);
            done = adapter.update ? adapter.update(crud, model, cb) : {}
//            done = self.after.update(done, crud, user);
            return done;
        },
        delete: function (model, cb) {
            model = self.before.delete(model, crud, user);
            var done = adapter.delete ? adapter.delete(crud, model, cb) : {};
            return done;
        },
        find  : function (model, cb) {
            model = self.before.find(model, crud, user);
            DEBUG && debug("Find: %j %j", model, crud, _.keys(adapter) )
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

    return CRUD;
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

return self;