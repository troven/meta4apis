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

// =============================================================================
// acquire a Database

exports.getDatabase = function(crud, cb) {
	var db = exports._db[crud.id]
	if (db) {
		cb && cb(db)
		return
	}

	// initialize database
	var db = exports._db[crud.id] = OrientDB(_.extend({
		host: 'localhost',
		port: 2424,
		username: 'root',
		password: 'meta4secret'
	}, crud.adapter));

	cb && cb(db)

}

// safely acquire a Collection

exports.getCollection = function(crud, cb) {

	DEBUG && console.log("CRUD:orient", crud.id)
	assert(crud.home, "CRUD Orient required a home")

	// underlying database

	var db = exports._db[crud.id]
	if (db) {
		// already initialized ..
		exports._getCollection( crud, db, cb )
		return
	}

	// initialize database
	var autosaveInterval = crud.adapter.autosaveInterval?crud.adapter.autosaveInterval:3000
	var filename = crud.home+"/"+crud.id+".db"
	helper.files.mkdirs(crud.home)

	// load Loki - callback when done
	db = exports._db[crud.id] = OrientDB(_.extend({
		host: 'localhost',
		port: 2424,
		username: 'root',
		password: 'meta4secret'
	}, crud.adapter));


	exports._getCollection( crud, db, cb )
}

exports._getCollection = function(crud, db, cb) {

	var collection = db.class.get(crud.id).then(function(oClass) {
		cb && cb(null, oClass)
	})

	if (!collection)  cb("OrientDB collection not found:"+crud.id, null)

	return collection
}

// =============================================================================
// Create

exports.create = function(query, crud, cb) {

	exports.getDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}

		DEBUG && console.log("[orientdb] create:",crud.id, query.data)

		db.insert().into(crud.id).set(query.data).then(function(model) {
			// we're done
			cb && cb({ status: "success", data: model, meta: { id: crud.id, schema: crud.schema } })
		})

	})

}

// =============================================================================
// Read / GET

exports.read = function(query, crud, cb) {

	exports.getDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}
		DEBUG && console.log("[orientdb] read:",crud.id, query.data)

		db.class.get(crud.id).then(function (oClass) {
			oClass.list().then(function(models) {
				// we're done
				cb && cb( { status: "success", data: models, meta: { filter: query.meta, schema: crud.schema, count: models.length } });
			})
		})
	})

}

// =============================================================================
// Update / PUT

exports.update = function(query, crud, cb) {

	exports.getDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}
		var filter = _.extend({}, query.meta)
		filter[crud.idAttribute] = query.data[crud.idAttribute]

		DEBUG && console.log("[orientdb] update:", crud.id, query.data, filter)

		db.update(crud.id).set(query.data).where( filter ).scalar().then(function (total) {
			cb && cb( { status: "success", data: query.data, meta: { filter: filter, schema: crud.schema, count: total} });
		})
	})

}

// =============================================================================
// Delete / DELETE

exports.delete = function(query, crud, cb) {

	exports.getDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}
		var filter = _.extend({}, query.meta)
		filter[crud.idAttribute] = query.data[crud.idAttribute]

		DEBUG && console.log("[orientdb] delete:", crud.id, query.data, filter)

		db.delete().from(crud.id).where( filter ).limit(1).scalar().then(function (total) {
			cb && cb( { status: "success", data: query.data, meta: { filter: filter, schema: crud.schema, count: total} });
		})
	})

}

