var exports = module.exports = module.exports || {};

// =============================================================================
// framework packages

var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 feature packages

// =============================================================================

exports.configure = function(router, config) {

    // default configuration
    var features = config.features = config.features || {}

    // configure API
    features.apis = _.extend({
        path: "/apis"
    }, features.apis)

    // configure CRUD
    features.crud = _.extend({
        path: "/models",
        home: "models/meta",
        data: "models/data",
    }, features.crud)


    // configure UX
    features.ux = _.extend({
        path: "/ux",
        home: "views"
    }, features.ux)
    features.ux.crud = features.crud.path

    // configure Logins
    features.auth = _.extend({
        path: {
            index:  "/",
            home:   "/home",
            login:  "/login",
            logout: "/logout",
            signup: "/signup"
        }
    }, features.auth)

    // configure Upload
    features.upload = _.extend({
        path: "/upload",
        home: "uploads",
        limits: {
            fieldNameSize: 100,
            files: 2,
            fields: 5
        }
    }, features.upload)

    // =============================================================================
    // Load and configure Feature

    console.log("[meta4node] features:", _.keys(config.features))

    _.each(features, function(options, key) {
        console.log("\tinitialize "+key)
        var feature   = require('./feature/'+key);
        feature && feature.configure(router, config)
    })

    return
}
