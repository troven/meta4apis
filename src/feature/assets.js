var exports = module.exports = module.exports || {};

// =============================================================================
// framework packages

var express    = require('express');        // call express
var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var paths      = require('path');           // file path

// =============================================================================
// meta4 packages

var helper     = require('meta4helpers');   // files & mixins

// =============================================================================
// configure the API routes

exports.feature = function(meta4, feature) {

    assert(meta4, "feature needs meta4")
	var router = meta4.router, config = meta4.config

    assert(feature.home, "{{home}} is missing")
    assert(feature.path, "{{path}} is missing")

    // =============================================================================
    // read and install API definitions

    var assetHome = feature.home
    var DEBUG = feature.debug || false

    // =============================================================================
    // application static files

    // support local assets & inferred 'index.html' route
    router.use(feature.path, express.static(assetHome) );


    // embedded static files
    router.get('/*', function(req,res,next) {
        var path = req.params[0];
        if (path.indexOf('..') === -1) {
            var file = paths.normalize(__dirname + "/../static/"+feature.home)
            var stat = fs.existsSync(file)
DEBUG&&console.log("Asset: ", file, stat?true:false)
            if (stat) {
                res.sendFile(file);
                return
            }
        }
        next()
    });

DEBUG&&console.log("[meta4] Assets "+config.basePath+"/static from:",assetHome)


}
