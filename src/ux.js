var exports = module.exports = {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var path       = require('path');           // file path helper
var _          = require('underscore');     // collections helper

// =============================================================================

// =============================================================================
// meta4 packages

var util     = require('./util');           // convenience functions

exports.build = function(config) {

    var recipe = { views: {}, models: {}, scripts: {}, templates: {} }

    var AcceptJSON = function(file, data) { return file.indexOf(".json")>0 }
    var AcceptHTML = function(file, data) { return file.indexOf(".html")>0 }

    // =============================================================================
    // load the View definitions

    var viewsDir = config.homeDir+"/"+config.paths.views
    var found  = util.walkDir(viewsDir, AcceptJSON )

    _.each( found, function(data, file) {
        var view = JSON.parse(data)
        view.id = view.id || path.basename(file, ".json")
        recipe.views[view.id] = view
    })

    // =============================================================================
    // load the Model definitions

    var modelsDir = config.homeDir+"/"+config.paths.models
    found  = util.walkDir(modelsDir, AcceptJSON )

    _.each( found, function(data, file) {
        var model = JSON.parse(data)
        if (model.isClient) {
            model.id = model.id || path.basename(file, ".json")
            recipe.models[model.id] = model
        }
    })

    // =============================================================================
    // load the Template (strips repetitive whitespace)

    var templatesDir = config.homeDir+"/"+config.paths.templates
    found  = util.walkDir(templatesDir, AcceptHTML )

    _.each( found, function(data, file) {
        var id = path.basename(file, ".html");
        recipe.templates[id] = (""+data).replace(/\s+/g, ' ');

    })

    // =============================================================================
    // load the Script definitions

    var scriptsDir = config.homeDir+"/"+config.paths.scripts
    found  = util.walkDir(scriptsDir, AcceptHTML )

    _.each( found, function(data, file) {
        var id = path.basename(file, ".js");
        recipe.scripts[id] = ""+data
    })


    return recipe
}
