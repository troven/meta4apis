var debug = require("debug");
var assert = require("assert");

module.exports = function(name) {
    assert(name, "Missing debug name");

    return debug("meta4:"+name);
}