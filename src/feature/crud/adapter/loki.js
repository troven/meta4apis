// =============================================================================
// Framework Packages

var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var helper     = require('meta4helpers');   // files & mixins

// =============================================================================
// Feature Packages

var loki       = require('lokijs');         // loki

var DEBUG = false
exports._db = {}

// =============================================================================
// safely acquire a Collection

var getCollection = function(crud, db) {
	// get our collection
	var collection = db.getCollection( crud.id )
	if (!collection) {
		// if not, create it
		collection = db.addCollection( crud.id )
		// initial data
		_.each(crud.data, function(data) {
			collection.insert(data)
		})
	}
	return collection
}


var acquireDatabase = function(crud, cb) {

	DEBUG && console.log("CRUD:loki", crud.id)
	assert(crud.home, "CRUD Loki required a home")

	// underlying database

	var db = exports._db[crud.id]
	if (db) {
		// already initialized ..
		cb && cb(null, db)
	    return
	}

	// initialize database
	var autosaveInterval = crud.adapter.autosaveInterval?crud.adapter.autosaveInterval:3000

	// file management
//	crud.adapter.database.name
	var filename = crud.home+"/"+crud.id+".loki"
	helper.files.mkdirs(crud.home)

    // load Loki - callback when done
    db = exports._db[crud.id] = new loki( filename, { autoload: true, autosave: true, autosaveInterval: autosaveInterval,
        autoloadCallback: function() {
	        cb && acquireDatabase( crud, cb )
        }
     } );
}

// =============================================================================
// Create

exports.create = function(crud, data, cb) {

	acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", message: err })
			return false
		}

		DEBUG && console.log("[loki] create:",crud.id, data)

		var collection = db.getCollection(crud, db)
		var found = collection.insert(data)

		// externalize ID attribute
		data[crud.idAttribute] = data["$loki"]
		DEBUG && console.log("[loki] created:",crud.id, found)

		// we're done
		cb && cb({ status: "success", data: data, meta: {  } })

	})

}

// =============================================================================
// Read / GET

exports.read = function(crud, data, cb) {

	acquireDatabase(crud, function(err, db) {

		if (err) {
			cb && cb( { status: "failed" , message: err })
			return false
		}

		DEBUG && console.log("[loki] read:",crud.id, data )

		var collection = db.getCollection(crud, db)
		var found = collection.find(data)
		DEBUG && console.log("[loki] found:", crud.id, found)

		// we're done
		cb && cb( { status: "success", data: found, meta: { filter: data, count: found.length } });
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

		DEBUG && console.log("[loki] update:", crud.id, data)

		var collection = db.getCollection(crud, db)
		var found = collection.update(data)
		DEBUG && console.log("[loki] updated:", crud.id, data, found)

		// we're done
		cb && cb( { status: "success", data: data, meta: { count: found } });
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

		DEBUG && console.log("[loki] delete:", crud.id, data)

		var collection = db.getCollection(crud, db)
		var found = collection.removeWhere(data)
		DEBUG && console.log("[loki] deleted:",crud.id, found)

		// we're done
		cb & cb( { status: "success", data: data, meta: { count: found } });
	})
}
