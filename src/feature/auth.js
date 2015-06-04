var exports = module.exports = module.exports || {};

// =============================================================================
// framework packages

var passport        = require('passport')
var LocalStrategy   = require('passport-local').Strategy

// =============================================================================
// meta4 packages

var assert     = require('assert');         // assertions

// =============================================================================

exports.configure = function(router, config) {

    var feature = config.features.auth
    assert(feature.path, "{{auth}} feature not configured")

    var paths = feature.path

    console.log("\tAuth", feature)

//    router.use(express.cookie());
//    router.use(session({secret: SESSION_SECRET }));

    passport.serializeUser(function(user, done) {
console.log("serializeUser:", user)
        done(null, user._id);
    });

    passport.deserializeUser(function(id, done) {
console.log("deserializeUser:", id)
        done(err, user);
    });

    // =============================================================================
    // authentication routes


    /* GET login page. */
    router.get(paths.index, function(req, res) {
console.log("deserializeUser:", id)
        // Display the Login page with any flash message, if any
        res.render('index', { message: req.flash('message') });
    });

    /* Handle Login POST */
    router.post(paths.login, passport.authenticate('local',
        { successRedirect: paths.index, failureRedirect: paths.login, failureFlash: true }
    ) );

    /* GET Registration Page */
    router.get(paths.signup, function(req, res){
        res.render('register',{message: req.flash('message')});
    });

    /* Handle Registration POST */
    router.post(paths.signup, passport.authenticate('signup', {
        successRedirect: paths.home,
        failureRedirect: paths.signup,
        failureFlash : true
    }));

    // =============================================================================
    // passport strategies

    var strategy = new LocalStrategy(

       function(username, password, done) {

           var user = { username: username }

           console.log("[meta4node] login:", user)

           return done(null, user);

       }
    )
    passport.use(strategy);

    // Authentication by Passport
    router.use(passport.initialize());
    router.use(passport.session());

    console.log("[meta4node] AUTH initialized")
}
