var self = module.exports

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var paths      = require('path');           // file path helper
var assert     = require('assert');         // assertions
var express    = require('express');        // call express
var _          = require('underscore');     // collections helper
var debug      = require('../debug')("ux"); // debug

// =============================================================================
// meta4 packages

var helpers     = require('meta4common');      // utilities
var meta4ux     = require("meta4ux");

// =============================================================================
// Configure UX - load recipes from local files

exports.feature = function(meta4, feature) {

	// Sanity Checks
    assert(meta4, "feature is missing {{meta4}}");
	assert(meta4.router, "feature is missing {{meta4.router}}");
	assert(meta4.config, "feature is missing {{meta4.config}}");
	assert(meta4.vents, "feature is missing {{meta4.vents}}");

    // we need to find lots of files ... so, are we correctly configured?
	assert(feature, "feature is missing {{feature}}");

// =============================================================================
	var router = express.Router(), config = meta4.config;

    meta4.app.use(router);

    // configure UX
    feature = _.extend({
        path: "/ux",
        order: 40,
        modelPath: "/models",
        home: __dirname+"/../static/",
        crud: {},
        paths: {
            models: config.home+"/models",
            data: config.home+"/data",
            templates: config.home+"/templates/client",
            scripts: config.home+"/scripts",
            views: config.home+"/views"
        }
    }, feature);

    // CRUD path for UX
    feature.crud = feature.crud || self.__features.crud.path;

    var DEBUG = feature.debug || false;

// =============================================================================

    assert(feature.home, "feature is missing {{feature.ux}}");
    assert(feature.path, "feature is missing {{feature.path}}");
    assert(feature.paths, "feature is missing {{feature.paths}}");
    assert(feature.paths.models, "feature is missing {{paths.models}}");
    assert(feature.paths.views, "feature is missing {{paths.views}}");
    assert(feature.paths.templates, "feature is missing {{paths.templates}}");
    assert(feature.paths.scripts, "feature is missing {{paths.scripts}}");
    assert(feature.modelPath, "feature is missing {{paths.modelPath}}");

// =============================================================================

	// cache UX definitions
	self.cache = helpers.mvc.reload.all(feature);

    // simplify client-side meta-data
    _.each(self.cache.models, function(model) {
        self.cache.models[model.id]= _.pick(model, [ "id", "label", "collection", "schema",
            "isServer", "isClient", "can", "prefetch", "debug", "idAttribute", "type", "defaults" ]);
    });

	debug("UX path: ", feature.path, _.keys(self.cache) );

    // server UX definitions
    router.get(feature.path+"/:id?", function(req, res) {

        var port = req.get("X-Forwarded-Port") || req.connection.localPort;
        var host = req.get("X-Forwarded-IP") || req.protocol+"://"+req.hostname;

debug("GET UX: ", req.path, " -> ", host, port   );

        // re-cache
	    var recipe = _.extend({}, self.cache);

	    // server-side features
	    recipe.server = {};
	    recipe.server.socketio = meta4.io?{ enabled: true }:{ enabled: false };
	    recipe.server.remote = meta4.router?{ enabled: true }:{ enabled: false };

	    // Localise recipe
	    recipe.home = "views:home";
	    recipe.id = req.params.id || config.name;

        recipe.url = host+":"+port+config.basePath;

	    // vent our intentions
	    meta4.vents.emit(feature.id, "home", req.user||false, recipe||false);
	    meta4.vents.emit(feature.id+":home", req.user||false, recipe||false);

	    // rewrite model URLs
	    _.each(recipe.models, function(model) {
		    model.url = model.url || recipe.url+feature.modelPath+"/"+model.id;
	    });

	    res.json(recipe);

    });

    var assetHome = paths.normalize(feature.home);
    debug("home directory: %s", assetHome);

    // embedded static UX files
    router.get(feature.path+'/*', function(req,res,next) {
        var file = paths.normalize(assetHome+req.path);
        debug("UX get: %s", file);

        var insideHomeDir = file.indexOf(assetHome);
        if (insideHomeDir == 0) {
            var stat = fs.existsSync(file);
//            console.log("UX Asset: (%s) %s -> %s -> %s %j", insideHomeDir, file, assetHome, req.path, stat)
            if (stat) {
                res.sendFile(file);
                return;
            }
            next && next();
        } else {
            res.sendStatus(404);
        }
    });
};
