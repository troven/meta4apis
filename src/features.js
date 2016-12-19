
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

    var feature = self.__features[options.id] = _.extend({},self.__features[options.id], options);

    if (!(feature.path === false)) {
        feature.path = feature.path || "/"+feature.id;
    }

    feature.plugin = feature.plugin || feature.id;

debug("plugin %s = %s @ %s", feature.plugin, feature.id, feature.path);
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
	return self.__features[id];
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

    if (!self.__features) throw new Error("No Features to configure")

    // merge feature with runtime options
    _.each(config.features, function(options, key) {
        options.id = options.id || key;
        debug("register: %s", options.id);
        self.register(options.id, options );
    })

    // force minimal defaults
    var i = 0;
    _.each(self.__features, function(options, key) {
        options.id = options.id || key;
        options.order = options.order?options.order:1000+(i++);
        options.basePath = options.basePath || config.basePath + (options.path || options.id );
        options.basePath = paths.normalize(options.basePath);
    });

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
            var configured = self._configureFeature(meta4, options);
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

    var _plugin = options.plugin || options.id;
    assert (!plugin || _.isString(plugin), "Invalid plugin");
    var plugin = _plugin?meta4.plugins.get(_plugin):false;

    var _options = _.extend( _.omit(plugin, ["fn"]), options );

    assert(_options, "Missing feature options");
    assert(_options.id, "Missing feature id");
    if (options.disabled) {
        debug("disabled: %s", options.id);
        return;
    }

    _options.can = _.extend( { read: true }, _options.can);

    if (_options.home) {
        helpers.files.mkdirs(_options.home);
        debug("create %s folder: %s", _options.id, _options.home);
    }

    if (_.isFunction(plugin.fn)) {
        debug("boot %s", options.id);
        plugin.fn.apply(_options, [meta4, _options]);
    } else {
        throw "meta4:oops:plugin#missing-fn()@"+_plugin;
    }

    options.configured = true;
    return _options;
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