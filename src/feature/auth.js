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
			var name = username.match(/^[A-Za-z0-9\s]+/);
			var user = { id: username, name: name[0], roles: [ 'user' ] }
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
    // authentication routes

	var basePath = config.basePath
	var failureFlash = false
	var redirectOptions = {
		successRedirect: basePath+paths.home,
		failureRedirect: basePath+paths.login,
		failureFlash: failureFlash
	}


	console.log("login paths:", basePath, paths)

	/* GET login page. */
	router.get(paths.login, function(req, res) {
		console.log("login:", req.path, req.params)
		if (!req.isAuthenticated()) {
			res.render('auth/login');
		} else {
			res.redirect(redirectOptions.successRedirect);
		}
	});

	// LOGIN / LOGOUT

	/* GET login page. */
	router.get(paths.home, function(req, res, next) {
		console.log("home:", req.user)
		if (!req.isAuthenticated()) {
			res.redirect(redirectOptions.failureRedirect);
		} else next()
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
		res.redirect(redirectOptions.successRedirect);
	});

	// SIGN-UP / FORGOT

    /* GET Registration Page */
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

	/* Handle Protection */

	var CompareRoles = function(a,b) {
		for(v in a) {
			if (b[v]) return true;
		}
		return false;
	}

	_.each(feature.protected, function(options, key) {
		var options = options===true?{ path: key, roles: ['user']}:_.extend({ path: key, roles: ['guest']}, options)

		console.log("Protect", options.path, options)

		router.get(options.path, function(req,res,next) {
			console.log("Protected", req.path, req.user)

			if (!req.isAuthenticated()) {
				res.redirect(basePath+paths.login)
				return
			}
			if (options.roles) {
				if (!req.user.roles) {
					res.redirect(basePath+paths.login)
					return
				}

				var rolesAllowed = CompareRoles(options.roles, req.user.roles)

				console.log("auth roles", rolesAllowed, options.roles, req.user.roles)
				if ( rolesAllowed ) {
					next()
					return
				}
			}
			console.log("denied", req.path, req.user)
			res.redirect(basePath+paths.home)
		})
	})

}
