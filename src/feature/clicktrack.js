var self = module.exports

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var debug      = require("../debug")("feature:clicktrack");

// =============================================================================
// meta4 packages

var helper     = require('meta4common');   // files & mixins
var factory    = require("./crud")

// =============================================================================

// Feature packages

var uuid = require('node-uuid');

// =============================================================================
// configure the API routes

self.feature = function(meta4, feature) {

    // Sanity Checks
    assert(meta4,       "feature missing {{meta4}}")
    assert(meta4.router,"feature missing {{meta4.router}}")
    assert(meta4.config,"feature missing {{meta4.config}}")
    assert(meta4.app,   "feature missing {{meta4.app}}")
    assert(meta4.vents, "feature missing {{meta4.vents}}")

    assert(feature, "{{feature}} is missing")
    assert(feature.path, "{{feature.path}} is missing")

    // configure ClickTrack
    feature = _.extend({
        path: "/clicktrack",
        collection: "clicktracks"
    }, feature);

    // =============================================================================

    var router = meta4.router, config = meta4.config

    // Feature Routing
    router.get(feature.path+"/:id", function (req, res, next) {

        var collection = feature.collection || 'clicktracks';

        var data = _.extend({}, req.query, req.params );
        data.ip = req.ip;

        var crud = factory.models[collection];
        assert(crud, "{{feature.collection}} is missing: "+collection);

        // find siblings
        var CRUD = factory.CRUD(crud);
        CRUD.create( data, function(results) {
            var uid = req.signedCookies.clicktrack || uuid.v4();
            res.cookie('clicktrack', uid, { signed: true });

            debug("ClickTrack %s -> %j", uid, results);
        })

    })

}
