var self = module.exports

// =============================================================================
// framework packages

var fs              = require('fs');             // file system
var assert          = require('assert');         // assertions
var paths           = require('path');           // file path helper
var debug           = require("./debug")("node:install");

// =============================================================================

var helper          = require('meta4helpers');   // files & mixins
//var hb              = require('mustache');

self.install = function(onInstalled) {
    var argv       = require('minimist')(process.argv.slice(2));    // cmd line arguments
    var args = argv['_']

    var pkg = require("../meta4.json")
//    debug("Install ", pkg)

    // Configure ...

    // NGINX
    // PM2
    // Bash
    // DB / Backup / Restore
    // Cron
    // /etc/hosts


}


self.install();
