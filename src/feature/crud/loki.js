// =============================================================================
// framework packages

var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions

var loki       = require('lokijs');         // loki

// =============================================================================
// handle model requests

exports.handle = function(req, res, crud, meta4) {

	var fn = exports.handle[req.method]
	if (!fn) {
		return res.json( { status: "error", message: "unsupported method: "+req.method } );
	}

	// underlying database

	var filename = crud.home+crud.id+".json"
	var db = new loki(filename);

	// get our collection
	var collection = db.getCollection( crud.id )
	if (!collection) {
		// if not, create it
		collection = db.addCollection( crud.id )
	}

	if (!collection) {
		return res.json( { status: "failed", message: "loki collection not found: "+collection });
	}

	fn( req, res, crud, collection )

}

// Create
exports.handle.POST = function(req, res, crud, collection) {

	console.log("create: ",crud.id, req.query)

	var found = collection.insert(req.query)
	console.log("found: ",crud.id, found)
	return res.json( { status: "success", data: found, crud: { schema: crud.schema } });

}

// Read
exports.handle.GET = function(req, res, crud, collection) {

	console.log("read: ",crud.id, req.query)

	var found = collection.find(req.query)
	console.log("found: ",crud.id, found)
	return res.json( { status: "success", data: found, crud: { schema: crud.schema } });

}

// Update
exports.handle.PUT = function(req, res, crud, collection) {

	console.log("update: ",crud.id, req.query)

	var found = collection.update(req.query)
	console.log("found: ",crud.id, found)
	return res.json( { status: "success", data: found, crud: { schema: crud.schema } });

}

// Delete
exports.handle.DELETE = function(req, res, crud, collection) {

	console.log("delete: ",crud.id, req.query)

	var found = collection.removeWhere(req.query)
	console.log("found: ",crud.id, found)
	return res.json( { status: "success", data: found, crud: { schema: crud.schema } });

}

