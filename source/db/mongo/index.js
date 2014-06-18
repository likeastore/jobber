var mongo = require('mongojs');

module.exports = function (config) {
	var connection = config.connection || 'mongodb://localhost:27017/likeastoredb';
	var db = mongo.connect(config[connection], ['events', 'actions', 'states', 'collections', 'users', 'items', 'networks', 'emails']);
	if (!db) {
		throw new Error('could not connect to ' + connection);
	}

	return db;
};