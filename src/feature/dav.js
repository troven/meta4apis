var self = module.exports

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var debug      = require("../debug")("feature:dav");

//var jsDAV      = require('jsDAV');          // WebDAV


// =============================================================================
// meta4 packages

var helper     = require('meta4helpers');   // files & mixins

// =============================================================================
// configure the API routes

self.feature = function(meta4, feature) {

    assert(meta4, "feature needs meta4")
    assert(meta4.router, "feature needs meta4.router")

    assert(feature.home, "{{home}} is missing")
    assert(feature.path, "{{path}} is missing")

	var router = meta4.router, config = meta4.config

    // =============================================================================
    // read and install API definitions

/*
	var jsDAV_Locks_Backend_FS = require("jsDAV/lib/DAV/plugins/locks/fs");
    debug("jsDAV " + jsDAV_Server.VERSION + " is installed.");

jsDAV.createServer({
    node: __dirname + "/../test/assets",
    locksBackend: jsDAV_Locks_Backend_FS.new(__dirname + "/data")
}, 8000);
*/


}
