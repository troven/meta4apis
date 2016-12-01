
// =============================================================================
// constants

// =============================================================================
// framework packages

var assert     = require('assert');         // assertions
var crypto     = require('crypto');         // encryption
var fs         = require('fs');             // file system
var paths      = require('path');           // file path helper
var _          = require('underscore');     // collections helper
var __         = require('underscore-deep-extend');
var debug      = require("./debug")("server");
var Emitter    = require('events').EventEmitter;
var hbs         = require('express-handlebars');

// =============================================================================
// meta4 packages

var features    = require('./features');        // features

// =============================================================================
// support POST payloads

// =============================================================================
// Event-based API

var self = module.exports = new Emitter();

// =============================================================================
// process command line & boot application

self.features = features;
self.__plugins = [];

// hack to expose utils

self.utils = {
    // "express": express,
    "hbs": hbs,
    "_": _,
    "__": __
};


_.mixin( { deepExtend: __(_) } );

self.require = require("./requires");

self.boot = function(filename, options, callback) {

    // read meta4 boot file
    fs.readFile(filename, function(error, data) {
        assert(!error, "Failed to boot:"+ filename);
        var config = JSON.parse(data);
        config.home = paths.normalize(paths.dirname(filename)+"/"+config.home);

	    // merge with runtime options
        self._config = _.extend(config, options);
	    debug("booting : %s", paths.normalize(filename));
	    callback && callback(null, self._config)
    });
};

/**
 * Configure a Feature Machine (Node-Machine that returns a feature map)
 *
 * @param featureMachine
 * @returns {*}
 */
self.plugin = function(featureMachine) {

    if (featureMachine.fn && _.isFunction(featureMachine.fn)) {
        self.__plugins.push(featureMachine);
        return featureMachine;
    } else {
        throw new Error("Invalid Plugin")
    }

    return false;

};

/**
 * configure and launch the meta4apis server
 * multiple command-line arguments can instantiate virtual hosts
 *
 * @param config        meta4.json object
 * @param callback      onStart callback
 * @returns {*}
 */

self.start = function(config, callback) {

    assert(config.home, "Missing {{home}}");
    assert(config.name, "Missing {{name}}");
    assert(config.port, "Missing {{port}}");

    debug("home dir: %s", config.home);

    // configure paths & directories
    config.basePath = config.basePath || "";
	config.url = config.url || config.host+":"+config.port+config.basePath;

    // environmentally friendly
    process.title = config.name + " on port "+config.port;
	process.on( 'SIGINT', function() {
		debug("\n[meta4] terminated by user ... au revoir" );
		self.shutdown(config);
	});
    debug("sigint registered");

    var app = require("./app")(config);

    // configure meta4 features
    var meta4 = { app: app.app, router: app.router, config: config, vents: self, features: self.features, require: self.require };

    // register deferred plugins - they need an initialised meta4 config
    _.each(self.__plugins, function(plugin) {
        var options = plugin.fn(meta4);

        if (!options || !options.features) throw "Plugin returned no features"
        features.registerAll( options.features );
    })
    debug("registered plugins ...");

    features.configure(meta4);
    debug("configured features ...");

    var httpd       = require('http').Server(meta4.app);  // create app server

	// start HTTP server
    httpd.listen(config.port, function() {
        // we're good to go ...
        console.log("----------------------------------------");
        console.log("NodeJS  :", process.version, "("+process.platform+")");
        console.log("module  :", config.name, "v"+config.version || "0.0.0");
        console.log('[meta4] login ->: http://' + config.url, "\n");

	    self.emit("start", config);
	    callback && callback(null, config)
    });

	// TODO: fix client-side bug
//    io.on('connection', function (socket) {
//        debug("socket io")
//        socket.emit("hello");
//
//        setInterval(function() {
//            socket.emit("hello");
//        },5000)
//    });
};

self.shutdown = function(config) {
	self.emit("shutdown:"+config.name, config);

	_.each(config.features, function(feature, key) {
		features.teardown(feature)
	});

	self.emit("shutdown", config);

	process.exit(0);
};
