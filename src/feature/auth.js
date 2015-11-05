var self = module.exports

// =============================================================================
// framework packages

var _               = require('underscore');     // collections helper
var express         = require('express');        // call express
var passport        = require('passport')
var assert          = require('assert');         // assertions

// =============================================================================
// meta4 packages

// =============================================================================

// Passport Authentication Strategies

var LinkedInStrategy    = require('passport-linkedin'),
	GoogleStrategy      = require('passport-google'),
	FacebookStrategy    = require('passport-facebook'),
    LocalStrategy   = require('passport-local').Strategy;

var hbs                 = require('express-handlebars');

// =============================================================================

self.feature = function(meta4, feature) {

	// Sanity Checks
	assert(meta4,       "feature missing {{meta4}}")
	assert(meta4.router,"feature missing {{meta4.router}}")
	assert(meta4.config,"feature missing {{meta4.config}}")
	assert(meta4.vents, "feature missing {{meta4.vents}}")
    assert(hbs,         "feature missing handlebars")

//	assert(meta4.config.basePath, "feature missing {{meta4.basePath}}")

//	assert(feature.path, "feature missing {{feature.path}}")

	// =============================================================================

	var config = meta4.config

	var DEBUG = feature.debug || false

	if (self._isInstalled) {
		console.log("Skip re-init AUTH")
		return
	}
	self._isInstalled = true

    // Feature Defaults
    feature = _.extend({
        disabled: true,
        order: 30,
        path: "",
        paths: {
            index:  "/admin.html",
            home:   "/home",
            login:  "/login",
            logout: "/logout",
            signup: "/signup",
            forgot: "/forgot"
        }
    }, feature);

    console.log("Auth Paths: %s -> %j", feature.path, feature.paths);

    var basePath = config.basePath
    var failureFlash = false
    var redirectOptions = {
        signupRedirect: basePath+feature.paths.signup,
        successRedirect: basePath+feature.paths.home,
        failureRedirect: basePath+feature.paths.login,
        failureFlash: failureFlash
    }

    DEBUG&&console.log("login paths: %j", redirectOptions)

    // =============================================================================
	// Manage session with Passport

    var router = meta4.router || express.Router();

    router.use(passport.initialize());
    router.use(passport.session());
    meta4.app.use(feature.path, router);

    console.log("Authenticate: %s", feature.path)

	// CRUD-based Authentication

    var collection = feature.collection || "meta4users";

	var strategy = new LocalStrategy(
		function(username, password, done) {

            var models = meta4.features.get("crud").fn;

			// Identify & retrieve user
			var user = { username: username, password: password }

            models.execute("find", collection, user , function(found) {
				if (!found.data || !found.data.roles || found.data.password!=user.password) {
					return done("not authenticated: "+username);
				}
				return done(null, found.data);
			})
		}
	)

	passport.use(strategy);

	passport.serializeUser(function(user, done) {
		done(null, user);
	});

	passport.deserializeUser(function(user, done) {
		done(null, user);
	});

	// =============================================================================
	/* Resource Protection Closures */

    function NotLoggedIn(req, res) {
        req.session.redirectTo = req.originalUrl;
//console.log("NotLoggedIn: %s -> %s", req.session.redirectTo, req.originalUrl)
        res.redirect(redirectOptions.failureRedirect);
    }

    function EnsureAuthenticated(req, res, next) {
        var _isAuthenticated = req.isAuthenticated();
//console.log("Ensure Auth: %s -> %s", req.path, _isAuthenticated);
		if (_isAuthenticated) {
            req.session.redirectTo = false;
            next && next();
        }
		else {
            NotLoggedIn(req,res);
        }
		return _isAuthenticated;
	}

	function EnsureAuthorized(options, req, res, next) {
		if (options && options.roles) {

			if (!req.user.roles) {
				// no user roles - denied
				res.redirect(redirectOptions.failureRedirect)
				return false
			}

			var rolesAllowed = CompareRoles(options.roles, req.user.roles)
DEBUG&&console.log("auth roles", rolesAllowed, options.roles, req.user.roles)

			if ( !rolesAllowed ) {
				// no valid roles - denied
				res.redirect(redirectOptions.failureRedirect)
				return false
			}
		}
        // protected by roles - allowed
		next && next()
		return true
	}

	var CompareRoles = function(a,b) {
		for(v in a) {
			if (b[v]) return true;
		}
		return false;
	}

	// =============================================================================
    // AUTHORISATION ROUTES

	// USER HOME PAGE

	/* Handle home GET - if logged-in */
	router.get(feature.paths.home, function(req, res, next) {
console.log("HOME")
		var isLoggedIn = EnsureAuthenticated(req, res);
        if (isLoggedIn) {
            res.render(redirectOptions.successRedirect.substring(1));
        }
	});

	// LOGIN / LOGOUT

	/* Handle login GET */
	router.get(feature.paths.login, function(req, res) {

		if (!req.isAuthenticated()) {
console.log("LOGIN: %s", redirectOptions.failureRedirect)
            res.render(redirectOptions.failureRedirect.substring(1), {})
		} else {
console.log("LOGGED IN: %s", redirectOptions.successRedirect)
			res.redirect(redirectOptions.successRedirect);
		}
	});

    /* Handle Login POST */
    router.post(feature.paths.login, passport.authenticate('local', redirectOptions), function(req, res) {

	    // vent our intentions
	    meta4.vents.emit(feature.id, "login", req.user);
	    meta4.vents.emit(feature.id+":login", req.user);

        var redirectTo = req.session.redirectTo || redirectOptions.successRedirect;
        console.log("LOGIN [post]: %s", redirectTo)
        res.redirect(redirectTo);
    });

	/* Handle Logout GET */
	router.get(feature.paths.logout, function(req, res) {

		// vent our intentions
		meta4.vents.emit(feature.id, "logout", req.user);
		meta4.vents.emit(feature.id+":logout", req.user);

        console.log("LOGOUT: %s", redirectOptions.failureRedirect)
		req.logout();
		res.redirect(redirectOptions.failureRedirect);
	});

	// SIGN-UP / FORGOT

    /* Handle Registration GET */
    router.get(feature.paths.signup, function(req, res) {
console.log("SIGN-UP")
        res.redirect(redirectOptions.signupRedirect)
    });

    /* Handle Registration POST */
    router.post(feature.paths.signup, passport.authenticate('signup', {
        successRedirect: basePath+feature.paths.home,
        failureRedirect: basePath+feature.paths.signup,
        failureFlash : failureFlash
    }));

    /* Handle Forgot POST */
    router.post(feature.paths.forgot, passport.authenticate('local', {
        successRedirect: basePath+feature.paths.home,
        failureRedirect: basePath+feature.paths.forgot,
	    failureFlash: failureFlash
    }));


	// =============================================================================
	// PROTECT ROUTES

    var ProtectRoute = function(options, key) {
        // a protected resource defaults to a 'user' role
        var options = options===true?{ path: key, roles: ['user'] }:options;
        var path = options.path;

        // only features that have defined 'path' AND 'roles'
        if (!options.roles || !path) {
            console.log("[meta4auth] Not Protecting: %s -> %j", path, options)
            return;
        }

        console.log("[meta4auth] Protecting: %s -> %j", path, options)

        router.use(path, function(req,res,next) {
            console.log("PROTECTED: %s @ %s -> %j", path, req.path, options.roles);
            EnsureAuthenticated(req, res, false) && EnsureAuthorized(options, req, res, next)
        })
    }

    /*  authenticate and/or authorize protected resources */

    _.each(meta4.features.all(), ProtectRoute)
	_.each(feature.protected, ProtectRoute )

}
