var self = module.exports

// =============================================================================
// framework packages

var _               = require('underscore');     // collections helper
var passport        = require('passport')
var LocalStrategy   = require('passport-local').Strategy
var assert          = require('assert');         // assertions

// =============================================================================
// meta4 packages

// =============================================================================

// Passport Authentication Strategies

var LinkedInStrategy = require('passport-linkedin'),
	GoogleStrategy = require('passport-google'),
	FacebookStrategy = require('passport-facebook');

// =============================================================================

self.feature = function(meta4, feature) {

	// Sanity Checks
	assert(meta4,       "feature missing {{meta4}}")
	assert(meta4.router,"feature missing {{meta4.router}}")
	assert(meta4.config,"feature missing {{meta4.config}}")
	assert(meta4.vents, "feature missing {{meta4.vents}}")

	assert(meta4.config.basePath, "feature missing {{meta4.basePath}}")

	assert(feature.path, "feature missing {{feature.path}}")
	assert(feature.crud, "feature missing {{feature.crud}}")

	// =============================================================================

	var router = meta4.router, config = meta4.config

	var paths = _.defaults(feature.paths, {
		home: "/pages/home",
        login: "/login",
		logout: "/logout",
        signup: "/signup",
        forgot: "/forgot"
    })

	var DEBUG = feature.debug || false

	if (self._isInstalled) {
		console.log("Skip re-init AUTH")
		return
	}
	self._isInstalled = true

	// =============================================================================
	// Manage session with Passport

	router.use(passport.initialize());
	router.use(passport.session());

	// CRUD-based Authentication

	var crudFactory    = require("./crud")
	crudFactory.feature(meta4, _.extend({}, config.features.crud, feature.crud))

	var crud = crudFactory.models["meta4users"]
	if (!crud) throw new Error("Auth missing [meta4users] model")
	var Users = crudFactory.CRUD(crud);

	var strategy = new LocalStrategy(
		function(username, password, done) {

			// Identify & retrieve user
			var user = { username: username, password: password }

			Users.find(user, function(found) {
				if (!found.data || !found.data.roles) {
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

	function EnsureAuthenticated(req, res, next) {
		if (req.isAuthenticated()) next && next();
		else res.redirect(redirectOptions.failureRedirect);
		return req.isAuthenticated();
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
				res.redirect(redirectOptions.successRedirect)
				return false
			}
			// protected by roles - allowed
		}
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

	var basePath = config.basePath
	var failureFlash = false
	var redirectOptions = {
		successRedirect: basePath+paths.home,
		failureRedirect: basePath+paths.login,
		failureFlash: failureFlash
	}

DEBUG&&console.log("login paths:", basePath, paths)

	// USER HOME PAGE

	/* Handle home GET - if logged-in */
	router.get(paths.home, function(req, res, next) {
		EnsureAuthenticated(req, res, next);
	});

	// LOGIN / LOGOUT

	/* Handle login GET */
	router.get(paths.login, function(req, res) {

		if (!req.isAuthenticated()) {
			res.render('auth/login');
		} else {
			res.redirect(redirectOptions.successRedirect);
		}
	});

    /* Handle Login POST */
    router.post(paths.login, passport.authenticate('local'), function(req, res) {

	    // vent our intentions
	    meta4.vents.emit(feature.id, "login", req.user);
	    meta4.vents.emit(feature.id+":login", req.user);

	    res.redirect(basePath+paths.home);
    });

	/* Handle Logout GET */
	router.get(paths.logout, function(req, res) {

		// vent our intentions
		meta4.vents.emit(feature.id, "logout", req.user);
		meta4.vents.emit(feature.id+":logout", req.user);

		req.logout();
		res.redirect(redirectOptions.failureRedirect);
	});

	// SIGN-UP / FORGOT

    /* Handle Registration GET */
    router.get(paths.signup, function(req, res) {
        res.render('auth/signup',{message: req.flash('message')});
    });

    /* Handle Registration POST */
    router.post(paths.signup, passport.authenticate('signup', {
        successRedirect: basePath+paths.home,
        failureRedirect: basePath+paths.signup,
        failureFlash : failureFlash
    }));

    /* Handle Forgot POST */
    router.post(paths.forgot, passport.authenticate('local', {
        successRedirect: basePath+paths.index,
        failureRedirect: basePath+paths.forgot,
	    failureFlash: failureFlash
    }));


	// =============================================================================
	// PROTECTED ROUTES

	/*  authenticate and/or authorize protected resources */

	_.each(feature.protected, function(options, key) {

		// a protected resource defaults to a 'user' role
		var options = options===true?{ path: key, roles: ['user']}:_.extend({ path: key, roles: []}, options)

// console.log("Protecting", options.path, options)

		router.use(options.path, function(req,res,next) {
			EnsureAuthenticated(req, res, false) && EnsureAuthorized(options, req, res, next)
		})

	})

}
