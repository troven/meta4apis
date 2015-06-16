// =============================================================================
// framework packages

var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions

var upload     = require('loki');           // loki

// =============================================================================
// handle model requests

exports.handle = function(req, res, meta, config) {

	var filename = meta.home+meta.id+".json"
	var db = new loki(filename);

	var fn = self.handle[req.method]

	fn(req,res,meta)

}

exports.handle.GET = function(req, res, meta) {
	console.log("read: ",meta.id)
}