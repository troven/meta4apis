var exports = module.exports = {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

var ux          = require('./ux');           // UX Recipe Controller
var models      = require('./models');       // Models Controller

// =============================================================================
// configure the API routes

exports.build = function(router, config, apiConfig) {

    var basePath = apiConfig.basePath || config.basePath
    console.log("[meta4node] API initialized:", basePath) // , config, "\n API: ", apiConfig

    // =============================================================================
    // configure from Swagger API definition [work-in-progress]

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
    // simple instrumentation / diagnostics

    router.get('/about', function(req, res) {
        res.json({ message: 'Welcome to '+config.name, basePath: basePath, apis: apiConfig.apis });
    });

    // =============================================================================
    // dynamically build the UX definition

    router.get('/ux', function(req, res) {

        // NOTE: blocking I/O .. synchronous loading of recipe files
        var recipe = ux.build(config)
        recipe.url = req.protocol+"://"+req.hostname+":"+config.port
        recipe.basePath = basePath
        recipe.features = config.features
        res.json(recipe);

    });

    // =============================================================================
    // dynamically route model / CRUD requests

    router.use('/models/*', function(req, res) {
        var id = req.params[0]
        var file = config.homeDir+"/"+config.paths.models+"/"+id+".json"

        // load model's meta-data
        fs.readFile(file, function(error, data) {
            if (!error) {
                var meta = JSON.parse(data)
                if (meta.id == id) {
                    meta.homeDir = config.homeDir+"/"+config.paths.data
                    // delegate the request
                    return models.handle(req, res, meta, config)
                }
            } else {
                res.status = 500;
                return res.send('unknown model: '+id);
            }
        })
    });


}
