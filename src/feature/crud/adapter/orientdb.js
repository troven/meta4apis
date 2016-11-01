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
	assert (crud, "OrientDb CRUD missing options");
	assert (crud.adapter, "OrientDb CRUD missing adapter");
    assert (crud.adapter.type, "OrientDb CRUD missing adapter.type");

    crud.class = crud.class || crud.collection || crud.id;
    assert(crud.class, "Missing ODB class");

    /*
        var server = exports._db[crud.id]
        if (server) {
            var db = server.use(crud.adapter.database.name)
    debug("cachedDatabase", crud.id, crud.adapter.database.name )
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
        pool: { max: 10 },
        database: { name: false }
    }, crud.adapter );

    assert (adapter.database, "OrientDb CRUD missing options.database");
    assert (adapter.database.name, "OrientDb CRUD missing options.database.name ");

//    debug("Connect: %s -> %s @ %s:%s", crud.id, adapter.username, adapter.host, adapter.port);
	exports.__server = exports.__server || OrientDB(adapter);

	var db = exports.__server.use(crud.adapter.database.name);

debug("Database (%s : %s) connected: %s  -> %s @ %s:%s", crud.adapter.type, crud.adapter.database.name, crud.id, adapter.username, adapter.host, adapter.port);

	cb && cb(null, db);
    return db;

}

exports.install = function(crud, cb) {
    assert(crud, "Missing CRUD");
    assert(crud.id, "Missing CRUD id");
    assert(crud.adapter, "Missing CRUD options");

    acquireDatabase(crud, function(err, db) {

        if (err) {
            debug("Install Failed: %j -> %s", crud, err);
			exports.close(db);
			cb && cb( { status: "failed", message: err })
			return false;
		}

        var classname = crud.class;
//        debug("Creating Class: %s -> %s (schema: %s)", classname, crud.adapter.type,crud.schema?true:false );

		db.class.get(classname).then(function() {

            debug('class: ', classname);
			exports.close(db);

		}).catch(function () {

			db.class.create(classname).then(function (myClass) {
debug('Created class: ', classname, myClass);
				exports.close(db);
                cb && cb( { status: "success", class: myClass })
			}).catch(function(err) {
debug('Failed to create class: %s -> %j', classname, err);
				exports.close(db);
			});
		});
	});
}

exports.close = function(db) {
//	debug("Close ODB: %s -> %s", db.name, db.sessionId);
    db.close();
}

// =============================================================================
// Create

exports.create = function(crud, data, cb) {

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			exports.close(db);
			return false
		}


		db.insert().into(crud.class).set(data).one().then(function(model) {
			// we're done
			cb && cb({ status: "success", data: model, meta: { schema: crud.schema, count: 1 } })
debug(" created:",crud.class, model)
			exports.close(db);
		});
	});
}

// =============================================================================
// Read / GET

exports.read = function(crud, meta, cb) {

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			exports.close(db);
			return false
		}

debug(" read:",crud.class)

		// TODO: implement 'meta' to instantiate a 'filter'
		db.class.get(crud.class).then(function (oClass) {
			oClass.list().then(function(models) {
				// we're done
				cb && cb( { status: "success", data: models, meta: { filter: false, count: models.length } });
				exports.close(db);
			})
		})
	})

}

// =============================================================================
// Update / PUT

exports.update = function(crud, data, cb) {

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			exports.close(db);
			return false
		}
		var filter = {}
		filter[crud.idAttribute] = data[crud.idAttribute]

debug(" update:", crud.class, data, filter)

		db.update(crud.class).set(data).where( filter ).scalar().then(function (total) {
			cb && cb( { status: "success", data: data, meta: { filter: filter, count: total } });
			exports.close(db);
		})
	})

}

// =============================================================================
// Delete / DELETE

exports.delete = function(crud, data, cb) {

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			exports.close(db);
			return false
		}
		var filter = {}
		filter[crud.idAttribute] = data[crud.idAttribute]

debug(" delete:", crud.class, data, filter)

		db.delete().from(crud.class).where( filter ).limit(1).scalar().then(function (total) {
			cb && cb( { status: "success", data: data, meta: { filter: filter, count: total} });
			exports.close(db);
		})
	})

}

// =============================================================================
// Find / GET

exports.find = function(crud, data, cb) {

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
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
debug(" find:",crud.class, query, data)

		return db.query(query, {params: data }).then(function (results) {
debug("Found: %j %s %j",crud, where, results)
			var meta = { filter: data, count: results.length }
			cb && cb( { status: "success", data: results[0] || {} , meta: meta });
			exports.close(db);
		})
	})

}
// =============================================================================
// Run SQL Query / GET

exports.query = function(crud, queryName, data, cb) {
	assert (crud, "orientdb CRUD missing {{options}}")
	assert (queryName, "orientdb CRUD missing {{query}}")
	assert (data, "orientdb CRUD missing query {{meta|data}}")

	acquireDatabase(crud, function(err, db) {

		if (err) {
			cb && cb( { status: "failed", message: err })
			exports.close(db);
			return false
		}

		var query = crud.queries[queryName]
debug("query:",crud.class, queryName, query, data)
		if (!query) {
			cb && cb( { status: "failed", message: "unknown query "+queryName});
			exports.close(db);
			return
		}
		db.query(query, { params: data } ).then(function (results) {
			var meta = { filter: data, count: results.length }
			cb && cb( { status: "success", data: results, meta: meta });
			exports.close(db);
		})
	})

}
