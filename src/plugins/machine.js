var self = module.exports

// =============================================================================
// framework packages

var assert	  = require('assert');			// assertions
var _		  = require('underscore');	  // collections helper
var debug     = require("../debug")("feature:machine");

// =============================================================================
// meta4 packages

var helper	  = require('meta4common');	// files & mixins

// =============================================================================
//

self.install = function(feature, config) {
//	debug("install machine", feature)

	_.each(feature.config, function(options, name) {
		// TODO: install node modules directly by name
	})

	return feature
}

// =============================================================================
// Install a node-machine using npm - then call it as a web API

// Configure the feature

self.fn = function(meta4, feature) {

	// Sanity Checks
	assert(meta4,       "feature missing {{meta4}}")
	assert(meta4.router,"feature missing {{meta4.router}}")
	assert(meta4.config,"feature missing {{meta4.config}}")
	assert(meta4.vents, "feature missing {{meta4.vents}}")

	assert(feature, "{{machine}} feature not configured")
	assert(feature.path, "{{machine}} path not configured")

	// =============================================================================

	var router = meta4.router, config = meta4.config

    // default configuration
    feature = _.extend({
        "path": "/do",
        "home": config.home+"/features/machines",
        "repository": "http://nodemachine.org",
        "config": {
        },
        roles: [ "user" ]
    }, feature);


    // =============================================================================

    // dynamically route model / CRUD requests
	 router.use(feature.path+'/:pack.:machine', function(req, res) {
	    self.handle(req, res, feature, config, meta4)
	 } );

	 router.use(feature.path+'/about/:pack.:machine', function(req, res) {
	    self.handle(req, res, feature, config, meta4)
	 } );
}

self.handle = function (req, res, feature, config, meta4) {

	// meta4 options
	var options = feature.config[req.params.pack] || {}
//	assert(feature.config[req.params.pack], "feature {{pack}} config missing for "+req.params.pack)

	// composite meta-data
	var meta = _.extend({ machinePrefix: "machinepack-"}, options, req.params)

	// get the machine package
	var machine = require(meta.machinePrefix+req.params.pack)
	if (!machine) {
		// error
		return res.json( { id: req.params.pack+"."+req.params.machine, status: 'error', message: 'missing machine-pack'} );
	}

	// late-bind the query parameters
	_.extend(meta, req.query)

	// de-reference the machine's fn
	var fn = machine[req.params.machine]
	if (!fn) {
		// error
		return res.json( { id: req.params.pack+"."+req.params.machine, status: 'error', message: 'missing machine'} );
	}

	// execute the machine fn() asynchronously
	var cmd = fn(meta)
	meta.id = req.params.pack+"."+req.params.machine
	meta.friendlyName = cmd.friendlyName
	meta.description = cmd.description

	var result = cmd.exec({
		error: function (err) {
			feature.debug && debug("[meta4machine] ", meta, err)
			return res.json( { id: meta.id, status: 'failed', meta: meta, errors: feature.debug?[err]:err.code} );
		},
		success: function (result){

			// vent our intentions
			meta4.vents.emit(feature.id, meta.id, req.user?req.user:false, meta, result );
			meta4.vents.emit(feature.id+":"+meta.id, req.user?req.user:false, meta, result );

			return res.json( { id: meta.id, status: 'success', data: result, meta: meta });
		},
	 })
}

