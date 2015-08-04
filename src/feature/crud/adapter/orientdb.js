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

exports.getDatabase = function(crud, cb) {
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
	console.log("getDatabase", crud.id, crud.adapter.database.name)

	cb && cb(null, db)

}

// =============================================================================
// Create

exports.create = function(crud, cmd, cb) {

	exports.getDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}

		DEBUG && console.log("[orientdb] create:",crud.id, cmd.data)

		db.insert().into(crud.id).set(cmd.data).then(function(model) {
			// we're done
			cb && cb({ status: "success", data: model, meta: { id: crud.id, schema: crud.schema } })
		})

	})

}

// =============================================================================
// Read / GET

exports.read = function(crud, cmd, cb) {

	exports.getDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}
		DEBUG && console.log("[orientdb] read:",crud.id, cmd.data)

		db.class.get(crud.id).then(function (oClass) {
			oClass.list().then(function(models) {
				// we're done
				cb && cb( { status: "success", data: models, meta: { filter: cmd.meta, schema: crud.schema, count: models.length } });
			})
		})
	})

}

// =============================================================================
// Update / PUT

exports.update = function(crud, cmd, cb) {

	exports.getDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}
		var filter = _.extend({}, cmd.meta)
		filter[crud.idAttribute] = cmd.data[crud.idAttribute]

		DEBUG && console.log("[orientdb] update:", crud.id, cmd.data, filter)

		db.update(crud.id).set(cmd.data).where( filter ).scalar().then(function (total) {
			cb && cb( { status: "success", data: cmd.data, meta: { filter: filter, schema: crud.schema, count: total} });
		})
	})

}

// =============================================================================
// Delete / DELETE

exports.delete = function(crud, cmd, cb) {

	exports.getDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}
		var filter = _.extend({}, cmd.meta)
		filter[crud.idAttribute] = cmd.data[crud.idAttribute]

		DEBUG && console.log("[orientdb] delete:", crud.id, cmd.data, filter)

		db.delete().from(crud.id).where( filter ).limit(1).scalar().then(function (total) {
			cb && cb( { status: "success", data: cmd.data, meta: { filter: filter, schema: crud.schema, count: total} });
		})
	})

}

// =============================================================================
// Run SQL Query / GET

exports.query = function(crud, cmd, cb) {
	assert (cmd, "orientdb CRUD missing query cmd")
	assert (crud, "orientdb CRUD missing options")
	assert (cmd.query, "orientdb CRUD missing query")

	exports.getDatabase(crud, function(err, db) {

		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}
		DEBUG && console.log("[orientdb] query:",crud.id, cmd.query)

		db.query(cmd.query, { params: cmd.meta } ).then(function (results) {
				var meta = { filter: cmd.meta, schema: crud.schema, count: results.length }
				cb && cb( { status: "success", data: results, meta: cmd.meta });
		})
	})

}
