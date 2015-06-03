var exports = module.exports = {};

// =============================================================================
// framework packages

var Tingo      = require('tingodb')();     // https://github.com/sergeyksv/tingodb

// =============================================================================
// handle model requests

var sendError = function(res, status, message) {
    res.status = status
    return res.send(message);
}

exports.handle = function(req, res, meta, meta4) {

    var config = meta.tingodb || { path: meta4.homeDir+"/"+meta4.paths.data+"/" }

    console.log("Tingo", req.method, meta.id, "@", config.path)

    var db = new Tingo.Db(config.path, {});
console.log("DB: ", db)

    var collection = db.collection(meta.id);

    switch( req.method ) {

        // CREATE
        case 'POST':
            var data = JSON.parse(req.body)
            collection.update(data)
            break;

        // READ
        case 'GET':
console.log("REQ:", req.query)
              if (req.query) {
                return sendError(res, 404, "model not found")
              }
              collection.findOne(req.query, function(err, item) {
                    console.log("Found", err, item)
                    res.json(item)
              });
            break;

        // UPDATE
        case 'PUT':
            var data = JSON.parse(req.body)
            collection.update(data)
            break;

        // DELETE
        case 'DELETE':
            var data = JSON.parse(req.body)
            collection.remove(data)
            break;

        // ERRORS
        default:
            return sendError(res, 405, 'method not support: '+meta.id)
    }

}