var exports = module.exports

// =============================================================================
// framework packages

var express    = require('express');        // call express
var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var paths      = require('path');           // file path
var debug      = require("../debug")("feature:assets");
var helpers    = require("../helpers");

// =============================================================================
// meta4 packages

var helper     = require('meta4common');   // files & mixins
var hbs        = require('express-handlebars');

// =============================================================================
// configure the API routes

exports.fn = function(meta4, feature) {

    assert(meta4, "feature needs meta4")
    assert(meta4.router, "feature needs meta4.router")

    assert(feature.home, "{{home}} is missing")
    assert(feature.path, "{{path}} is missing")

    // =============================================================================
    // read and install API definitions

    // configure Assets
    feature = _.extend({
        path: "/",
        home: __dirname+"/../public/",
        "order": 20,
    }, feature);

    // =============================================================================

    var app = meta4.app;
    var config = meta4.config;
    var DEBUG = feature.debug || false;

    var router = meta4.router;
    var assetHome = paths.resolve(feature.home);
    DEBUG && debug("%s @ %s", feature.path, assetHome)

    // =============================================================================
    // application static files

    // embedded static files from assets.home

    router.get('/*', function(req,res,next) {
        var file = req.path;
        if (!file || file == "/") file = "/index.html";

        file = paths.normalize(assetHome+file)
        if ( helpers.files.exists(file) ) {
            DEBUG && debug("local: %s", file);
            res.sendFile(file);
            return;
        }
        next && next();

    });

    DEBUG && debug("installed %s @ %s", (config.basePath+"/static"), assetHome);


}
