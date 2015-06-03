var exports = module.exports = {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system

// =============================================================================
// meta4 packages

var ux     = require('./ux');           // UX recipe builder

// =============================================================================

exports.build  =function(router, config, apiConfig) {

    var basePath = apiConfig.basePath || config.basePath
    console.log("[meta4node] API initialized:", basePath)

    // configure from Swagger API definition
    apiConfig.apis.forEach(function(api) {

        console.log("\t", basePath + api.path)

        // register each API path with router

        router.get(api.path, function(req, res) {
            res.json({ message: 'Welcome to '+basePath + api.path });
        });
    })

    router.get('/about', function(req, res) {
        res.json({ message: 'Welcome to '+config.name, basePath: basePath, apis: apiConfig.apis });
    });

    // dynamically build the UX definition

    router.get('/ux', function(req, res) {


        // =============================================================================
        // serve up our UX recipe

        var recipe = ux.build(config)
        res.json(recipe);
    });

}
