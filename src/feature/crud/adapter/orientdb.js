// =============================================================================
// Framework Packages

var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var helper     = require('meta4helpers');   // files & mixins

// =============================================================================
// Feature Packages

var OrientDB = require('orientjs');

var DEBUG = false
exports._db = {}

// https://github.com/orientechnologies/orientjs

// =============================================================================
// acquire a Database

var acquireDatabase = function(crud, cb) {
	assert (crud, "OrientDb CRUD missing options")
	assert (crud.adapter, "OrientDb CRUD missing adapter")
	assert (crud.adapter.database, "OrientDb CRUD missing adapter database")
	assert (crud.adapter.database.name, "OrientDb CRUD missing database name ")
/*
	var server = exports._db[crud.id]
	if (server) {
		var db = server.use(crud.adapter.database.name)
DEBUG && console.log("cachedDatabase", crud.id, crud.adapter.database.name )
		cb && cb(null, db)
		return
	}
*/
	// initialize database
	exports.__server = exports.__server || OrientDB(_.extend({
		host: 'localhost',
		port: 2424,
		username: 'root',
		password: 'root',
		pool: { max: 10 }
	}, crud.adapter));

	var db = exports.__server.use(crud.adapter.database.name)

//DEBUG && console.log("acquireDatabase", crud.id, crud.adapter.database.name)

	cb && cb(null, db)
    return db;

}

exports.install = function(crud, cb) {

	acquireDatabase(crud, function(err, db) {
		if (err) {
			exports.close(db);
			cb && cb( { status: "failed", message: err })
			return false
		}
		var classname = crud.collection || crud.id

DEBUG && console.log("[orientdb] install:", classname)

		db.class.get(classname).then(function() {

			exports.close(db);
DEBUG && console.log('Existing class: ', classname);

		}).catch(function () {

			db.class.create(classname).then(function (myClass) {
DEBUG && console.log('[orientdb] Created class: ', classname, myClass);
				cb && cb( { status: "success", class: myClass })
				exports.close(db);
			}).catch(function() {
DEBUG && console.log('[orientdb] Failed to create class: ', classname, arguments);
				exports.close(db);
			});
		});
	});
}

exports.close = function(db) {
	DEBUG && console.log("Close ODB:", db.name, db.sessionId);
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

		db.insert().into(crud.id).set(data).one().then(function(model) {
			// we're done
			cb && cb({ status: "success", data: model, meta: { schema: crud.schema, count: 1 } })
DEBUG && console.log("[orientdb] created:",crud.id, model)
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

DEBUG && console.log("[orientdb] read:",crud.id)

		// TODO: implement 'meta' to instantiate a 'filter'
		db.class.get(crud.id).then(function (oClass) {
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

DEBUG && console.log("[orientdb] update:", crud.id, data, filter)

		db.update(crud.id).set(data).where( filter ).scalar().then(function (total) {
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

DEBUG && console.log("[orientdb] delete:", crud.id, data, filter)

		db.delete().from(crud.id).where( filter ).limit(1).scalar().then(function (total) {
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
		_.each(crud.filter, function(v,k) {
			where+= where?" AND ":""
			where+= k+"=:"+k

		})
		if (!where) where = crud.idAttribute+"=:id"

		var query = "SELECT * FROM "+crud.id+ " WHERE "+where
DEBUG && console.log("[orientdb] find:",crud.id, query, data)

		return db.query(query, {params: data }).then(function (results) {
			DEBUG && console.log("Found: ",where, results)
			var meta = { filter: data, count: results.length }
			cb && cb( { status: "success", data: results[0], meta: meta });
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
DEBUG && console.log("[orientdb] query:",crud.id, queryName, query, data)
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
