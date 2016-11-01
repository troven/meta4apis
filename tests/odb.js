var OrientDB = require('orientjs');

var config = {
	host: "52.63.156.175",
	name: "qapi",
	username: "aws-apps",
	password: "quapi2016"
}
var server = OrientDB(config);

console.log("server: %j", server);
var dbs = server.list()
	.then(
		function (list) {
			console.log('Databases on Server:', list.length);
		}
	);

var db = server.use('qapi');
console.log("db: %j", db);

db.class.list()
	.then(
		function (classes) {
			console.log('There are ' + classes.length + ' classes in the db:',
				classes);
		}
	);
