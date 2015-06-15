var exports = module.exports = module.exports || {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var swaggerize = require('swaggerize-express');

// =============================================================================
// meta4 packages

var helper     = require('meta4helpers');   // files & mixins

// =============================================================================
// configure the API routes

exports.feature = function(router, feature, config) {

    // =============================================================================
    // read and install API definitions


    var apiFilename = feature.home

    var files = helper.files.find(apiFilename)

    // build API routes
    // TODO: re-refactor static & dynamic (Swagger) routes
//    _.each(files, function(data, file) {
//        apis.configure(router, config, JSON.parse(data) )
//
//    })

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
}
