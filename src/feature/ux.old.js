var self = exports = module.exports = module.exports || {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var path       = require('path');           // file path helper
var assert     = require('assert');         // assertions
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

var helper     = require('meta4helpers');   // files & mixins
var ux         = require('meta4ux');        // ux features

// =============================================================================
// Configure UX - load recipes from local files

exports.feature = function(router, feature, config) {

    assert(feature.path, "{{ux}} feature not configured")
    assert(config.features.crud, "UX requires CRUD configuration");
    assert(config.features.crud.home, "CRUD {{home}} is missing");

    var paths = feature.paths || config.paths
    console.log("\tUX:", feature.path)

    router.get(feature.path, function(req, res) {
console.log("GET UX: ", req.path)

        // live re-generation of recipe files
        // NOTE: blocking I/O inside
        var recipe = self.handle(feature, config)
        recipe.url = req.protocol+"://"+req.hostname+":"+config.port+config.basePath
        res.json(recipe);

    });
}

// =============================================================================
// dynamically build the UX definition

exports.handle = function(feature, config) {

    var recipe = { views: {}, models: {}, scripts: {}, templates: {} }

    var AcceptJSON = function(file, data) { return file.indexOf(".json")>0 }
    var AcceptHTML = function(file, data) { return file.indexOf(".html")>0 }
    var AcceptECMA = function(file, data) { return file.indexOf(".js")>0 }

    // =============================================================================
    // load the View definitions

    var viewsDir = feature.home
    var found  = helper.files.find(viewsDir, AcceptJSON )

    // create View recipe
    _.each( found, function(data, file) {
        try {
            var view = JSON.parse(data)
            view.id = view.id || path.basename(path.normalize(file), ".json")
            recipe.views[view.id] = view
        } catch(e) {
            console.error("Error:", file, e)
        }
    })

    // =============================================================================
    // load the Model definitions

    var modelsDir = feature.models
    found  = helper.files.find(modelsDir, AcceptJSON )

    _.each( found, function(data, file) {
        if (!data) return
        try {
            var model = JSON.parse(data)
        } catch(e) {
            console.log("Corrupt JSON:", file)
        }

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

    var templatesDir = feature.templates
    found  = helper.files.find(templatesDir, AcceptHTML )

    // add templates to recipe
    var assetKey = "templates"
    _.each( found, function(data, file) {
        var id = file.substring(feature[assetKey].length+1)
//console.log("UX: template", id)

        // strip repetitive whitespace
        recipe.templates[assetKey+":"+id] = (""+data).replace(/\s+/g, ' ');
    })

    // =============================================================================
    // load the client-side JS scripts

    var scriptsDir = feature.scripts
    found  = helper.files.find(scriptsDir, AcceptECMA )

    // add JS scripts to recipe
    assetKey = "scripts"
    _.each( found, function(data, file) {
        var id = file.substring(feature[assetKey].length+1)
//console.log("UX: script", id)
        recipe.scripts[assetKey+":"+id] = ""+data
    })

    // UX recipe
    recipe.home = "views:home"
    recipe.id = config.name

    return recipe
}
