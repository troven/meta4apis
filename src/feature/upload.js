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

	// Sanity Checks
	assert(meta4,       "feature missing {{meta4}}")
	assert(meta4.router,"feature missing {{meta4.router}}")
	assert(meta4.config,"feature missing {{meta4.config}}")
	assert(meta4.vents, "feature missing {{meta4.vents}}")

    assert(feature, "feature-missing")

// =============================================================================
	var router = meta4.router, config = meta4.config

    // Upload options
    feature = _.defaults(feature, {
        path: "upload",
        home: "uploads",
        can: { download: true, upload: true },
        limits: {
            fieldNameSize: 100,
            files: 2,
            fields: 5
        }
    })

	// Permissions

    if (feature.can.download) {
		router.get(feature.path+"/*", exports.downloader(feature, meta4));
    }

	// multi-part file upload
    if (feature.can.upload) {
		router.post(feature.path, exports.uploader(feature, meta4));
	}
}

// =============================================================================
// Handle Uploads

exports.uploader = function(feature, meta4) {

    var uploadDir = feature.home
    helper.files.mkdirs(uploadDir)

console.log("[meta4] Upload Attached: ", feature.path)

    return function(req, res, next) {
        var _multer =  multer({

            limits: feature.limits,
            dest: uploadDir,
            putSingleFilesInArray: true,

            rename: function (fieldname, filename) {
                var renamed = filename.replace(/[\W]/gi, '_')
    //            fs.mkdirSync(uploadDir+"/"+fieldname)
                if (req.query.collection) {
                    renamed = Date.now()+"/"+renamed
                }
                if (req.query.id) {
                    renamed = req.query.id+"/"+renamed
                }
console.log("Rename using", req.query, renamed)
                return renamed.replace(/[\W]/gi, '/')
            },

            onFileUploadStart: function (file, req, res) {
                console.log("Uploading:", file.originalname, path.dirname(file.path))
                helper.files.mkdirs(path.dirname(file.path))
            },

            onFileUploadComplete: function (file, req, res) {
                file.label = file.originalname || file.name
                feature.baseURL = feature.baseURL || ""

console.log("[meta4] Uploaded:", feature.path, file, req.query)

                delete file.originalname
                delete file.path;       // obfuscate local directory
                delete file.buffer;     // don't round-trip

                file.url = (feature.baseURL?feature.baseURL:feature.path+"/") + file.name

                if (req.query.collection) {
                    console.log("Upload Saving", req.query)

	                //BUG: refactored CRUD
                    crud.execute( { action: "create", data: file }, { id: req.query.collection, home: feature.home }, function(result) {
                        console.log("Upload Saved", result)
                    })

    //	            //TODO: store 'file' meta-data in a data store
    //	            fs.writeFile(file.path+".json", JSON.stringify(file))
                }

	            // vent our intentions
	            meta4.vents.emit(feature.id, 'upload', file, req.user);
	            meta4.vents.emit(feature.id+':upload', file, req.user);

                helper.files.mkdirs(path.basename(file))
                res.json( { data: _.pick(file, 'name', 'url', 'label', "size", "mimetype"), status: 'success' } )
            },

            onParseEnd: function(req, next) {
console.log("[meta4] Upload Complete:", req.query, req.body)
                next()
            }

        })
        return _multer(req,res, next)
    }

}

exports.downloader = function(feature, meta4) {

    var uploadDir = feature.home
    console.log("[meta4] Download attached: ", uploadDir, "@", feature.path+"/*")

    return function(req, res, next) {
        var filename = path.resolve(uploadDir+req.path.substring(feature.path.length))
console.log("[meta4] Download:", filename)

	    // vent our intentions
	    meta4.vents.emit(feature.id, 'download', filename, req.user);
	    meta4.vents.emit(feature.id+':download', filename, req.user);

        res.sendFile(filename)
    }
}
