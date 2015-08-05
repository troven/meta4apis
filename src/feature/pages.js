var exports = module.exports = module.exports || {};

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
var features   = require('../features');
var factory    = require("./crud")

// =============================================================================

// Feature packages

var hbs = require('express-handlebars');

// =============================================================================
// configure the API routes

exports.feature = function(meta4, feature) {

	// Sanity Checks
	assert(meta4,       "feature missing {{meta4}}")
	assert(meta4.router,"feature missing {{meta4.router}}")
	assert(meta4.config,"feature missing {{meta4.config}}")
	assert(meta4.app,   "feature missing {{meta4.app}}")
	assert(meta4.vents, "feature missing {{meta4.vents}}")

	assert(feature, "{{feature}} is missing")
	assert(feature.home, "{{feature.home}} is missing")
	assert(feature.path, "{{feature.path}} is missing")

	// =============================================================================

	var app = meta4.app, router = meta4.router, config = meta4.config
	var brand = _.extend({ name: config.name, description: config.description || "", path: config.basePath }, feature.brand)
	var templateHome = feature.home
	var DEBUG = feature.debug || true

	// =============================================================================

	//https://github.com/ericf/express-handlebars
	app.engine('.html', hbs({defaultLayout: false, extname: '.html'}));

	app.set('view engine', '.html');
	app.set('views', templateHome);

	// =============================================================================

	// Dynamic Branded Views

	router.get(feature.path+"/:page/:id?", function(req, res, next) {

		var id = req.params.id
		var page = req.params.page
		var collection = feature.collection || feature.id

		var data = _.extend({}, req.query, req.body )
		var model = { meta: data, user: req.user, brand: brand }

		var crud = factory.models[collection]

		// no matching collection
		if (!crud) {
DEBUG&&console.log("Brand Page", page, collection)
			res.render(page, model)
			return;
		}

		// find siblings
		var CRUD = factory.CRUD(crud)

		CRUD.read( data, function(results) {

			model[collection] = results.data || [];

			// filter item by 'id' or 'page'
			data.id = id || page;

			// vent our intentions
			meta4.vents.emit(feature.id, page, data);
			meta4.vents.emit(feature.id+":"+page, data);

			// find slug instance
			CRUD.find( data, function(results) {
				model.it = results.data || {}

				// render page + model
				try {
					DEBUG&&console.log("Model Page", page, collection, results.data)
					res.render(page, model)
				} catch(e) {
					res.send(404, "missing "+page)
				}
			})
		})
	});

	DEBUG&&console.log("[meta4pages] Pages: "+feature.path+" @ ",templateHome)

}
