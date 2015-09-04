var exports = module.exports

// =============================================================================
// framework packages

var fs              = require('fs');             // file system
var assert          = require('assert');         // assertions
var paths           = require('path');           // file path helper

// =============================================================================

var helper          = require('meta4helpers');   // files & mixins

exports.install = function(meta4, filename) {

    assert(meta4, "Missing {{meta4}}")
    assert(filename, "Missing {{filename}}")

    var conf = fs.readSync("./nginx.txt")
console.log("NGINX: "+conf)

    return _defaults
}
