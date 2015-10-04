var exports = module.exports

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
var hbs        = require('express-handlebars');

// =============================================================================
// configure the API routes

exports.feature = function(meta4, feature) {

    assert(meta4, "feature needs meta4")
    assert(meta4.router, "feature needs meta4.router")

    assert(feature.home, "{{home}} is missing")
    assert(feature.path, "{{path}} is missing")

    // =============================================================================
    // read and install API definitions

    var app = meta4.app;
    var config = meta4.config;
    var assetHome = paths.normalize(feature.home);
    var DEBUG = feature.debug || false;

    // configure Assets
    feature = _.extend({
        path: "/",
        "order": 20,
        home: config.home+"/public"
    }, feature);

    // =============================================================================

//    var router = express();
//    app.use(config.basePath || "/", router);

    var router = meta4.app;

    //https://github.com/ericf/express-handlebars
    app.engine('.html', hbs({defaultLayout: false, extname: '.html', settings: { views: assetHome } }));
    app.set('view engine', '.html');
    app.set('views', assetHome);

    console.log("[meta4] ASSET paths: %s, %s @ %s", config.basePath, feature.path, assetHome)

    // =============================================================================
    // application static files

    // support local assets & inferred 'index.html' route
//    router.use(feature.path, function(req,res,next) {
////        express.static(assetHome)
//        console.log("ASSET: %s", req.path)
//    } );


    // embedded static files
    router.get('/*', function(req,res,next) {
        var file = paths.normalize(assetHome+req.path)
        var insideHomeDir = file.indexOf(assetHome);
        console.log("Asset Found : (%s) %s -> %s -> %s", insideHomeDir, file, assetHome, req.path)
        if (insideHomeDir == 0) {
            var stat = fs.existsSync(file)
            if (stat) {
                res.sendFile(file);
                return;
            }
            next();
            return;
        }
        // illegal path
        res.sendStatus(403);
    });

DEBUG&&console.log("[meta4] Assets "+config.basePath+"/static from:",assetHome)


}
