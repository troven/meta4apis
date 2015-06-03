// =============================================================================
// constants

var BOOT_FILE = "/meta4.json"

// =============================================================================
// framework packages

var express    = require('express');        // call express
var app        = express();                 // create app using express
var bodyParser = require('body-parser');    // handle POST bodies
var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

var apis     = require('./apis');           // API (route) builder

// =============================================================================
// get data from a POST

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// =============================================================================
// instantiate runtime

var router = express.Router();              // get an instance of the express Router

// process command line & boot application

var args = process.argv.slice(2)
args.forEach(function(path) {

    // =============================================================================
    // read meta4 boot file

    var filename = path+BOOT_FILE

    fs.readFile(filename, function(error, data) {

        // boot configuration
        var config = JSON.parse(data);
        var port = config.port || data.process.env.PORT || 8080; // set our port
        var apiRoot = config.basePath || "/"+config.name         // set API base path - defaults to App name
        config.homeDir = path
        console.log("[meta4node] home:", config.homeDir)
        // configure express
        app.use(apiRoot, router);

        // =============================================================================
        // process API definition

        var apiFilename = path+"/"+config.paths.api

        fs.readFile(apiFilename, function(error, data) {

            var apiConfig = JSON.parse(data);

            // build routes
            apis.build(router, config, apiConfig)

            // configure static files
            var staticPath = path+"/"+config.paths.static
            console.log("[meta4node] /static from:",staticPath)
            app.use('/static', express.static(staticPath));

            // launch HTTP server
            app.listen(port);

            // we're good to go ...
            console.log('[meta4node] '+config.name+' listening on port ' + port);
        })
    })
})
