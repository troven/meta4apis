
// =============================================================================
// constants

var BOOT_FILE = "meta4.json"

// =============================================================================
// framework packages

var express    = require('express');        // call express
var vhost      = require('vhost');          // name-based virtual hosting
var bodyParser = require('body-parser');    // handle POST bodies
var cookie     = require('cookie');         // cookie parser
var session    = require('express-session');// session support
var passport   = require('passport');       // passport
var assert     = require('assert');         // assertions
var crypto     = require('crypto');         // encryption
var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

var features = require('./features');       // features
var install  = require('./install');        // grunt-powered installer

var app        = express();                 // create app using express

// =============================================================================
// support POST payloads

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// =============================================================================
// Event-based API

var EventEmitter = require('events').EventEmitter;
var self = module.exports = new EventEmitter()

// =============================================================================
// process command line & boot application

self.features = features

self.cli = function() {
    var argv       = require('minimist')(process.argv.slice(2));    // cmd line arguments
    var args = argv['_']

    if (args.length==0) {
        var path = "package.json"
        fs.readFile(path, function(err,data) {
            assert(!err, "missing {{package.json}}")
            var pkg = err?{ name: "meta4demo", version: "0.0.0" }:JSON.parse(data)

            console.log("Auto Boot:", pkg.name, BOOT_FILE, "v"+pkg.version)
            install.install(pkg.name, BOOT_FILE, argv)
            self.boot(BOOT_FILE, argv)
        })
    }

    args.forEach(function(path) {
        self.boot(path+"/"+BOOT_FILE, argv)
    })
}

self.boot = function(filename, options, callback) {
    // read meta4 boot file
    fs.readFile(filename, function(error, data) {
        assert(!error, "Failed to boot:"+ filename)
        var config = JSON.parse(data);

        // merge with runtime options
        config = _.extend(config, options)
        console.log("Booting: ", filename, config, options)
        self.start( config, callback )
    });
}

// =============================================================================
// configure and launch the meta4node server
// multiple command-line arguments can instantiate virtual hosts

self.start = function(config) {

    assert(config.home, "Missing {{home}}")
    assert(config.name, "Missing {{name}}")
    assert(config.port, "Missing {{port}}")

    // boot configuration
    var SESSION_SECRET = config.salt || "SECRET_"+config.name+"_"+new Date().getTime()

    // configure paths & directories
    config.basePath = config.basePath || "/"+config.name         // set API base path - defaults to App name

    console.log("[meta4node] home directory:", config.home)

    // =============================================================================
    // configure Express Router

    var router = express.Router();              // get an instance of the express Router

    // configure Express
    app.use(config.basePath, router);

// DEPRECATED: find alternative?
// app.use(session({secret: SESSION_SECRET}));

    // configure Features
    features.configure(router, config)

    // start HTTP server
    app.listen(config.port, function() {
        // we're good to go ...
        console.log('[meta4node] '+config.name+' running on http://' + config.host+":"+config.port+config.basePath);
    });

}

