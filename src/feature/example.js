var exports = module.exports = module.exports || {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions


// =============================================================================
// meta4 packages

var helper     = require('meta4helpers');   // files & mixins

// =============================================================================

// Feature packages


// =============================================================================
// configure the API routes

exports.feature = function(meta4, feature) {

	assert(meta4, "[Example] is missing {{meta4}}")
	assert(meta4.router, "[Example] is missing {{meta4.router}}")
	assert(feature.home, "[Example] is missing {{feature.home}}")

	var router = meta4.router, config = meta4.config

	// Feature Routing
	router.get(feature.path, function (req, res, next) {

		// do something

	})

}
