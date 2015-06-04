var exports = module.exports = module.exports || {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var swaggerize = require('swaggerize-express');

// =============================================================================
// meta4 packages

var util       = require('../util');        // Utils

// =============================================================================
// configure the API routes

exports.configure = function(router, config) {

    var feature = config.features.apis
    console.log("\tAPI:", feature)

    // =============================================================================
    // read and install API definitions


    var apiFilename = config.homeDir+feature.path
    var files = util.findFiles(apiFilename)

    // build API routes
    // TODO: re-refactor static & dynamic (Swagger) routes
//    _.each(files, function(data, file) {
//        apis.configure(router, config, JSON.parse(data) )
//
//    })

    var basePath = config.basePath

    // =============================================================================
    // simple instrumentation / diagnostics

    router.get('/about', function(req, res) {
        res.json({ message: 'Welcome to '+config.name, basePath: basePath, apis: clientAPIs });
    });

    // =============================================================================
    // configure Swagger API definitions
    // TODO: [work-in-progress]

//    router.use(swaggerize({
//        api: require('./api.json'),
//        docspath: '/api-docs',
//        handlers: './handlers'
//    }));

//    var clientAPIs = []
//    apiConfig.apis.forEach(function(api) {
//
//        console.log("\t", basePath + api.path)
//
//        // register each Swagger API path with router
//        router.get(api.path, function(req, res) {
//            res.json({ message: 'Welcome to '+basePath + api.path });
//        });
//
//        clientAPIs.push( { path: api.path } )
//    })

    assert(basePath, "{{basePath}} is missing")
    console.log("[meta4node] API initialized:", basePath) // , config, "\n API: "
}
