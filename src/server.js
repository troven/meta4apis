// =============================================================================
// constants

var BOOT_FILE = "/meta4.json"

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

var util     = require('./util');           // utilities
var features = require('./features');       // features

// =============================================================================
// web server initialization

var app        = express();                 // create app using express

// =============================================================================
// support POST payloads

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// =============================================================================
// instantiate runtime

// process command line & boot application
var args = process.argv.slice(2)
args.forEach(function(path) {

    // =============================================================================
    // configure and launch the meta4node server
    // multiple command-line arguments can instantiate virtual hosts

    var filename = path+BOOT_FILE

    // read meta4 boot file
    fs.readFile(filename, function(error, data) {

        // boot configuration
        var config = JSON.parse(data);
        var SESSION_SECRET = config.salt || "SECRET_"+config.name

        // http configuration
        config.port = config.port || data.process.env.PORT || 8080;  // set our port

        // configure paths & directories
        config.basePath = config.basePath || "/"+config.name         // set API base path - defaults to App name
        config.homeDir = path

        console.log("[meta4node] home directory:", config.homeDir)

        // =============================================================================
        // configure Express Router

        var router = express.Router();              // get an instance of the express Router

        // configure Express
        app.use(config.basePath, router);
//        app.use(session({secret: SESSION_SECRET}));

        console.log("[meta4node] initialize routes")

        // =============================================================================
        // application static files

        assert(config.paths.static, "{{static}} path is missing")
        var staticPath = path+"/"+config.paths.static
        router.use('/', express.static(staticPath));

        // embedded static files
        router.get('/*', function(req,res,next) {
            var path = req.params[0];
            if (path.indexOf('..') === -1) {
                var file = __dirname + '/static/' + path
                var stat = fs.existsSync(file)
                if (stat) return res.sendFile(file);
            } else {
                res.status = 404;
                return res.send('Not Found');
            }
            next()
        });

        // TODO: support inferred 'index.html' route
        console.log("[meta4node] "+config.basePath+"/static from:",staticPath)

        // configure Features
        features.configure(router, config)

        // start HTTP server
        app.listen(config.port, function() {
            // we're good to go ...
            console.log('[meta4node] '+config.name+' running on http://' + config.host+":"+config.port+config.basePath);
        });

    })
})
