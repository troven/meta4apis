// =============================================================================
// Framework Packages

var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var debug      = require("../../../debug")("crud:orientdb");

// =============================================================================
// Feature Packages

var OrientDB = require('orientjs');

var self = module.exports;
self.idAttribute = "@rid";

// https://github.com/orientechnologies/orientjs

// =============================================================================
// acquire a Database

self.acquireDatabase = function(crud, cb) {
	assert (crud, "missing CRUD options");
	assert (crud.adapter, "missing CRUD adapter");
    assert (crud.adapter.type, "missing CRUD adapter.type");
    assert (cb, "missing CRUD callback");
    assert(crud.idAttribute, "Missing OrientDB idAttribute");

    var DEBUG = crud.debug;

    crud.collection = crud.collection || crud.collection || crud.id;
    assert(crud.collection, "Missing orientdb class");

    /*
        var server = self._db[crud.id]
        if (server) {
            var db = server.use(crud.adapter.database.name)
    DEBUG && debug("cachedDatabase", crud.id, crud.adapter.database.name )
            cb && cb(null, db)
            return
        }
    */
	// initialize database
    var adapter = _.extend({
        host: 'localhost',
        port: 2424,
        username: false,
        password: false,
        pool: { max: 100 },
        database: { name: false }
    }, crud.adapter );

    assert (adapter.database, "missing CRUD adapter.database");
    assert (adapter.database.name, "missing CRUD adapter.database.name ");

//    DEBUG && debug("Connect: %s -> %s @ %s:%s", crud.id, adapter.username, adapter.host, adapter.port);
    var server = OrientDB(adapter);

	var db = server.use(adapter.database);
    DEBUG && debug("#%s using (%s : %s) -> %s  -> %s @ %s:%s", db.sessionId, crud.adapter.type, adapter.database.name, crud.id, adapter.username, adapter.host, adapter.port);

    cb && cb(null, db);
    return db;
};

self.close = function(db) {
    debug("close: %s -> %s", db.name, db.sessionId);
    db.close();
};

// =============================================================================
// Create

self.create = function(crud, cmd, cb) {

    var DEBUG = crud.debug;
    var data = cmd.data;

	self.acquireDatabase(crud, function(err, db) {
		if (err) {
            self.close(db);
			cb && cb( err, { status: "failed", message: err })
			return false
		}


		db.insert().into(crud.collection).set(data).one().then(function(model) {
            DEBUG && debug("created:",crud.collection, model);
			// we're done
            self.close(db);
			cb && cb( null, { status: "success", data: model, meta: { schema: crud.schema, count: 1 } })
		});
	});
}

// =============================================================================
// Read / GET

self.read = function(crud, meta, cb) {

    var DEBUG = crud.debug;

	self.acquireDatabase(crud, function(err, db) {
		if (err) {
            self.close(db);
			cb && cb( null, { status: "failed", message: err })
			return false
		}

DEBUG && debug("read:",crud.collection)

		// TODO: implement 'meta' to instantiate a 'filter'
		db.class.get(crud.collection).then(function (oClass) {

            DEBUG && debug("found class: %s", crud.collection);

			oClass.list().then(function(models) {

                DEBUG && debug("read: %s x %s", models?models.length:-1 , crud.collection);

				// we're done
                self.close(db);
				cb && cb( null, { status: "success", data: models, meta: { filter: false, count: models.length } });
			})
		})
	})

}

// =============================================================================
// Update / PUT

self.update = function(crud, cmd, cb) {

    var DEBUG = crud.debug;
    var data = cmd.data;

	self.acquireDatabase(crud, function(err, db) {
		if (err) {
            debug("OOPS update: %s -> %j", err, cmd);
            self.close(db);
			cb && cb( err, { status: "failed", message: err })
			return false
		}
		var filter = {};

		var id = filter[crud.idAttribute] = data[crud.idAttribute];

DEBUG && debug("update (%s): %s -> %j", id, crud.collection, data);

        //db.update(id).set(data).where( filter ).scalar()
		db.update(id).set(data).one().then(function (total) {
            DEBUG && debug("updated: %s x %s -> %j -> %j", total, crud.collection, data);
            self.close(db);
			cb && cb( null, { status: "success", data: data, meta: { count: total } });
		}).catch(function() {
		    debug("ERROR: %j", arguments);
        })
	})

}

// =============================================================================
// Delete / DELETE

self.delete = function(crud, cmd, cb) {

    var DEBUG = crud.debug;
    var data = cmd.data;

	self.acquireDatabase(crud, function(err, db) {
		if (err) {
            self.close(db);
			cb && cb( err, { status: "failed", message: err })
			return false
		}
		var filter = {}
		filter[crud.idAttribute] = data[crud.idAttribute]

DEBUG && debug("delete:", crud.collection, data, filter)

		db.delete().from(crud.collection).where( filter ).limit(1).scalar().then(function (total) {
            self.close(db);
			cb && cb( null, { status: "success", data: data, meta: { filter: filter, count: total} });
		})
	})

}

// =============================================================================
// Find / GET

self.find = function(crud, cmd, cb) {

    var DEBUG = crud.debug;
    var data = cmd.data;

	self.acquireDatabase(crud, function(err, db) {
		if (err) {
            self.close(db);
			cb && cb( err, { status: "failed", message: err })
			return false
		}

		// TODO: implement 'meta' to instantiate a 'filter'
		var where = ""
		_.each(crud.filters.find, function(v,k) {
			where+= where?" AND ":""
			where+= k+"=:"+k

		})
		if (!where) where = crud.idAttribute+"=:"+crud.idAttribute;

		var query = "SELECT * FROM "+crud.collection+ " WHERE "+where
DEBUG && debug("find:",crud.collection, query, data)

		return db.query(query, {params: data }).then(function (results) {
DEBUG && debug("Found: %j %s %j",crud, where, results)
			var meta = { filter: data, count: results.length }
            self.close(db);
			cb && cb( null, { status: "success", data: results[0] || {} , meta: meta });
		})
	})

}

// =============================================================================
// Run SQL Query / GET

self.query = function(crud, queryName, data, cb) {
	assert (crud, "missing CRUD {{options}}")
	assert (queryName, "missing CRUD {{query}}")
	assert (data, "missing CRUD query {{meta|data}}")

    var DEBUG = crud.debug;

	self.acquireDatabase(crud, function(err, db) {

		if (err) {
			cb && cb( err, { status: "failed", message: err })
			self.close(db);
			return false
		}

		var query = crud.queries[queryName]
DEBUG && debug("query:",crud.collection, queryName, query, data)
		if (!query) {
			cb && cb( null, { status: "failed", message: "unknown query "+queryName});
			self.close(db);
			return
		}
		db.query(query, { params: data } ).then(function (results) {
			var meta = { filter: data, count: results.length }
			cb && cb( null, { status: "success", data: results, meta: meta });
			self.close(db);
		})
	})
}

// =============================================================================
// Create new classes and default models

self.install = function(crud, feature, cb) {
    assert(crud, "Missing CRUD");
    assert(crud.id, "Missing CRUD id");
    assert(crud.adapter, "Missing CRUD options");
    assert(feature, "Missing CRUD feature");
    assert(cb, "Missing CRUD callback");

    var DEBUG = crud.debug;

    self.acquireDatabase(crud, function (err, db) {

        if (err) {
            debug("Install Failed: %j -> %s", crud, err);
            self.close(db);
            cb && cb(err, {status: "failed", message: err});
            return false;
        }

        var classname = crud.collection;
        DEBUG && debug("Installing %s x %s @ %s (schema? %s)", _.keys(crud.defaults).length, classname, crud.adapter.type, crud.schema ? true : false);

        db.class.get(classname).then(function () {

            debug("existing class: %s", classname);
            self.close(db);
            cb && cb(null, {status: "success", collection: classname});

        }).catch(function () {

            debug("Creating class: %s -> %s (schema? %s)", classname, crud.adapter.type, crud.schema ? true : false);

            db.class.create(classname).then(function (myClass) {
                DEBUG && debug("Created class: %j", classname);

                _.each(crud.defaults, function (data) {
                    db.insert().into(classname).set(data).one();
                });

                DEBUG && debug("Imported %s x %s records", _.keys(crud.defaults).length, classname);

                self.close(db);
                cb && cb(null, {status: "success", collection: classname, data: crud.defaults });
            }).catch(function (err) {
                debug("Failed to create class: %s -> %j", classname, err);
                self.close(db);
            });
        });
    });
}
// =============================================================================
// Test connections

self.test = function(crud, feature, cb) {
    assert(crud, "Missing CRUD");
    assert(crud.id, "Missing CRUD id");
    assert(crud.adapter, "Missing CRUD options");
    assert(feature, "Missing CRUD feature");
    assert(cb, "Missing CRUD callback");

    var DEBUG = crud.debug;

    self.acquireDatabase(crud, function (err, db) {

        debug("Acquired test connect: %j -> %s", crud, err);
        if (err) {
            self.close(db);
            cb && cb(err, {status: "failed", message: err});
            return false;
        }

        var dbs = db.list().then( function(list) { debug("%s x databases: %j", list.length, list); });

    });
}

return self;
