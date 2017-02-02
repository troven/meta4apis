
// =============================================================================
// framework packages

var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var paths      = require('path');           // file path helper
var express    = require('express');        // call express
var debug      = require("./debug")("features");

// =============================================================================
// meta4 packages

var helpers     = require('meta4common');      // utilities

// =============================================================================
// Event-based API

var self = module.exports;

// =============================================================================

var DEBUG       = false;
self.__features = {};

// allow 3rd party features to use internal resources

self.register = function(key, options) {
    if (_.isArray(key)) return self.registerAll(key);
	if (!key || !options) throw new Error("Feature can't be registered: "+key);

    options.id = options.id || key;

    var feature = self.__features[options.id] = _.defaults(options, self.__features[options.id]);

    if (!(feature.path === false)) {
        feature.path = feature.path || "/"+feature.id;
    }

    feature.plugin = feature.plugin || feature.id;

debug("plugin %s = %s @ %s -> %j", feature.plugin, feature.id, feature.path, _.keys(feature));
    return feature;
};


self.registerAll = function(features) {
    if(!features) return self.all();

    _.each(features, function(feature, key) {
        self.register( feature.id || key, feature );
    });

    return self.all();
};

self.get = function(id) {
	var feature = self.__features[id];
    assert(feature, "Missing feature: "+id);
    return feature;
};

self.all = function() {
	return _.extend({}, self.__features); // immutable collection
};

/**
 * Iterates over each registered feature.
 *
 * @param meta4
 */
self.boot = function(meta4, plugins) {
    assert(meta4, "Missing {{meta4}}");
    plugins = plugins || {};

	var config = meta4.config;
    assert(config.home, "Feature.configure is missing {{home}}")
    assert(config.basePath, "Missing config.basePath");

    if (!self.__features) throw new Error("Features not initialized")
    if (!config.features) throw new Error("No features - not a viable app")

    // register feature from config

    _.each(config.features, function(options, key) {
        options.id = options.id || key;
        debug("register: %s", options.id);
        self.register(options.id, options );
    })

    // match longest (most specific) paths first
    var sorted = _.sortBy( _.values(self.__features) , function(a) { return a.order })

    // special feature ordering

    self._configureFeature( meta4, self.__features.assets );
	self._configureFeature( meta4, self.__features.auth );
	self._configureFeature( meta4, self.__features.brand );
	self._configureFeature( meta4, self.__features.sitemap );

    // naively prioritize routes based - shortest paths first
    _.each( sorted, function(options) {
        if (!options.configured) {
            self._configureFeature(meta4, options);
        }
    });

    return self.__features;
};

/**
 *
 * @param meta4
 * @param options
 * @returns {boolean}
 * @private
 */
self._configureFeature = function(meta4, options) {
    assert(meta4, "Missing meta4 core");
    assert(meta4.plugins, "Missing meta4 plugins");
    if (!options) return;
//    assert(options, "Missing feature config");

    options.order = options.order?options.order:1000;
    options.basePath = options.basePath || meta4.config.basePath + (options.path || options.id );
    options.basePath = paths.normalize(options.basePath);

    var _plugin = options.plugin || options.id;
    assert (!plugin || _.isString(plugin), "Invalid plugin");
    var plugin = _plugin?meta4.plugins.get(_plugin):false;
    assert(plugin, "Feature is not a plugin: "+_plugin);

    assert(options, "Missing feature options");
    assert(options.id, "Missing feature id");
    if (options.disabled) {
        debug("disabled: %s", options.id);
        return;
    }

    options.can = _.extend( { read: true }, options.can);

    if (options.home) {
        helpers.files.mkdirs(options.home);
        debug("create %s folder: %s", options.id, options.home);
    }

    // keep reference to our construction / default instance

    if (_.isFunction(plugin.fn)) {
        var configured = plugin.fn.apply(options, [meta4, options]);
        _.extend(options, configured );
        debug("boot %s -> %j", options.id, _.keys(options));
    } else {
        throw "meta4:oops:plugin#missing-fn()@"+_plugin;
    }

    options.configured = true;
    return options;
};

self.teardown = function(options) {
    if (!options) {
        return;
    }

    var fn   = self.__features[options.package] || (options.requires?require(options.requires):false);
    if (fn.feature && fn.teardown) {
        debug("teardown: %j", options);
        fn.teardown(options)
    }

};