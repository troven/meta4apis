var exports = module.exports = {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var path       = require('path');           // file path helper
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

var util     = require('./util');           // convenience functions

// =============================================================================
// build UX recipes from local files

exports.build = function(config) {

    var recipe = { views: {}, models: {}, scripts: {}, templates: {} }

    var AcceptJSON = function(file, data) { return file.indexOf(".json")>0 }
    var AcceptHTML = function(file, data) { return file.indexOf(".html")>0 }

    // =============================================================================
    // load the View definitions

    var viewsDir = config.homeDir+"/"+config.paths.views
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
        model.url = model.url || config.basePath+config.features.models+"/"+model.id
//        console.log("\tmodel: ", model.id, "@", model.url)
    })

    // =============================================================================
    // load the Templates

    var templatesDir = config.homeDir+"/"+config.paths.templates
    found  = util.findFiles(templatesDir, AcceptHTML )

    _.each( found, function(data, file) {
        var id = path.basename(file, ".html");
        // strip repetitive whitespace
        recipe.templates[id] = (""+data).replace(/\s+/g, ' ');
    })

    // =============================================================================
    // load the client-side scripts

    var scriptsDir = config.homeDir+"/"+config.paths.scripts
    found  = util.findFiles(scriptsDir, AcceptHTML )

    _.each( found, function(data, file) {
        var id = path.basename(file, ".js");
        recipe.scripts[id] = ""+data
    })

    // UX recipe
    recipe.home = "views:home"
    recipe.id = config.name

    return recipe
}
