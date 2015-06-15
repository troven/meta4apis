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

var helper     = require('meta4helpers');   // files & mixins

// =============================================================================
// Configure Upload Feature

exports.feature = function(router, feature, meta4) {

    // meta4ure Upload
    feature = _.defaults(feature, {
        path: "/upload",
        home: "uploads",
        limits: {
            fieldNameSize: 100,
            files: 2,
            fields: 5
        }
    })

    assert(feature.path, "{{upload}} feature not meta4ured")

    // =============================================================================
    // meta4ure multi-part file upload

    var uploadDir = feature.home
    console.log("\tUpload directory:", uploadDir)
    helper.files.mkdirs(uploadDir)

    router.use(feature.path, multer({
        limits: feature.limits,
        dest: uploadDir,
        rename: function (fieldname, filename) {
//            fs.mkdirSync(uploadDir+"/"+fieldname)
            return Date.now()+"_"+filename;
        },
        onFileUploadStart: function (file, req, res) {
//            console.log(file.originalname + ' is starting ...')
        },
        onFileUploadComplete: function (file, req, res) {
            file.model_id = req.body.id
            file.id = file.name
            file.label = file.originalname

            console.log(file.fieldname, 'uploaded:', file)

            delete file.originalname
            delete file.path;       // obfuscate local directory
            delete file.buffer;     // don't round-trip

            //TODO: store 'file' meta-data in a data store
            fs.writeFile(file.path+".json", JSON.stringify(file))

            res.json( { data: _.pick(file,'id', 'label', "size", "mimetype"), status: 'success' } )
        }
    }));

}
