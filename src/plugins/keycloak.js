var self = module.exports

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var paths      = require('path');           // file path
var debug      = require("../debug")("feature:keycloak");

// =============================================================================
// meta4 packages

var helper     = require('meta4common');   // files & mixins

// =============================================================================

// Feature packages

var Keycloak    = require('keycloak-connect');
var session = require('express-session');


// =============================================================================
// configure the API routes

self.fn = function(meta4, feature) {

    assert(meta4, "feature needs meta4");
    assert(meta4.router, "feature needs meta4.router");
    assert(meta4.app, "feature needs meta4.app");

    feature.path = feature.path || feature.id
    assert(feature.path, "{{path}} is missing");
    // =============================================================================

    var app = meta4.app, router = meta4.router, config = meta4.config;
    var brand = _.extend({ name: config.name, description: config.description || "", path: config.basePath }, feature.brand);

    var DEBUG = feature.debug || true;

    var memoryStore = new session.MemoryStore();
    var keycloak = new Keycloak({ store: memoryStore });

    debug("keycloak: %s", feature.path);

    app.use( keycloak.middleware() );

    app.get( '/ux/', keycloak.protect(), function(req,res) {
        console.log("UX PROTECTED: %j", arguments);
    });

    app.get( '/models/*', keycloak.protect(), function(req,res) {
        console.log("MODELS PROTECTED: %j", arguments);
    });

    return _.extend(feature, {
        keycloak: keycloak
    });
};
