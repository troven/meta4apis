var self = module.exports

// =============================================================================
// framework packages

var fs         = require('fs');             // file system
var _          = require('underscore');     // collections helper
var assert     = require('assert');         // assertions


// =============================================================================
// meta4 packages

var helper     = require('meta4helpers');   // files & mixins

// =============================================================================

// Feature packages

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
//	assert(feature.home, "{{feature.home}} is missing")
	assert(feature.path, "{{feature.path}} is missing")

	// =============================================================================

	var router = meta4.router, config = meta4.config

	assert(feature.provider, "{{feature.provider}} is missing")

	assert(feature.provider.stripe, "{{feature.provider.stripe}} is missing")
	assert(feature.provider.stripe.apiKey, "{{feature.provider.stripe.apiKey}} is missing")

	var stripe = require('stripe')(feature.provider.stripe.apiKey);

	var Reply = function(res, err, result) {
		if (err) throw new Error(err)
		res.json( { data: result.data?result.data:result, meta: {} })
	}

	// Customer Invoices
	router.get(feature.path+"/customers", function (req, res, next) {
		if (!req.user) res.send(403)

		stripe.customers.list( { limit: 10 }, function(err, customers) {
			Reply(res, err, customers)
		});
	})

	// Owner Account
	router.get(feature.path+"/account", function (req, res, next) {
		if (!req.user) res.send(403)

		stripe.accounts.retrieve( feature.provider.stripe.accountId,
			function(err, account) {
console.log("Owner Account: ",err ,account)
				Reply(res, err, account)
			}
		);
	})

	// Customer Invoices
	router.get(feature.path+"/invoices/:custId?", function (req, res, next) {
		if (!req.user) res.send(403)
		var custId = req.params.custId

		if (custId) {
			stripe.invoices.list( custId,
				function(err, invoices) {
					console.log("Invoices: ",custId, err ,invoices)
					Reply(res, err, invoices)
				}
			);
			return
		}

		stripe.invoices.list( function(err, invoices) {
				console.log("Invoices: ",err ,invoices)
				Reply(res, err, invoices)
			}
		);
	})

	// Invoice / Cart
	router.get(feature.path+"/invoice", function (req, res, next) {

		// do something

	})

	// Connected to Marketplace
	router.get(feature.path+"/connected", function (req, res, next) {

		var cmd = _.extend({}, req.query, req.body )

		console.log("Client Connected", cmd)

//      vent our intentions
		meta4.vents.emit(feature.id+":connected", req.user||false, cmd);

		res.redirect(feature.path+"/connected");

	})

	// Web Hooks
	router.get(feature.path+"/webhook", function (req, res, next) {

		var cmd = _.extend({}, req.query, req.body )

		console.log("Stripe Webhook", cmd)
		//TODO: active confirmation

//      vent our intentions
		meta4.vents.emit(feature.id, cmd.type, req.user||false, cmd);
		meta4.vents.emit(feature.id+":"+cmd.type, req.user||false, cmd);

		res.send(200)

	})

	// Start Recurring Billing
	router.post(feature.path+"/subscribed", function (req, res, next) {
		assert(req.body.plan, "missing plan")
		assert(req.body.redirect, "missing redirect")
		if (!req.user) {
console.log("Not Logined")
			req.login()
			return;
		}

		// req.body.stripeToken
		// req.body.stripeEmail
		var go_to = req.body.redirect || feature.path+"/subscribed"

		var CreateSubscription = function(customer) {
			var cmd = {plan: req.body.plan }
			stripe.customers.createSubscription( customer.stripe_id, cmd,
				function(err, result) {
console.log("New Subscriber", customer, result )

					// vent our intentions
					meta4.vents.emit(feature.id+":subscriber", req.user||false, cmd, result.data||false);
					res.redirect(go_to)
				}
			);
		}

		if (req.user || !req.user.stripe_id) {

			var description = 'New user: '+req.body.stripeEmail
			stripe.customers.create({
				email: req.body.stripeEmail,
				description: "new subscriber: "+req.user.username,
				plan: req.body.plan,
				source: req.body.stripeToken
			}, function(err, customer) {

console.log("New Customer", req.body, customer )
				req.user.stripe_id = customer.id

				// vent our intentions
				meta4.vents.emit(feature.id+":subscriber", req.user, customer);
				res.redirect(go_to)
			});

		} else {
			CreateSubscription(req.user)
		}
	})

	// Stop Recurring Billing
	router.get(feature.path+"/cancel", function (req, res, next) {

		// TODO: do something

	})

}
