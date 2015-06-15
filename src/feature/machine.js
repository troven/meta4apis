var self = module.exports

// =============================================================================
// framework packages

var assert     = require('assert');         // assertions
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

var helper     = require('meta4helpers');   // files & mixins

// =============================================================================
// Configure CRUD Feature

self.feature = function(router, feature, config) {

    // =============================================================================
    // dynamically route model / CRUD requests

    assert(feature, "{{machine}} feature not configured")

    router.use(feature.path+'/:pack.:machine', function(req, res) {

        assert(feature.config[req.params.machine], "feature {{machine}} missing for "+req.params.machine)
        assert(feature.config[req.params.pack], "feature {{pack}} missing for "+req.params.pack)

        // meta4 options
        var options = feature.config[req.params.pack]
        // composite meta-data
        var meta = _.extend({ machinePrefix: "machinepack-"}, options, req.params)

        // get the machine package
        var machine = require(meta.machinePrefix+req.params.pack)

        // late-bind the query parameters
        _.extend(meta, req.query)
        // de-reference the machine's fn
        var fn = machine[req.params.machine](meta)

        // execute the machine asynchronously
        var result = fn.exec({
           error: function (err) {
                return res.json( { id: req.params.pack+"/"+req.params.machine, status: 'failed', errors: [err]} );
           },
           success: function (result){
                return res.json( { id: req.params.pack+"/"+req.params.machine, status: 'success', data: result, meta: meta });
           },
         })
    });

}

// =============================================================================
// Handle CRUD operations

self.handle = function(req, res, meta, config) {

    // acquire the proxy
    var store = meta.store || "file"
    var crud = require("./crud/"+store)

    // dynamic delegation
    crud.handle(req, res, meta, config)

}