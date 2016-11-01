
module.exports = {
    cli: require("./cli").cli,
    _: require("underscore"),
    installer: require('./installer'),
    server: require('./server'),
    features: require('./features'),
    Registry: require('./Registry'),
    debug: require('./debug')
}
