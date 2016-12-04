
module.exports = {
    cli: require("./cli").cli,
    _: require("underscore"),
    server: require('./server'),
    requires: require('./requires'),
    features: require('./features'),
    Registry: require('./Registry'),
    debug: require('./debug')
}
