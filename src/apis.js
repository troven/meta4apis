var exports = module.exports = {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var multer     = require('multer');         // multi-part form handler
var assert     = require('assert');         // assertions

// =============================================================================
// meta4 packages

var ux          = require('./ux');           // UX Recipe Controller
var models      = require('./models');       // Models Controller

// =============================================================================
// configure the API routes

exports.build = function(router, config, apiConfig) {

    var basePath = apiConfig.basePath || config.basePath

    assert(basePath, "{{basePath}} is missing")
    console.log("[meta4node] API initialized:", basePath) // , config, "\n API: ", apiConfig

    // =============================================================================
    // simple instrumentation / diagnostics

    router.get('/about', function(req, res) {
        res.json({ message: 'Welcome to '+config.name, basePath: basePath, apis: clientAPIs });
    });

    // =============================================================================
    // configure multi-part file upload

    var uploadDir = config.homeDir+"/"+config.paths.uploads
    assert(config.paths.uploads, "{{uploads}} path is missing")
    assert(config.features.upload, "{{upload}} feature not configured")

    console.log("upload: ", config.features.upload, "->", uploadDir)

    router.use(config.features.upload, multer({
        limits: config.upload.limits,
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

            res.json(file)
        }
    }));

    // =============================================================================
    // configure Swagger API definitions
    // TODO: [work-in-progress]

    var clientAPIs = []
    apiConfig.apis.forEach(function(api) {

        console.log("\t", basePath + api.path)

        // register each Swagger API path with router
        router.get(api.path, function(req, res) {
            res.json({ message: 'Welcome to '+basePath + api.path });
        });

        clientAPIs.push( { path: api.path } )
    })

    // =============================================================================
    // dynamically build the UX definition

    assert(config.features.ux, "{{ux}} feature not configured")

    router.get(config.features.ux, function(req, res) {

        // live re-generation of recipe files
        // NOTE: blocking I/O inside
        var recipe = ux.build(config)
        recipe.url = req.protocol+"://"+req.hostname+":"+config.port
        recipe.basePath = basePath
        recipe.features = config.features
        res.json(recipe);

    });

    // =============================================================================
    // dynamically route model / CRUD requests

    assert(config.features.models, "{{models}} feature not configured")

    router.use(config.features.models+'/*', function(req, res) {
        var collection = req.params[0] // decode the wild-card
        var file = config.homeDir+"/"+config.paths.models+"/"+collection+".json"

        // load model's meta-data
        fs.readFile(file, function(error, data) {
            if (!error) {
                var meta = JSON.parse(data)

                // delegate the request, if collection meta-data concurs
                if (meta.id == collection) {
                    meta.homeDir = config.homeDir+"/"+config.paths.data
                    return models.handle(req, res, meta, config)
                }
            } else {
                res.status = 404;
                return res.send('unknown collection: '+collection);
            }
        })
    });


}
