var self = module.exports

// =============================================================================
// framework packages

var assert	  = require('assert');			// assertions
var _			 = require('underscore');	  // collections helper

// =============================================================================
// meta4 packages

var helper	  = require('meta4helpers');	// files & mixins

// =============================================================================
//

self.install = function(feature, config) {
//	console.log("install machine", feature)

	_.each(feature.config, function(options, name) {
		// TODO: install node modules directly by name
	})
}

// =============================================================================

self.feature = function(meta4, feature) {

    assert(feature, "feature needs meta4")
	var router = meta4.router, config = meta4.config

	 // =============================================================================
	 // dynamically route model / CRUD requests

	 assert(feature, "{{machine}} feature not configured")
	 assert(feature.path, "{{machine}} path not configured")

	 router.use(feature.path+'/:pack.:machine', function(req, res) {
	    self.handle(req, res, feature, config)
	 } );

	 router.use(feature.path+'/about/:pack.:machine', function(req, res) {
	    self.handle(req, res, feature, meta4)
	 } );
}

self.handle = function (req, res, feature, meta4) {
	var router = meta4.router, config = meta4.config

	// meta4 options
	var options = feature.config[req.params.pack]
	assert(feature.config[req.params.pack], "feature {{pack}} config missing for "+req.params.pack)

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
	var spec = _.omit(cmd, ["fn"])

	var result = cmd.exec({
		error: function (err) {
			  return res.json( { id: req.params.pack+"."+req.params.machine, status: 'failed', meta: spec, errors: [err]} );
		},
		success: function (result){
			  return res.json( { id: req.params.pack+"."+req.params.machine, status: 'success', data: result, meta: spec });
		},
	 })
}

