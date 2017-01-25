var self = module.exports

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var paths      = require('path');           // file path helper
var assert     = require('assert');         // assertions
var express    = require('express');        // call express
var _          = require('underscore');     // collections helper
var debug      = require('../debug')("ux"); // debug
var helpers    = require("../helpers");

// =============================================================================
// meta4 packages


// =============================================================================
// Configure UX - load recipes from local files

exports.fn = function(meta4, feature) {

	// Sanity Checks
    assert(meta4, "feature is missing {{meta4}}");
	assert(meta4.router, "feature is missing {{meta4.router}}");
	assert(meta4.config, "feature is missing {{meta4.config}}");
	assert(meta4.vents, "feature is missing {{meta4.vents}}");

    var helpers     = require('meta4common');      // utilities
    var meta4ux     = meta4.plugins.get("meta4ux");
    assert(meta4ux, "Missing meta4ux widgets");

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
        home: meta4ux.resolve(),
        crud: {},
        paths: {
            models: paths.normalize(config.home+"/models"),
            data: paths.normalize(config.home+"/data"),
            templates: paths.normalize(config.home+"/templates/client"),
            scripts: paths.normalize(config.home+"/scripts"),
            views: paths.normalize(config.home+"/views")
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

//	debug("UX path: ", feature.path, _.keys(self.cache) );

    var assetHome = paths.resolve(paths.normalize(feature.home));
    debug("home: %s", assetHome);
    var defaultHome = paths.normalize(meta4ux.resolve());

    // server UX definitions
    router.get(feature.path+"/view/:id?", function(req, res) {

        var port = req.get("X-Forwarded-Port") || req.connection.localPort;
        var host = req.get("X-Forwarded-IP") || req.protocol+"://"+req.hostname;

        // reload app cache
        if (feature.reload) {
            debug("reload '%s' view", req.params.id );
            self.cache = helpers.mvc.reload.all(feature);
        }

        var recipe = _.extend({}, self.cache);

	    // server-side features
	    recipe.server = {};
	    recipe.server.socketio = meta4.io?{ enabled: true }:{ enabled: false };
	    recipe.server.remote = meta4.router?{ enabled: true }:{ enabled: false };

	    // Localise recipe
	    recipe.home = "views:home";
	    recipe.id = req.params.id || config.name;

        recipe.url = (config.url || host+":"+port)+config.basePath;

        // default user
        recipe.user = { id: false, name: "Anonymous" };

        // filter server-side config
        _.each(recipe.models, function(model) {
            _.extend(model, model.client);
            delete model.server;
            delete model.adapter;
            delete model.client;
        });

//        feature.debug && debug("view: %j", recipe);

        // vent our intentions
	    meta4.vents.emit(feature.id, "home", req.user||false, recipe||false);
	    meta4.vents.emit(feature.id+":home", req.user||false, recipe||false);

	    // rewrite model URLs
	    _.each(recipe.models, function(model) {
		    model.url = model.url || recipe.url+feature.modelPath+"/"+model.id;
	    });

	    res.json(recipe);

    });

    router.get(feature.path+'/*', function(req,res,next) {

        var file = paths.normalize(assetHome+req.path);
        if ( helpers.files.exists(file) ) {
            //feature.debug &&
            DEBUG && debug("local: %s", file);
            res.sendFile(file);
            return;
        }
        file = paths.normalize(defaultHome+req.path);
        if ( helpers.files.exists(file) ) {
            //feature.debug &&
            DEBUG && debug("default: %s", file);
            res.sendFile(file);
            return;
        }

        next && next();

    });
};
