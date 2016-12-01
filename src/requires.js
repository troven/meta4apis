var debug      = require("./debug")("requires");

module.exports = function(name, required) {
    try {
        // built-in
        var path ="./feature/"+name;
        var rkg = require(path);
        debug("meta4 built-in: %s -> %s", name, path);
        return rkg;
    }  catch(e) {
        debug("no built-in: %s @ %s -> %s", name, path, e);
        try {
            // meta4 packaged
            var path = process.cwd()+"/node_modules/meta4"+name;
            var rkg = require(path);
            debug("meta4 pkg: %s -> %s", name, path);
            return rkg;
        }  catch(e) {
            debug("no meta4 pkg: %s @ %s", name, path);
            try {
                var path = process.cwd()+"/node_modules/"+name;
                var rkg = require(path);
                debug("local pkg: %s -> %s", name, path);
                return rkg;
            } catch(e) {
                debug("no local pkg: %s -> %s", name);
                if (required) {
                    return required(name);
                }
                throw new Error("Missing meta4 module: "+name);
            }
        }
    }
};
