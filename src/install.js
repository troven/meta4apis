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

    var defaults = {
        "//": "Created "+new Date(),
         "name": name,
         "basePath": "/"+name,
         "host": name+".localhost",
         "port": 9090,
         "salt": new Date().getTime(),

         "paths": {
           "upload": "uploads",
           "views": "views",
           "models": "models/meta",
           "data": "models/data",
           "scripts": "scripts",
           "templates": "templates/client",
        "static": "public"
         },

         "feature": {
         }
    }

    var dir = helper.files.mkdirs(path)
    var configFile = filename
    var data =  JSON.stringify(defaults)

    var found = fs.lstatSync(configFile)
    if (!found) fs.writeFileSync(configFile, data)

    return defaults
}
