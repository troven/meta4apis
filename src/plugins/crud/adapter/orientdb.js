// =============================================================================
// Framework Packages

var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var debug      = require("../../../debug")("crud:orientdb");

// =============================================================================
// Feature Packages

var OrientDB = require('orientjs');

exports._db = {}

// https://github.com/orientechnologies/orientjs

// =============================================================================
// acquire a Database

var acquireDatabase = function(crud, cb) {
	assert (crud, "missing CRUD options");
	assert (crud.adapter, "missing CRUD adapter");
    assert (crud.adapter.type, "missing CRUD adapter.type");
    assert (cb, "missing CRUD callback");

    var DEBUG = crud.debug;

    crud.class = crud.class || crud.collection || crud.id;
    assert(crud.class, "Missing orientdb class");

    /*
        var server = exports._db[crud.id]
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
        pool: { max: 20 },
        database: { name: false }
    }, crud.adapter );

    assert (adapter.database, "missing CRUD adapter.database");
    assert (adapter.database.name, "missing CRUD adapter.database.name ");

//    DEBUG && debug("Connect: %s -> %s @ %s:%s", crud.id, adapter.username, adapter.host, adapter.port);
	exports.__server = exports.__server || OrientDB(adapter);

	var db = exports.__server.use(adapter.database.name);

DEBUG && debug("Connected (%s : %s) -> %s  -> %s @ %s:%s", crud.adapter.type, adapter.database.name, crud.id, adapter.username, adapter.host, adapter.port);

	cb && cb(null, db);
    return db;

}

exports.install = function(crud, feature, cb) {
    assert(crud, "Missing CRUD");
    assert(crud.id, "Missing CRUD id");
    assert(crud.adapter, "Missing CRUD options");
    assert(feature, "Missing CRUD feature");
    assert(cb, "Missing CRUD callback");

    var DEBUG = crud.debug;

    acquireDatabase(crud, function(err, db) {

        if (err) {
            debug("Install Failed: %j -> %s", crud, err);
			exports.close(db);
			cb && cb( err, { status: "failed", message: err });
			return false;
		}

        var classname = crud.class;

        DEBUG && debug("Installing %s x %s @ %s (schema? %s)", _.keys(crud.defaults).length, classname, crud.adapter.type, crud.schema?true:false );

		db.class.get(classname).then(function() {

            debug("existing class: %s", classname);

			exports.close(db);
            cb && cb( null, { status: "success", class: myClass });

		}).catch(function () {

            DEBUG && debug("Creating class: %s -> %s (schema? %s)", classname, crud.adapter.type,crud.schema?true:false );

			db.class.create(classname).then(function (myClass) {
DEBUG && debug('Created class: ', classname, myClass);

                _.each(crud.defaults, function(data) {
                    db.insert().into(myClass).set(data).one();
                });

                DEBUG && debug('Imported %s x %s records', _.keys(crud.defaults).length, classname);

				exports.close(db);
                cb && cb( null, { status: "success", class: myClass })
			}).catch(function(err) {
                debug('Failed to create class: %s -> %j', classname, err);
				exports.close(db);
			});
		});
	});
}

exports.close = function(db) {
//	DEBUG && debug("Close ODB: %s -> %s", db.name, db.sessionId);
    db.close();
}

// =============================================================================
// Create

exports.create = function(crud, data, cb) {

    var DEBUG = crud.debug;

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( err, { status: "failed", message: err })
			exports.close(db);
			return false
		}


		db.insert().into(crud.class).set(data).one().then(function(model) {
			// we're done
			cb && cb( null, { status: "success", data: model, meta: { schema: crud.schema, count: 1 } })
DEBUG && debug("created:",crud.class, model)
			exports.close(db);
		});
	});
}

// =============================================================================
// Read / GET

exports.read = function(crud, meta, cb) {

    var DEBUG = crud.debug;

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( null, { status: "failed", message: err })
			exports.close(db);
			return false
		}

DEBUG && debug("read:",crud.class)

		// TODO: implement 'meta' to instantiate a 'filter'
		db.class.get(crud.class).then(function (oClass) {

            DEBUG && debug("found class: %s", crud.class);

			oClass.list().then(function(models) {

                DEBUG && debug("read: %s x %s", models?models.length:-1 , crud.class);

				// we're done
				cb && cb( null, { status: "success", data: models, meta: { filter: false, count: models.length } });
				exports.close(db);
			})
		})
	})

}

// =============================================================================
// Update / PUT

exports.update = function(crud, data, cb) {

    var DEBUG = crud.debug;

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( err, { status: "failed", message: err })
			exports.close(db);
			return false
		}
		var filter = {}
		filter[crud.idAttribute] = data[crud.idAttribute]

DEBUG && debug("update:", crud.class, data, filter)

		db.update(crud.class).set(data).where( filter ).scalar().then(function (total) {
			cb && cb( null, { status: "success", data: data, meta: { filter: filter, count: total } });
			exports.close(db);
		})
	})

}

// =============================================================================
// Delete / DELETE

exports.delete = function(crud, data, cb) {

    var DEBUG = crud.debug;

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( err, { status: "failed", message: err })
			exports.close(db);
			return false
		}
		var filter = {}
		filter[crud.idAttribute] = data[crud.idAttribute]

DEBUG && debug("delete:", crud.class, data, filter)

		db.delete().from(crud.class).where( filter ).limit(1).scalar().then(function (total) {
			cb && cb( null, { status: "success", data: data, meta: { filter: filter, count: total} });
			exports.close(db);
		})
	})

}

// =============================================================================
// Find / GET

exports.find = function(crud, data, cb) {

    var DEBUG = crud.debug;

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( err, { status: "failed", message: err })
			exports.close(db);
			return false
		}

		// TODO: implement 'meta' to instantiate a 'filter'
		var where = ""
		_.each(crud.filters.find, function(v,k) {
			where+= where?" AND ":""
			where+= k+"=:"+k

		})
		if (!where) where = crud.idAttribute+"=:"+crud.idAttribute;

		var query = "SELECT * FROM "+crud.class+ " WHERE "+where
DEBUG && debug("find:",crud.class, query, data)

		return db.query(query, {params: data }).then(function (results) {
DEBUG && debug("Found: %j %s %j",crud, where, results)
			var meta = { filter: data, count: results.length }
			cb && cb( null, { status: "success", data: results[0] || {} , meta: meta });
			exports.close(db);
		})
	})

}
// =============================================================================
// Run SQL Query / GET

exports.query = function(crud, queryName, data, cb) {
	assert (crud, "missing CRUD {{options}}")
	assert (queryName, "missing CRUD {{query}}")
	assert (data, "missing CRUD query {{meta|data}}")

    var DEBUG = crud.debug;

	acquireDatabase(crud, function(err, db) {

		if (err) {
			cb && cb( err, { status: "failed", message: err })
			exports.close(db);
			return false
		}

		var query = crud.queries[queryName]
DEBUG && debug("query:",crud.class, queryName, query, data)
		if (!query) {
			cb && cb( null, { status: "failed", message: "unknown query "+queryName});
			exports.close(db);
			return
		}
		db.query(query, { params: data } ).then(function (results) {
			var meta = { filter: data, count: results.length }
			cb && cb( null, { status: "success", data: results, meta: meta });
			exports.close(db);
		})
	})

}
