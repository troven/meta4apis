var fs = require("fs");
var paths = require("path");

module.exports = {

    files: {
        exists: function( file ) {
            var stat = fs.existsSync(file);
            return stat?true:false;
        }
    },

    uri: {

        sanitize: function(url) {
            var ix = url.indexOf("://");
            if (ix<0) {
                // relative URL
                return paths.normalize(url);
            }
            var upath = url.substring(ix+2);
            return url.substring(0,ix+2)+paths.normalize(upath);
        }

    }
}