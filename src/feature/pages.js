var self = module.exports

// =============================================================================
// framework packages

var express    = require('express');        // call express
var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions
var paths      = require('path');           // file path
var debug      = require("../debug")("feature:pages");

// =============================================================================
// meta4 packages

var helper     = require('meta4helpers');   // files & mixins
var features   = require('../features');
var factory    = require("./crud")
var debug      = require("../debug")("feature:pages");

// =============================================================================

// Feature packages

var hbs = require('express-handlebars');

// =============================================================================
// configure the API routes

self.feature = function(meta4, feature) {

	// Sanity Checks
	assert(meta4,       "feature missing {{meta4}}");
	assert(meta4.router,"feature missing {{meta4.router}}");
	assert(meta4.config,"feature missing {{meta4.config}}");
	assert(meta4.app,   "feature missing {{meta4.app}}");
	assert(meta4.vents, "feature missing {{meta4.vents}}");

	assert(feature, "{{feature}} is missing");
	assert(feature.home, "{{feature.home}} is missing");
	assert(feature.path, "{{feature.path}} is missing");

	// =============================================================================

	var app = meta4.app, config = meta4.config;

    // configure Pages
    feature = _.extend({
        path: "/page",
        home: config.home+"/templates/server"
    }, feature);


    var templateHome = feature.home;
	var DEBUG = feature.debug || true;

    var router = express();

	// =============================================================================

	//https://github.com/ericf/express-handlebars
	router.engine('.html', hbs({defaultLayout: false, extname: '.html', settings: { views: templateHome } }));

    router.set('view engine', '.html');
	router.set('views', templateHome);
    app.use(config.basePath+feature.path, router)

	// Dynamic Branded Views

	router.get("/:pageType/:id?", function(req, res, next) {

		var id = req.params.id || "index"
		var page = req.params.pageType
		var collection = feature.collection || feature.id

		var data = _.extend({}, req.query, req.body, req.params )
		var model = { meta: data, user: req.user, brand: req.brand }

		var crud = factory.models[collection]

		// no matching collection
		if (!crud) {
debug("Brand Page", page, collection)
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
debug("Model Page", page, collection, model, req.sitepath)
					res.render(page, model)
				} catch(e) {
					res.send(404, "missing "+page)
				}
			})
		})
	});

}
