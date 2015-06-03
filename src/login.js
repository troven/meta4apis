var exports = module.exports = {};

// =============================================================================
// framework packages

var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy

// =============================================================================
// meta4 packages

// =============================================================================

var strategy = new LocalStrategy(

   function(username, password, done) {

       var user = { username: username }

       console.log("[meta4node] login:", user)

       return done(null, user);

   }
)
passport.use(strategy);
