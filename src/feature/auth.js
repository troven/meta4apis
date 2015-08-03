var exports = module.exports = module.exports || {};

// =============================================================================
// framework packages

var _               = require('underscore');     // collections helper
var passport        = require('passport')
var LocalStrategy   = require('passport-local').Strategy
var assert          = require('assert');         // assertions

// =============================================================================
// meta4 packages

// Strategies

var LinkedInStrategy = require('passport-linkedin'),
	GoogleStrategy = require('passport-google'),
	FacebookStrategy = require('passport-facebook');

// =============================================================================

exports.feature = function(meta4, feature) {

	assert(meta4, "feature needs meta4")
	assert(meta4.router, "feature needs meta4.router")
    assert(feature.path, "{{auth}} feature not configured")

	assert(meta4.config, "meta4 not configured")
	assert(meta4.config.basePath, "meta4.basePath not configured")

	// =============================================================================

	var app = meta4.app, router = meta4.router, config = meta4.config

	var paths = _.defaults(feature.paths, {
		home: "/pages/home",
        login: "/login",
		logout: "/logout",
        signup: "/signup",
        forgot: "/forgot"
    })

	var DEBUG = feature.debug || true

	// =============================================================================
	// Manage session with Passport

	router.use(passport.initialize());
	router.use(passport.session());


	// Authentication Strategies

	var strategy = new LocalStrategy(
		function(username, password, done) {

			// TODO: lookup in database
			var name = username.match(/^[A-Za-z0-9\s]+/);
			var user = { username: username, name: name[0], roles: [ 'user' ] }

			console.log("[meta4] local login:", user)
			return done(null, user);
		}
	)
	passport.use(strategy);

	passport.serializeUser(function(user, done) {
		console.log("serializeUser:", user)
		done(null, user);
	});

	passport.deserializeUser(function(user, done) {
		console.log("deserializeUser:", user)
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
			console.log("auth roles", rolesAllowed, options.roles, req.user.roles)

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

	console.log("login paths:", basePath, paths)

	// USER HOME PAGE

	/* Handle home GET - if logged-in */
	router.get(paths.home, function(req, res, next) {
		console.log("home:", req.user)
		EnsureAuthenticated(req, res, next);
	});

	// LOGIN / LOGOUT

	/* Handle login GET */
	router.get(paths.login, function(req, res) {
console.log("login:", req.path, req.params)
		if (!req.isAuthenticated()) {
			res.render('auth/login');
		} else {
			res.redirect(redirectOptions.successRedirect);
		}
	});

    /* Handle Login POST */
    router.post(paths.login, passport.authenticate('local'), function(req, res) {
console.log("authenticated:", req.user)
	    res.redirect(basePath+paths.home);
    });

	/* Handle Logout GET */
	router.get(paths.logout, function(req, res) {
console.log("Logout", req.user)
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

		router.get(options.path, function(req,res,next) {
console.log("Protected", req.path, req.user?req.user:"GUEST")
			// check if Authenticated and Authorized
			EnsureAuthenticated(req, res, false) && EnsureAuthorized(options, req, res, next)

		})
	})

}
