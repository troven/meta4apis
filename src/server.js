
// =============================================================================
// constants

var BOOT_FILE = "meta4.json"

// =============================================================================
// framework packages

var express    = require('express');        // expressJS
var vhost      = require('vhost');          // name-based virtual hosting
var bodyParser = require('body-parser');    // handle POST bodies
var cookies    = require('cookie-parser');  // cookie parser
var session    = require('express-session');// session support
var methodz    = require('method-override');// method override
var assert     = require('assert');         // assertions
var crypto     = require('crypto');         // encryption
var fs         = require('fs');             // file system
var paths      = require('path');           // file path helper
var _          = require('underscore');     // collections helper
var __         = require('underscore-deep-extend');
var debug      = require("./debug")("node:server");
var Emitter    = require('events').EventEmitter;

// =============================================================================
// meta4 packages

var features    = require('./features');        // features
var install     = require('./install');         // grunt-powered installer

// server bootstrap
var app         = express();                    // create app using express
var httpd       = require('http').Server(app);  // create app server
var io          = false; // require('socket.io')(httpd);  // networked events
var hbs         = require('express-handlebars');

// =============================================================================
// support POST payloads

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// =============================================================================
// Event-based API

var self = module.exports = new Emitter();

// =============================================================================
// process command line & boot application

self.features = features;
self.__plugins = [];

// hack to expose utils

self.utils = {
    "express": express,
    "hbs": hbs,
    "_": _,
    "__": __
};


_.mixin( { deepExtend: __(_) } );

self.announce = function() {
    debug("                _        _  _\n\
 _ __ ___   ___| |_ __ _| || |\n\
| '_ ` _ \\ / _ \\ __/ _` | || |_\n\
| | | | | |  __/ || (_| |__   _|\n\
|_| |_| |_|\\___|\\__\\__,_|  |_|");

    var meta4node_pkg = require('../package.json');
    console.log("\tv%s by %s\n", meta4node_pkg.version, meta4node_pkg.author)

};

self.cli = function(cb_features) {
    var argv       = require('minimist')(process.argv.slice(2));    // cmd line arguments
    var args = argv['_'];

    if (args.length==0) {
        var path = "package.json";
        fs.readFile(path, function(err,data) {
            assert(!err, "missing {{package.json}}");
            var pkg = JSON.parse(data)
            assert(pkg.name, "Missing package name");
            install.install(pkg.name, BOOT_FILE, argv);
            self.announce();
            self.boot(BOOT_FILE, _.extend({},argv,pkg), function(err, config) {
	            if (cb_features) {
		            cb_features(err, config, function(features) {
			            self.start(features)
		            })
	            } else {
		            self.start(config)
	            }
            } )
        })
    }

    if (args.length>0) {
        self.announce();
        args.forEach(function(path) {
            self.boot(path+"/"+BOOT_FILE, argv, function(err, config) {
	            self.start(config, callback)
            })
        })
    }
};

self.require = function(name, required) {
  try {
      // built-in
      var path ="./feature/"+name;
      var rkg = require(path);
      debug("meta4 built-in: %s -> %s", name, path);
      return rkg;
  }  catch(e) {
      try {
          // meta4 packaged
          var path = process.cwd()+"/node_modules/meta4"+name;
          var rkg = require(path);
          debug("meta4 pkg: %s -> %s", name, path);
          return rkg;
      }  catch(e) {
          try {
               var path = process.cwd()+"/node_modules/"+name;
              var rkg = require(path);
              debug("local pkg: %s -> %s", name, path);
              return rkg;
          } catch(e) {
              if (required) {
                  return required(name);
              }
              throw new Error(e);
          }
      }
  }
};

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
 * configure and launch the meta4node server
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

    // boot configuration
    var SESSION_SECRET = config.salt || config.name+"_"+new Date().getTime();

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

	// Cookies
	app.use( cookies(SESSION_SECRET) );

	// JSON Body Parser
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());

	// Sessions
	app.use(session(_.extend({
		secret: SESSION_SECRET,
		name: "meta4"+config.name,
		proxy: true,
		resave: true,
		saveUninitialized: true
	},config.session)));

	// Useful Upgrades
	app.use(require('flash')());
	app.use(methodz('X-HTTP-Method-Override'));

//    app.use( require("compress")() );
//	  app.use( express.favicon(config.brand.favicon || "./src/public/brand/favicon.png") )

    // get an instance of the express Router
    var router = express.Router();

    // configure Express Router
	app.use(config.basePath, router);

    debug("router: %s", config.basePath);

    // configure meta4 features
    var meta4 = { app: app, router: router, io: io, config: config, vents: self, features: self.features, require: self.require };

    // register deferred plugins - they need an initialised meta4 config
    _.each(self.__plugins, function(plugin) {
        var options = plugin.fn(meta4);

        if (!options || !options.features) throw "Plugin returned no features"
        features.registerAll( options.features );
    })
    debug("registered plugins ...");

    features.configure(meta4);
    debug("configured features ...");

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
