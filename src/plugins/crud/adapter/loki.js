// =============================================================================
// Framework Packages

var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var helper     = require('meta4common');   // files & mixins
var debug      = require("../../../debug")("crud:loki");
var paths      = require("path");

// =============================================================================
// Feature Packages

var loki       = require('lokijs');

var self = exports._db = {}

// =============================================================================
// safely acquire a Collection

self.getCollection = function(crud, db) {
	// get our collection
	var collection = db.getCollection( crud.id );
	if (!collection) {
		// if not, create it
		collection = db.addCollection( crud.id );
		// initial data
		_.each(crud.data, function(data) {
			collection.insert(data)
		})
	}
	return collection
}


self.acquireDatabase = function(crud, cb) {

	var home = crud.home || crud.adapter.home;
    assert(home, "CRUD Loki required a home")

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
    helper.files.mkdirs(home);
	var filename = paths.normalize(home+"/"+crud.id+".json");

    // load Loki - callback when done
    db = exports._db[crud.id] = new loki( filename, { autoload: true, autosave: true, autosaveInterval: autosaveInterval,
        autoloadCallback: function() {
//            debug("acquired: %s -> %j --> %j", crud.id, db.collections, arguments);
	        cb && cb (null, db);
        }
     } );
}

// =============================================================================
// Create

exports.create = function(crud, cmd, cb) {

	self.acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", err: err });
			return false
		}

//		debug("create:",crud.id, cmd.data);

        var collection = self.getCollection(crud, db);
		var found = collection.insert(cmd.data)

		// externalize ID attribute
        cmd.data[crud.idAttribute] = cmd.data["$loki"];
		debug("created %s -> %j",crud.id, found);

		// we're done
		cb && cb(null, { status: "success", data: [cmd.data], meta: {  } })

	})

}

// =============================================================================
// Read / GET

exports.read = function(crud, cmd, cb) {
    assert(crud, "Missing CRUD");
    assert(cmd, "Missing command");
    assert(cb, "Missing callback");
    assert(_.isFunction(cb), "Invalid callback: "+JSON.stringify(cb));
    assert(crud.adapter, "Missing adapter");
    assert(crud.adapter.type, "Invalid adapter");
    assert(crud.adapter.home, "Missing loki home");

	self.acquireDatabase(crud, function(err, db) {

		if (err) {
			cb && cb( { status: "failed" , err: err });
			return false
		}
		assert(db, "Missing loki database: "+crud.id);

		debug("read %s @ %j", crud.id, crud.adapter.home);

		var collection = self.getCollection(crud, db);
        if (!collection) {
            cb && cb( { status: "failed" , err: "missing "+crud.id });
            return;
        }
        assert(collection.name==crud.id, "Collection name mismatched: "+collection.name);

        var where = _.extend({}, cmd.where, crud.where);
        var filters = _.extend({}, cmd.filters, crud.filters);

		var found = where?collection.find(where):collection.data;
        found = found || [];
		debug("found %s x %s", found.length, crud.id);

		// we're done
		cb && cb( null, { status: "success", data: found });
	})
}

// =============================================================================
// Update / PUT

exports.update = function(crud, cmd, cb) {

	self.acquireDatabase(crud, function(err, db) {

		if (err) {
			cb && cb( { status: "failed", err: err });
			return false
		}

		debug("update:", crud.id, cmd.data)

        var collection = self.getCollection(crud, db);
        debug("update %s -> %j", crud.id, cmd.data);

		var found = collection.update(cmd.data);
		// we're done
		cb && cb( null, { status: "success", data: [cmd.data], meta: { count: found } });
	})

}

// =============================================================================
// Delete / DELETE

exports.delete = function(crud, cmd, cb) {

	self.acquireDatabase(crud, function(err, db) {
		if (err) {
			cb && cb( { status: "failed", err: err });
			return false
		}

		debug("delete: %s -> %s", crud.id, cmd.data[crud.idAttribute]);

        var collection = self.getCollection(crud, db);
		var found = collection.removeWhere(cmd.data)
		debug("deleted: %s -> %j",crud.id, found)

		// we're done
		cb & cb( null, { status: "success", data: [], meta: { deleted: found?found:false } });
	})
}

