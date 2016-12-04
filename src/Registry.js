
// =============================================================================
// constants


// =============================================================================
// framework packages

var assert     = require('assert');         // assertions
var _          = require('underscore');     // collections helper
var Emitter    = require('events').EventEmitter;

// =============================================================================
// A simple function/object registry

// =============================================================================

module.exports = function(name) {
    _.extend(this, new Emitter() );
    var debug      = require("./debug")("registry:"+name);

    assert(name, "Missing registry name");
    var self = this;

    self.name = name;
    self.__registered = {};

    self.requires = require("./requires");

    self.get = function(k) {
        return self.__registered[k];
    };

    self.all = function(k) {
        // immutable
        return _.extend({},self.__registered);
    };

    self.boot = function() {
        var found = {};
        _.each(self.__registered, function(v,k) {
            if (_.isFunction(v)) {
                var done = v.apply(v, arguments);
                found[k] = done;
                self.emit("boot", k, v);
            } else {
                found[k] = v;
                self.emit("boot", k, v);
            }
        });
        self.emit("booted", found);
        return found;
    };

    self.register = function(k, v) {
        assert(k, "Missing plugin name");
        assert(_.isString(k), "Invalid plugin name");

        if (self.__registered[k])
            throw new Error("meta4:oops:registry:duplicate#"+k);

        if (_.isString(v) || !v) {
            debug("requires: %s", k);
            v = { id: k, fn: self.requires(v||k) };
        }
        if (_.isFunction(v)) {
            debug("fn(): %s", k);
            v = { id: k, fn: v };
        }

        self.__registered[k] = v;
        debug("registered: %s", k);
        self.emit("register", k, v);
        return this
    };

    return self;
}


