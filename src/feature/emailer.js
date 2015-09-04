var self = module.exports

// =============================================================================
// framework packages

var express    = require('express');        // call express
var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var paths      = require('path');           // file path

// =============================================================================
// meta4 packages

var helper     = require('meta4helpers');   // files & mixins

// =============================================================================

// Feature packages

var hbs = require('express-handlebars');


// =============================================================================
// configure the API routes

self.feature = function(meta4, feature) {

	assert(meta4, "feature needs meta4")
	assert(meta4.router, "feature needs meta4.router")
	assert(meta4.app, "feature needs meta4.app")

	assert(feature.home, "{{home}} is missing")
	assert(feature.path, "{{path}} is missing")

	// =============================================================================

	var app = meta4.app, router = meta4.router, config = meta4.config
	var brand = _.extend({ name: config.name, description: config.description || "", path: config.basePath }, feature.brand)
	var templateHome = feature.home
	var DEBUG = feature.debug || true

	// =============================================================================

	// Retrieve Email Queue

	router.get(feature.path+"/queue/:id", function(req, res, next) {
		var id = req.params.id
		var model = { id: id }
		res.json( { model: model, meta: {} } )
	});

	// Deliver Email in Queue

	router.get(feature.path+"/deliver/:id", function(req, res, next) {
		var id = req.params.id
		var model = { id: id }
		res.json( { model: model, meta: {} } )
	});

	// Send to Email Queue

	router.post(feature.path+"/queue/:id", function(req, res, next) {
		var id = req.params.id
		var model = { id: id }
		res.json( { model: model, meta: {} } )
	});

	DEBUG&&console.log("[meta4] Emailer: "+feature.path+" @ ",templateHome)

}
