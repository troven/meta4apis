var self = module.exports

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var path       = require('path');           // file path helper
var assert     = require('assert');         // assertions
var multer     = require('multer');         // multi-part form handler
var _          = require('underscore');     // collections helper
var debug      = require("../debug")("feature:upload");

// =============================================================================
// meta4 packages

var helper     = require('meta4common');   // files & mixins
var crud       = require('./crud');           // CRUD

// =============================================================================
// Configure Upload Feature

self.feature = function(meta4, feature) {

	// Sanity Checks
	assert(meta4,       "feature missing {{meta4}}")
	assert(meta4.router,"feature missing {{meta4.router}}")
	assert(meta4.config,"feature missing {{meta4.config}}")
	assert(meta4.vents, "feature missing {{meta4.vents}}")

    assert(feature, "feature-missing")

// =============================================================================
	var router = meta4.router, config = meta4.config

    // Upload options
    feature = _.extend({
        path: "upload",
        home: "uploads",
	    collection: "meta4assets", can: {}, limit: {}
    }, feature)

    feature.can = _.extend( { download: true, upload: true }, feature.can);
    feature.limits = _.extend({ fieldNameSize: 100, files: 2, fields: 5 });


    if (feature.can.download) {
		router.get(feature.path+"/*", self.downloader(feature, meta4));
    }

	// multi-part file upload
    if (feature.can.upload) {
		router.post(feature.path, self.uploader(feature, meta4));
	}
}

// =============================================================================
// Handle Uploads

self.uploader = function(feature, meta4) {
    // Sanity Checks
    assert(meta4,       "feature missing {{meta4}}")
    assert(feature,"feature missing {{feature}}")
    assert(feature.path,"feature missing {{feature.path}}")

    var uploadDir = feature.home
    debug("Upload Attached: %s -> %s", feature.path, uploadDir)
    helper.files.mkdirs(uploadDir)

    return function(req, res, next) {

        var _multer =  multer({

            limits: feature.limits,
            dest: uploadDir,
            putSingleFilesInArray: true,

            rename: function (fieldname, filename) {
	            var renamed = ""
	            if (req.query.collection) {
		            renamed = req.query.collection+"/"
	            }
	            if (req.query.id) {
		            renamed = renamed + (req.query.id.replace(/[\W]/gi, '_')) +"/"
	            }

	            renamed = renamed + fieldname + "/"
	            helper.files.mkdirs(uploadDir+"/"+renamed)
	            renamed = renamed + (req.query.collection?Date.now()+"/":"") + filename

	            debug("Rename using", req.query, filename, renamed)

	            return renamed
            },

            onFileUploadStart: function (file, req, res) {
                debug("Uploading:", file.originalname, path.dirname(file.path))
                helper.files.mkdirs(path.dirname(file.path))
            },

            onFileUploadComplete: function (file, req, res) {

//                delete file.originalname
//                delete file.path;       // obfuscate local directory
                delete file.buffer;     // don't round-trip

	            file.id = file.id || file.name
                file.url = ((feature.basePath?feature.basePath:feature.path) + file.id)+"/";
	            file.label =  file.name = file.originalname || file.name

	            debug("Uploaded:", feature.path, file, req.query)
//	            helper.files.mkdirs(path.basename(file))

                var uploaded = _.pick(file, 'id', 'name', 'url', 'label', "size", "mimetype", "extension")

                if (req.query.collection) {
                    debug("Upload CRUD", req.query)

	                var uploads = crud.models[req.query.collection]
	                if (uploads) {
		                var Uploads = crud.CRUD(uploads, req.user)
		                Uploads.create( file, function(results) {

			                // vent our intentions
			                meta4.vents.emit(feature.id, 'upload', uploaded);
			                meta4.vents.emit(feature.id+':upload', uploaded);
//			                res.json( results )
		                });
	                } else {
		                console.error("[meta4] no upload collection: "+req.query.collection)
	                }
                }
                res.json( { data: uploaded, status: 'success' } )
            },

            onParseEnd: function(req, next) {
debug("Upload Complete:", req.query, req.body)
                next()
            }

        })
        return _multer(req,res, next)
    }

}

self.downloader = function(feature, meta4) {

    var uploadDir = feature.home
    debug("Download attached: ", uploadDir, "@", feature.path+"/*")

    return function(req, res, next) {
        var filename = path.resolve(uploadDir+decodeURI(req.path).substring(feature.path.length))
debug("Download:", filename)

	    // vent our intentions
	    meta4.vents.emit(feature.id, 'download', filename, req.user);
	    meta4.vents.emit(feature.id+':download', filename, req.user);

        res.sendFile(filename)
    }
}
