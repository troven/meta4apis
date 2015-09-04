
// =============================================================================
// framework packages

var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var paths      = require('path');           // file path helper
var express    = require('express');        // call express

// =============================================================================
// meta4 packages

var helpers     = require('meta4helpers');      // utilities

// =============================================================================
// Event-based API

var self = module.exports

// =============================================================================

var DEBUG       = false;
self.__features = {};

// allow 3rd party features to use internal resources

self.register = function(key, options) {
	if (!key || !options) throw new Error("Feature can't be registered: "+key);

    options.id = options.id || key

    options.path = options.path || "/"+options.id

    options.package = options.package || options.id
    options.requires = options.requires || './feature/'+options.package

    if (options.home) {
        helpers.files.mkdirs(options.home)
    }

	return self.__features[options.id] = _.extend({}, self.__features[options.id], options)
}


self.registerAll = function(features) {
    if(!features) return false;

    _.each(features, function(feature, key) {
        self.register(feature.id || key, feature);
    })

    return self.all();
}

self.get = function(id) {
	return self.__features[id]
}

self.all = function() {
	return _.extend({}, self.__features) // immutable collection
}

self.defaults = function(config) {
    assert(config.home, "Feature.defaults is missing {{home}}")

    var features = config.features = config.features || {}

    // configure API
    features.apis = _.extend({
        path: "/api",
        home: config.home+"/api"
    }, features.apis)

    // configure CRUD
    features.crud = _.extend({
        path: "/models",
        requires: "./feature/crud",
        home: config.home+"/models/meta",
        data: config.home+"/models/data",
    }, features.crud)


    // configure UX
    features.ux = _.extend({
        path: "/ux",
	    modelPath: "/models",
        requires: "meta4ux",
        home: config.home,
        paths: {
            models: config.home+"/models/meta",
            data: config.home+"/models/data",
            templates: config.home+"/templates/client",
            scripts: config.home+"/scripts",
            views: config.home+"/views"
        }
    }, features.ux)
    features.ux.crud = features.crud.path

    // configure Assets
    features.assets = _.extend({
        path: "/",
        home: config.home+"/public"
    }, features.assets)

    // configure Pages
    features.pages = _.extend({
        path: "/page",
        home: config.home+"/templates/server"
    }, features.pages)

    // configure ClickTrack
    features.clicktrack = {
        path: "/clicktrack",
        collection: "clicktrack"
    }


    // configure Node Machines
	features.machine = _.extend({
		"path": "/do",
		"home": config.home+"/features/machines",
		"repository": "http://nodemachine.org",
		"config": {
		},
		roles: [ "user" ]
	}, features.machine)

    // configure Logins
    features.auth = _.extend({
        disabled: true,
	    crud: features.crud,
        path: "/",
        paths: {
            index:  "/",
            home:   "/home",
            login:  "/login",
            logout: "/logout",
            signup: "/signup"
        }
    }, features.auth)

    return self.registerAll(features);
}

/**
 * Iterates over each registered feature.
 *
 * @param meta4
 */
self.configure = function(meta4) {

	var router = meta4.router, config = meta4.config
    assert(config.home, "Feature.configure is missing {{home}}")

    // register default features
	var features = self.defaults(config)

    // base-path is relative
    _.each(features, function(options, key) {
	    options.basePath = config.basePath + "/"+options.path
    });

    // match longest (most specific) paths first
    var sorted = _.sortBy( _.values(features) , function(a) { return a.order?a.order:a.path.length })

    // special feature ordering

	self._configureFeature(meta4, features.auth )
	self._configureFeature(meta4, features.brand )
	self._configureFeature(meta4, features.sitemap )

    // naively prioritize routes based - shortest paths first
    _.each(sorted, function(options) {
		self._configureFeature(meta4, options)
    })

    return
}

/**
 *
 * @param meta4
 * @param options
 * @returns {boolean}
 * @private
 */
self._configureFeature = function(meta4, options) {
	if (!options || options.fn) return false;

    if (options.disabled) { console.log("[meta4] disabled:", options.package); return; }

    // if static function is declared, use it - otherwise defer loading to require()

    var pkg = options.requires || options.package
    var fn   = _.isFunction(options.feature)?options: require( pkg );

    if (fn.feature) {

	    // install feature & cache result as static options i.e. pre-load expensive resources

        if (fn.install && !fn.options) {
	        fn.options = _.extend({}, options, fn.install(options, meta4.config))
//DEBUG &&
console.log("[meta4] feature installed: %s -> %s @ %s", options.id, options.path, options.package)
        } else {
console.log("[meta4] feature: %s -> %s @ %s", options.id, options.path, options.package )
        }

	    // configure feature ... attach routers / request handlers
        try {

            var public_fn = fn.feature(meta4, options) || fn
            options.fn = public_fn

        } catch(e) {
DEBUG && console.log("Feature Failed", options.package, e)
	        throw e
        }
    } else {
DEBUG && console.warn("skip feature: ", options.id, "@", pkg)
    }
}

self.teardown = function(options) {
    var fn   = self.__features[options.package] || require(options.requires);
    if (fn.feature && fn.teardown) {
        fn.teardown(options)
    }

}