var fs = require("fs");

module.exports = {

    files: {
        exists: function( file ) {
            var stat = fs.existsSync(file);
            return stat?true:false;
        }
    }
}