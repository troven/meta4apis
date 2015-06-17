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
var crud       = require('./crud');           // CRUD

// =============================================================================
// Configure Upload Feature

exports.feature = function(meta4, feature) {

    assert(feature, "feature needs meta4")
	var router = meta4.router, config = meta4.config

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

    router.use(feature.path, exports.uploader(feature));

}

exports.uploader = function(feature) {

    var uploadDir = feature.home
    helper.files.mkdirs(uploadDir)

console.log("[meta4] Upload attached: ", feature.path)

	return multer({

        limits: feature.limits,
        dest: uploadDir,
        putSingleFilesInArray: true,

        rename: function (fieldname, filename) {
//            fs.mkdirSync(uploadDir+"/"+fieldname)
            return Date.now()+"_"+filename;
        },

        onFileUploadStart: function (file, req, res) {
            console.log("Uploading:", file.originalname, req.body)
        },

        onFileUploadComplete: function (file, req, res) {
            file.label = file.originalname

console.log("[meta4] Uploaded:", file, req.query)

            delete file.originalname
            delete file.path;       // obfuscate local directory
            delete file.buffer;     // don't round-trip

			if (req.query.collection) {
				console.log("Upload Saving", req.query)
				crud.execute( { action: "create", data: file }, { id: req.query.collection, home: feature.home }, function(result) {
					console.log("Upload Saved", result)
				})
//	            //TODO: store 'file' meta-data in a data store
//	            fs.writeFile(file.path+".json", JSON.stringify(file))
			}

            res.json( { data: _.pick(file, 'name', 'label', "size", "mimetype"), status: 'success' } )
        },

        onParseEnd: function(req, next) {
console.log("[meta4] Upload Complete:", req.body)
        }

    })
}