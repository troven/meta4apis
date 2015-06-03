// =============================================================================
// constants

var BOOT_FILE = "/meta4.json"

// =============================================================================
// framework packages

var express    = require('express');        // call express
var app        = express();                 // create app using express
var vhost      = require('vhost');          // name-based virtual hosting
var connect    = require('connect');        // 
var bodyParser = require('body-parser');    // handle POST bodies
var passport   = require('passport');       // passport
var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

var util     = require('./util');           // utilities
var apis     = require('./apis');           // API (route) builder
var login    = require('./login');          // login

// =============================================================================
// support POST payloads

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


console.log("Home: ",__dirname)

// =============================================================================
// instantiate runtime

// process command line & boot application
var args = process.argv.slice(2)
args.forEach(function(path) {

    // =============================================================================
    // read meta4 boot file

    var filename = path+BOOT_FILE

    fs.readFile(filename, function(error, data) {

        // boot configuration
        var config = JSON.parse(data);
        config.port = config.port || data.process.env.PORT || 8080; // set our port
        var apiRoot = config.basePath || "/"+config.name         // set API base path - defaults to App name
        config.homeDir = path
        console.log("[meta4node] home:", config.homeDir)

        // =============================================================================
        // Configure routes

        var router = express.Router();              // get an instance of the express Router

        // Authentication by Passport
        app.use(passport.initialize());
        app.use(passport.session());

        // configure Express
        app.use(apiRoot, router);

        // authentication

        app.post('/login', passport.authenticate('local',
            { successRedirect: '/', failureRedirect: '/login', failureFlash: true }
        ) );

        // static files
        var staticPath = path+"/"+config.paths.static
        router.use('/static', express.static(staticPath));

        router.get('/static/*', function(req,res,next) {
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


        console.log("[meta4node] "+config.basePath+"/static from:",staticPath)

        // =============================================================================
        // read and install API definitions

        var apiFilename = path+"/"+config.paths.apis
        var files = util.findFiles(apiFilename)

        // feature paths
        config.features = config.features || {
            ux: "/ux",
            models: "/models"
        }

        // build API routes
        _.each(files, function(data, file) {
            apis.build(router, config, JSON.parse(data) )

        })

        // launch HTTP server
        app.listen(config.port);

        // we're good to go ...
        console.log('[meta4node] '+config.name+' listening on port ' + config.port);
    })
})
