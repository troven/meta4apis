var self = exports = module.exports = module.exports || {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var path       = require('path');           // file path helper
var assert     = require('assert');         // assertions
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

var util     = require('../util');           // convenience functions

// =============================================================================
// Configure UX - load recipes from local files

exports.configure = function(router, config) {

    var feature = config.features.ux
    assert(feature.path, "{{ux}} feature not configured")
    var paths = feature.paths || config.paths
    console.log("\tUX:", feature, paths)

    router.get(feature.path, function(req, res) {

        // live re-generation of recipe files
        // NOTE: blocking I/O inside
        var recipe = self.handle(config)
        recipe.url = req.protocol+"://"+req.hostname+":"+config.port+config.basePath
        res.json(recipe);

    });

    console.log("[meta4node] UX initialized")
}

// =============================================================================
// dynamically build the UX definition

exports.handle = function(config) {

    var feature = config.features.ux
    var recipe = { views: {}, models: {}, scripts: {}, templates: {} }

    var AcceptJSON = function(file, data) { return file.indexOf(".json")>0 }
    var AcceptHTML = function(file, data) { return file.indexOf(".html")>0 }

    // =============================================================================
    // load the View definitions

    var viewsDir = config.homeDir+"/"+feature.home
    var found  = util.findFiles(viewsDir, AcceptJSON )

    _.each( found, function(data, file) {
        var view = JSON.parse(data)
        view.id = view.id || path.basename(file, ".json")
        recipe.views[view.id] = view
    })

    // =============================================================================
    // load the Model definitions

    var modelsDir = config.homeDir+"/"+config.paths.models
    found  = util.findFiles(modelsDir, AcceptJSON )

    _.each( found, function(data, file) {
        var model = JSON.parse(data)

        // only designated client models
        if (model.isClient) {
            model.id = model.id || path.basename(file, ".json")
            recipe.models[model.id] = model
        }

        model.url = model.url || config.basePath+feature.crud+"/"+model.id
//        console.log("\tmodel: ", model.id, "@", model.url)
    })

    // =============================================================================
    // load the HTML Templates

    var templatesDir = config.homeDir+"/"+config.paths.templates
    found  = util.findFiles(templatesDir, AcceptHTML )

    // add templates to recipe
    _.each( found, function(data, file) {
        var id = path.basename(file, ".html");
//TODO: paths are being truncated

        // strip repetitive whitespace
        recipe.templates[id] = (""+data).replace(/\s+/g, ' ');
    })

    // =============================================================================
    // load the client-side Scripts

    var scriptsDir = config.homeDir+"/"+config.paths.scripts
    found  = util.findFiles(scriptsDir, AcceptHTML )

    // add scripts to recipe
    _.each( found, function(data, file) {
        var id = path.basename(file, ".js");
//TODO: paths are being truncated
        recipe.scripts[id] = ""+data
    })

    // UX recipe
    recipe.home = "views:home"
    recipe.id = config.name

    return recipe
}
