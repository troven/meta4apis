var exports = module.exports = module.exports || {};

// =============================================================================
// framework packages

var fs              = require('fs');             // file system
var assert          = require('assert');         // assertions
var paths           = require('path');           // file path helper

// =============================================================================

var helper          = require('meta4helpers');   // files & mixins

exports.install = function(path, filename) {

    assert(path&&filename, "Missing {{path}} {{filename}}")

    var name = paths.basename(path)

    var _defaults = {
        "//": "Created "+new Date(),
         "name": name,
         "home": "src",
         "basePath": "/"+name,
         "host": "localhost",
         "port": 8080,
         "salt": new Date().getTime(),
         "features": {}
    }

    require("./features").defaults(_defaults)

    var configFile = filename
    var data =  JSON.stringify(_defaults)

    var found = fs.lstatSync(configFile)
    if (!found) fs.writeFileSync(configFile, data)

    return _defaults
}
