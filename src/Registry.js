
// =============================================================================
// constants


// =============================================================================
// framework packages

var assert     = require('assert');         // assertions
var _          = require('underscore');     // collections helper

// =============================================================================
// meta4 packages

// =============================================================================

var self = {
	_items: {},
	get: function(k) {
		return this._items[k]
	},
	register: function(k,v) {
		if (this._items[k]) throw "meta4:oops:registry:duplicate#"+k
		this._items[k]=v
		return this
	}
}


module.exports = self