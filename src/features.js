
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
//    feature.path = feature.path || "/"+feature.id;
    }

    feature.can = _.extend( { read: true }, feature.can);
    feature.package = feature.package || feature.id;
    feature.requires = feature.requires || './feature/'+feature.package;

    if (feature.home) {
        helpers.files.mkdirs(feature.home);
    }

console.log("Registered: %s -> %j", feature.id, feature);
    return feature;
};


self.registerAll = function(features) {
    if(!features) return false;

    _.each(features, function(feature, key) {
        self.register( feature.id || key, feature );
    });

    return self.all();
};

self.get = function(id) {
	return self.__features[id]
};

self.all = function() {
	return _.extend({}, self.__features); // immutable collection
};

/**
 * Iterates over each registered feature.
 *
 * @param meta4
 */
self.configure = function(meta4) {

	var router = meta4.router, config = meta4.config
    assert(config.home, "Feature.configure is missing {{home}}")

    if (!self.__features) throw new Error("No Features to configure")

    // merge feature with runtime options
    _.each(config.features, function(options, key) {
        options.id = options.id || key;
console.log("User Configured: %s", options.id)
        _.extend(self.__features[options.id], options);
    })

    // force minimal defaults
    _.each(self.__features, function(options, key) {
        options.id = options.id || key;
        options.order = options.order?options.order:100;
        options.basePath = config.basePath + options.path
    });

    // match longest (most specific) paths first
    var sorted = _.sortBy( _.values(self.__features) , function(a) { return a.order })

    // special feature ordering

    self._configureFeature( meta4, self.__features.assets );
	self._configureFeature( meta4, self.__features.auth );
	self._configureFeature( meta4, self.__features.brand );
	self._configureFeature( meta4, self.__features.sitemap );

    // naively prioritize routes based - shortest paths first
    _.each( sorted, function(options ) {
        var configured = self._configureFeature(meta4, options)
        if (!configured) {
            console.log("Not Configured: %s", options.id)
        } else {
            _.extend(self.__features[options.id], configured);
//            console.log("config feature: %s %j\n%j", options.id, configured, _.keys(configured.fn))
        }
    });

    return
};

/**
 *
 * @param meta4
 * @param options
 * @returns {boolean}
 * @private
 */
self._configureFeature = function(meta4, options) {
	if (!options || options.fn) return false;

    if (options.disabled) {
        console.log("[meta4] disabled: %s %s %s", options.id, options.package, options.disabled );
        return;
    }

    // if static function is declared, use it - otherwise defer loading to require()

    var pkg = options.requires
    console.log("CONFIG: %s %s %s", options.id, pkg);
    var fn   = _.isFunction(options.feature)?options: require( pkg );

    if (fn.feature) {

	    // install feature & cache result as static options i.e. pre-load expensive resources

        if (fn.install && !fn.options) {
	        fn.options = _.extend({}, options, fn.install(options, meta4.config));
//DEBUG &&
console.log("[meta4] installed: %s -> %j", options.id, options)
        } else {
console.log("[meta4] feature: %s -> %j", options.id, options)
        }

	    // configure feature ... attach routers / request handlers
        try {

            var public_fn = fn.feature(meta4, options) || fn;
            options._isConfigured = true;
            options.fn = public_fn
            return options;
        } catch(e) {
DEBUG && console.log("Feature Failed", options.package, e);
	        throw e
        }
    } else {
DEBUG && console.warn("skip feature: ", options.id, "@", pkg)
        return options;
    }
};

self.teardown = function(options) {
    var fn   = self.__features[options.package] || require(options.requires);
    if (fn.feature && fn.teardown) {
        fn.teardown(options)
    }

};