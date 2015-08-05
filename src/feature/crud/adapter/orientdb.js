// =============================================================================
// Framework Packages

var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var helper     = require('meta4helpers');   // files & mixins

// =============================================================================
// Feature Packages

var OrientDB = require('orientjs');

var DEBUG = true
exports._db = {}

// =============================================================================
// acquire a Database

var acquireDatabase = function(crud, cb) {
	assert (crud, "orientdb CRUD missing options")
	assert (crud.adapter, "orientdb CRUD missing adapter")
	assert (crud.adapter.database, "orientdb CRUD missing adapter database")
	assert (crud.adapter.database.name, "orientdb CRUD missing database name ")

	var server = exports._db[crud.id]
	if (server) {
		var db = server.use(crud.adapter.database.name)
		console.log("cachedDatabase", crud.id, crud.adapter.database.name )
		cb && cb(null, db)
		return
	}

	// initialize database
	server = exports._db[crud.id] = OrientDB(_.extend({
		host: 'localhost',
		port: 2424,
		username: 'root',
		password: 'root'
	}, crud.adapter));

	var db = server.use(crud.adapter.database.name)
	console.log("acquireDatabase", crud.id, crud.adapter.database.name)

	cb && cb(null, db)

}

// =============================================================================
// Create

exports.create = function(crud, data, cb) {

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}

		DEBUG && console.log("[orientdb] create:",crud.id, data)

		db.insert().into(crud.id).set(data).then(function(model) {
			// we're done
			cb && cb({ status: "success", data: model, meta: { schema: crud.schema, count: 1 } })
		})

	})

}

// =============================================================================
// Read / GET

exports.read = function(crud, meta, cb) {

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}
		DEBUG && console.log("[orientdb] read:",crud.id)

		// TODO: implement 'meta' to instantiate a 'filter'
		db.class.get(crud.id).then(function (oClass) {
			oClass.list().then(function(models) {
				// we're done
				cb && cb( { status: "success", data: models, meta: { filter: false, count: models.length } });
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
			return false
		}
		var filter = {}
		filter[crud.idAttribute] = data[crud.idAttribute]

		DEBUG && console.log("[orientdb] update:", crud.id, data, filter)

		db.update(crud.id).set(data).where( filter ).scalar().then(function (total) {
			cb && cb( { status: "success", data: data, meta: { filter: filter, count: total} });
		})
	})

}

// =============================================================================
// Delete / DELETE

exports.delete = function(crud, data, cb) {

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}
		var filter = {}
		filter[crud.idAttribute] = data[crud.idAttribute]

		DEBUG && console.log("[orientdb] delete:", crud.id, data, filter)

		db.delete().from(crud.id).where( filter ).limit(1).scalar().then(function (total) {
			cb && cb( { status: "success", data: data, meta: { filter: filter, count: total} });
		})
	})

}

// =============================================================================
// Find / GET

exports.find = function(crud, data, cb) {

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}

		// TODO: implement 'meta' to instantiate a 'filter'
		var where = ""
		_.each(data, function(v,k) {
			where+= where?" AND ":""
			where+= k+"=:"+k

		})

		var query = "SELECT * FROM "+crud.id+ " WHERE "+where
console.log("[orientdb] find:",crud.id, query, data)

		db.query(query, {params: data }).then(function (results) {
console.log("Found: ",where, results)
			var meta = { filter: data, count: results.length }
			cb && cb( { status: "success", data: results[0], meta: meta });
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
			return false
		}

		var query = crud.queries[queryName]
		DEBUG && console.log("[orientdb] query:",crud.id, queryName, query, data)
		if (!query) {
			cb && cb( { status: "failed", message: "unknown query "+queryName});
			return
		}
		db.query(query, { params: data } ).then(function (results) {
			var meta = { filter: data, count: results.length }
			cb && cb( { status: "success", data: results, meta: meta });
		})
	})

}
