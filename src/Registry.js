
// =============================================================================
// constants


// =============================================================================
// framework packages

var assert     = require('assert');         // assertions
var _          = require('underscore');     // collections helper
var debug      = require("./debug")("node:registry");
var Emitter    = require('events').EventEmitter;

// =============================================================================
// meta4 packages

// =============================================================================

var self = module.exports = new Emitter();

self._items = {};

self.get = function(k) {
    return self._items[k];
};

self.register = function(k,v) {
    assert(k, "Missing key");
    assert(v, "Missing value");

    if (self._items[k]) throw "meta4:oops:registry:duplicate#"+k

    self._items[k] = v;
    debug("register: %s", k);
    return this
};
