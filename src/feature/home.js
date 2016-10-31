var exports = module.exports

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var debug      = require("../debug")("feature:apis");

// =============================================================================
// meta4 packages

var helper     = require('meta4helpers');   // files & mixins

// =============================================================================
// configure the API routes

exports.feature = function(meta4, feature) {

    assert(meta4, "feature needs meta4")
    assert(meta4.router, "feature needs meta4.router")

    assert(feature.home, "{{home}} is missing")
    assert(feature.path, "{{path}} is missing")

	var router = meta4.router, config = meta4.config

    // configure API
    feature = _.extend({
        path: "/",
        home: config.home+"/public/"
    }, feature);


    // TODO
}
