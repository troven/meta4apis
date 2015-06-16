// =============================================================================
// Framework Packages

var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var helper     = require('meta4helpers');   // files & mixins

// =============================================================================
// Feature Packages

var loki       = require('lokijs');         // loki

// =============================================================================
// handle model requests

exports._db = {}

exports.handle = function(req, res, crud, meta4) {

console.log("CRUD:loki", crud.id, req.query)

	// underlying database

	var autosaveInterval = crud.adapter.autosaveInterval?crud.adapter.autosaveInterval:10000
	var filename = crud.home+"/"+crud.id+".db"
	var db = exports._db[crud.id]
	 if (!db) {
	    helper.files.mkdirs(crud.home)
	    db = exports._db[crud.id] = new loki( filename, { autoload: true, autosave: true, autosaveInterval: autosaveInterval,
	        autoloadCallback: function() {
			    exports.handle.collection( req, res, crud, db )
	        }
	     } );
	 } else {
	    exports.handle.collection( req, res, crud, db )
	 }

}

exports.handle.collection = function(req, res, crud, db) {
	// pointer to CRUD method
	var fn = exports.handle[req.method]
	if (!fn) {
		return res.json( { status: "error", message:"unsupported method:"+req.method } );
	}

	// get our collection
	var collection = db.getCollection( crud.id )
	if (!collection) {
		// if not, create it
		collection = db.addCollection( crud.id )
	}

	if (!collection) {
		return res.json( { status: "failed", message:"loki collection not found:"+crud.id });
	}

	// delegate to CRUD method
	try {
		fn( req, res, crud, collection )
	} catch(e) {
		return res.json( { status: "error", message:"Exception:"+e+" @ "+crud.id });
	}
}

// Create
exports.handle.POST = function(req, res, crud, collection) {

	var data = _.extend({}, req.query, req.body)
	console.log("[loki] create:",crud.id, data)

	var found = collection.insert(data)

	// externalize ID attribute
	data[crud.idAttribute] = data["$loki"]

	console.log("[loki] created:",crud.id, found)
	return res.json( { status: "success", data: data, meta: { schema: crud.schema } });
}

// Read
exports.handle.GET = function(req, res, crud, collection) {

	var query = _.extend({}, req.body)
	console.log("[loki] read:",crud.id, req.query, req.body)

	var found = collection.find(query)
	console.log("[loki] found:",crud.id, found)

	return res.json( { status: "success", data: found, meta: { filter: query, schema: crud.schema, count: found.length } });
}

// Update
exports.handle.PUT = function(req, res, crud, collection) {
	console.log("[loki] update:",crud.id, req.query, req.body)

	var data = _.extend({}, req.body)
	var found = collection.update(data)
	console.log("[loki] updated:", req.method, crud.id, data, found)

	return res.json( { status: "success", data: data, meta: { schema: crud.schema } });

}

// Delete
exports.handle.DELETE = function(req, res, crud, collection) {

	var data = _.extend({}, req.body)
	console.log("[loki] delete:",crud.id, data)

	var found = collection.removeWhere(data)
	console.log("[loki] deleted:",crud.id, found)

	return res.json( { status: "success", data: {}, meta: { schema: crud.schema } });
}

