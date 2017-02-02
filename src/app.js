var express    = require('express');        // expressJS
var vhost      = require('vhost');          // name-based virtual hosting
var bodyParser = require('body-parser');    // handle POST bodies
var cookies    = require('cookie-parser');  // cookie parser
var session    = require('express-session');// session support
var methodz    = require('method-override');// method override
var _          = require('underscore');     // collections helper
var debug      = require("./debug")("app");
var assert     = require("assert");

module.exports = function(config) {
    assert(config, "Missing config");

    // boot configuration
    var SESSION_SECRET = config.salt || config.name+"_"+new Date().getTime();
    var app             = express();                    // create app using express

    _.defaults(config, require("./defaults"));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

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

    debug("USE: %s", config.basePath);

    return {
        app: app,
        router: router,
        Router: function(path) {
            var router = express.Router();
            app.use(router);
            debug("New router");
            return router;
        },
        express: express
    };
}