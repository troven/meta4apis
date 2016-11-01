var debug = require("debug");
var assert = require("assert");
var fs = require("fs");
var _ = require("underscore");
var installer = require("./installer");
var BOOT_FILE = "meta4.json"

var self = module.exports = {
    BOOT_FILE: BOOT_FILE,

    announce : function() {
        debug("                _        _  _\n\
 _ __ ___   ___| |_ __ _| || |\n\
| '_ ` _ \\ / _ \\ __/ _` | || |_\n\
| | | | | |  __/ || (_| |__   _|\n\
|_| |_| |_|\\___|\\__\\__,_|  |_|");

        var meta4node_pkg = require('../package.json');
        console.log("\tv%s by %s\n", meta4node_pkg.version, meta4node_pkg.author)

    },

    cli: function(bootable, cb_features) {
        var argv       = require('minimist')(process.argv.slice(2));    // cmd line arguments
        var args = argv['_'];

        if (args.length==0) {
            var path = "package.json";
            fs.readFile(path, function(err,data) {
                assert(!err, "missing {{package.json}}");
                var pkg = JSON.parse(data)
                assert(pkg.name, "Missing package name");
                installer.install(pkg.name, self.BOOT_FILE, argv);
                self.announce();
                bootable.boot(self.BOOT_FILE, _.extend({},argv,pkg), function(err, config) {
                    if (cb_features) {
                        cb_features(err, config, function(features) {
                            bootable.start(features)
                        })
                    } else {
                        bootable.start(config)
                    }
                } )
            })
        }

        if (args.length>0) {
            self.announce();
            args.forEach(function(path) {
                self.boot(path+"/"+BOOT_FILE, argv, function(err, config) {
                    self.start(config, callback)
                })
            })
        }
    }
}