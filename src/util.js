var exports = module.exports = {};

// =============================================================================
// framework packages

var fs         = require('fs');             // file system

// =============================================================================

exports.walkDir = function(dir, accept, files) {
    files = files || {}
    var found = fs.readdirSync(dir)

    found.forEach( function(file) {
        var path = dir +"/"+ file
        var stat = fs.statSync( path )

        if (stat.isDirectory() ) {
            exports.walkDir( path + "/", accept, files)
        } else {
            var data = fs.readFileSync(path)
            if ( !accept || accept(path, data) ) {
                files[path] = data
            }
        }
    })

    return files;
}
