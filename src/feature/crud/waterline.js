var exports = module.exports = {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions

// =============================================================================
var Waterline  = require('waterline');      // waterline

var mongodb = require('sails-mongodb');

// =============================================================================
// handle model requests

exports.handle = function(req, res, meta, config) {

    assert(meta.home, "CRUD FILE missing {{home}}")
    assert(meta.id, "CRUD FILE missing {{id}}")


	var options = {
        // Define a custom table name
        tableName: meta.id,
        // Set schema true/false for adapters that support schema-less
        schema: true,
        // Define an adapter to use
        adapter: mongodb,
        // Define attributes for this collection
        attributes: meta.schema
    }
	var Collection = Waterline.Collection.extend(options)

	console.log("Models", options)
	var models = new Collection(options);


}