var self = module.exports

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var debug      = require("../debug")("feature:example");


// =============================================================================
// meta4 packages

var helper     = require('meta4helpers');   // files & mixins

// =============================================================================

// Feature packages


// =============================================================================
// configure the API routes

self.feature = function(meta4, feature) {

	// Sanity Checks
	assert(meta4,       "feature missing {{meta4}}")
	assert(meta4.router,"feature missing {{meta4.router}}")
	assert(meta4.config,"feature missing {{meta4.config}}")
	assert(meta4.app,   "feature missing {{meta4.app}}")
	assert(meta4.vents, "feature missing {{meta4.vents}}")

	assert(feature, "{{feature}} is missing")
	assert(feature.home, "{{feature.home}} is missing")
	assert(feature.path, "{{feature.path}} is missing")

	// =============================================================================

	var router = meta4.router, config = meta4.config

	// Feature Routing
	router.get(feature.path, function (req, res, next) {

		// do something

	})

}
