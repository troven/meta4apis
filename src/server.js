// =============================================================================
// constants

// =============================================================================
// framework packages

var assert = require('assert'); // assertions
var crypto = require('crypto'); // encryption
var fs = require('fs'); // file system
var paths = require('path'); // file path helper
var _ = require('underscore'); // collections helper
var __ = require('underscore-deep-extend');
var debug = require("./debug")("server");
var Emitter = require('events').EventEmitter;
var hbs = require('express-handlebars');

// =============================================================================
// meta4 packages

var meta4plugins = require("./plugins");

// =============================================================================
// support POST payloads

// =============================================================================
// Event-based API

var self = module.exports = new Emitter();

// =============================================================================
// process command line & boot application

self.features = require('./features');
self.plugins = require("./Registry")("plugins");

// hack to expose utils

self.utils = {
	// "express": express,
	"hbs": hbs,
	"_": _,
	"__": __
};


_.mixin({
	deepExtend: __(_)
});

self.require = require("./requires");

self.boot = function (filename, options, callback) {

	// read meta4 boot file
	fs.readFile(filename, function (error, data) {
		assert(!error, "Failed to boot:" + filename);
		var config = JSON.parse(data);
		config.home = paths.normalize(paths.dirname(filename) + "/" + config.home);

		// merge with runtime options
		self._config = _.extend(config, options);
		debug("booting : %s", paths.normalize(filename));
		callback && callback(null, self._config)
	});

	_.each(meta4plugins, function (v, k) {
		self.plugins.register(k, v);
	})
};

/**
 * configure and launch the meta4apis server
 * multiple command-line arguments can instantiate virtual hosts
 *
 * @param config        meta4.json object
 * @param callback      onStart callback
 * @returns {*}
 */

self.start = function (config, callback) {

	assert(config.home, "Missing {{home}}");
	assert(config.name, "Missing {{name}}");
	assert(config.port, "Missing {{port}}");

	debug("home dir: %s", config.home);

	// configure paths & directories
	config.basePath = config.basePath || "";
	config.url = config.url || config.protocol+"://"+config.host + ":" + config.port + paths.normalize(config.basePath);
    debug("base URL: %s", config.url);

	// environmentally friendly
	process.title = config.name + " on port " + config.port;
	process.on('SIGINT', function () {
		debug("\n[meta4] terminated by user ... au revoir");
		self.shutdown(config);
	});

	var app = require("./app")(config);

	// configure meta4 features
	var meta4 = {
		app: app.app,
		router: app.router,
		config: config,
		vents: self,
		features: self.features,
		plugins: self.plugins
	};

	var plugins = self.plugins.boot(meta4);
	debug("plugins activated: %j", _.keys(plugins));

	self.featured = self.features.boot(meta4, plugins);

	debug("configured features: %j", _.keys(self.featured));

	var httpd = require('http').Server(meta4.app); // create app server

	// start HTTP server
	httpd.listen(config.port, function () {
		// we're good to go ...
		console.log("----------------------------------------");
		console.log("NodeJS  :", process.version, "(" + process.platform + ")");
		console.log("module  :", config.name, "v" + config.version || "0.0.0");
		var uxPath = self.featured.ux.path + "/";
		console.log('[meta4] login ->: ' + paths.normalize(config.url + uxPath), "\n");

		self.emit("start", config);
		callback && callback(null, config)
	});

	// TODO: fix client-side bug first
	//    io.on('connection', function (socket) {
	//        debug("socket io")
	//        socket.emit("hello");
	//
	//        setInterval(function() {
	//            socket.emit("hello");
	//        },5000)
	//    });
};

self.shutdown = function () {

	_.each(self.featured, function (feature, key) {
		feature.teardown && feature.teardown(feature, self);
	});

	self.emit("shutdown");
	process.exit(0);
};
