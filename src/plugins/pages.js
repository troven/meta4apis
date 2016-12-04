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

var helper     = require('meta4common');   // files & mixins
var features   = require('../features');
var factory    = require("./crud")
var debug      = require("../debug")("feature:pages");

// =============================================================================

// Feature packages

var hbs = require('express-handlebars');

// =============================================================================
// configure the API routes

self.fn = function(meta4, feature) {

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

    // configure dynamic pages

    feature = _.extend({
        path: "/page",
        home: config.home+"/templates/server"
    }, feature);


    var templateHome = feature.home;
	var DEBUG = feature.debug || true;

    var router = express.Router();

	// =============================================================================

	//https://github.com/ericf/express-handlebars
	app.engine('.html', hbs({defaultLayout: false, extname: '.html',
        layoutsDir: "layouts", partialsDir: "partials"
	}));

    app.set('view engine', '.html');
    app.set('views', templateHome);
    app.use(feature.path, router)
    app.enable('view cache');

    debug("pages %s from: %s", feature.path, templateHome);

    var options = _.pick(meta4.config, ["host", "port", "basePath", "protocol", "name"]);
    var branding = _.extend(options, features.brand);

    // Dynamic Branded Views

    router.get("/:pageName?", function(req, res, next) {
        var page = req.params.pageName
        var brand = req.brand || branding;

        debug("render: %s", page);
        res.render(page, brand );
    });

	router.get("/:pageType/:id?", function(req, res, next) {

		var id = req.params.id || "index"
		var page = req.params.pageType
		var collection = feature.collection || feature.id
        var brand = req.brand || branding;

		var data = _.extend({}, req.query, req.body, req.params )
		var model = { meta: data, user: req.user, brand: brand }

		var crud = factory.models[collection]

		// no matching collection
		if (!crud) {
debug("render: %s <- %s", page, collection);
			res.render(page, model);
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
debug("render: %s <- %s @ %s -> %j", page, collection, req.sitepath, model)
					res.render(page, model)
				} catch(e) {
					res.send(404, "missing "+page)
				}
			})
		})
	});

}
