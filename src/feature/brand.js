var self = module.exports

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var assert     = require('assert');         // assertions
var _          = require('underscore');     // collections helper
var debug      = require("../debug")("feature:brand");

// =============================================================================
// meta4 packages

var helper     = require('meta4common');   // files & mixins

// =============================================================================

/**
 * Inject the "brand" object into http.request
 *
 * @param meta4
 * @param feature
 *
 *
 */

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

	assert(!feature.installed, "brand feature is already installed")

	// =============================================================================

	var router = meta4.router, config = meta4.config

	self.installed = true;

    var options = _.pick(meta4.config, ["host", "port", "basePath", "protocol", "name"]);

	// inject the {{brand}} feature object into the request

	router.get("/*", function (req, res, next) {
		req.brand = _.extend({}, options, feature);
		next && next();
	})

    debug("installed");
}
