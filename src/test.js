var Tingo      = require('tingodb')();     // https://github.com/sergeyksv/tingodb

var db = new Tingo.Db("tmp/db", {});
var collection = db.collection("test");

// collection.insert({ label: "Hello" })

var found = collection.find({ "label": "Hello"}).toArray(function(error,found) {
	console.log("Found:", found)
})

