var exports = module.exports = module.exports || {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var path       = require('path');           // file path helper
var assert     = require('assert');         // assertions
var multer     = require('multer');         // multi-part form handler
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

var util     = require('../util');           // convenience functions

// =============================================================================
// Configure Upload Feature

exports.configure = function(router, config) {

    var feature = config.features.upload
    assert(feature.path, "{{upload}} feature not configured")

    console.log("\tUpload", feature)

    // =============================================================================
    // configure multi-part file upload

    var uploadDir = config.homeDir+"/"+feature.home

    console.log("\tUPLOAD to: ", uploadDir)

    router.use(feature.path, multer({
        limits: config.feature.upload.limits,
        dest: uploadDir,
        rename: function (fieldname, filename) {
//            fs.mkdirSync(uploadDir+"/"+fieldname)
            return Date.now()+"_"+filename;
        },
        onFileUploadStart: function (file, req, res) {
//            console.log(file.originalname + ' is starting ...')
        },
        onFileUploadComplete: function (file, req, res) {
//            console.log(file.fieldname + ' uploaded to  ' + file.path)

            delete file.path;       // obfuscate local directory
            delete file.buffer;     // don't round-trip

            //TODO: store 'file' meta-data in a data store
            res.json(file)
        }
    }));

    console.log("[meta4node] Upload initialized")
}
