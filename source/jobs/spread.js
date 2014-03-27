var _ = require('underscore');
var async = require('async');
var moment = require('moment');
var config = require('../../config');
var mongo = require('../db/mongo')(config);

function spread(interval, callback) {
	var current = moment().format('YYYY-MM-DD');

	async.waterfall([
		read,
		prepare,
		emails,
		send
	], callback);

	function read(callback) {
		mongo.pulse.findOne({date: current, interval: interval}, function (err, pulse) {
			if (err) {
				return callback(err);
			}

			callback(null, pulse.results);
		});
	}

	function prepare(results, callback) {
		var grouped = _.groupBy(results, function (item) {
			return item.type;
		});

		var titles = Object.keys(grouped).map(function (key) {
			return { name: 'BEST_OF_' + key.toUpperCase() + '_TITLE', content: either(_.first(grouped[key]), 'title', 'authorName') };
		});

		var descriptions = Object.keys(grouped).map(function (key) {
			return { name: 'BEST_OF_' + key.toUpperCase() + '_DESCRIPTION', content: _.first(grouped[key]).description };
		});

		var urls = Object.keys(grouped).map(function (key) {
			return { name: 'BEST_OF_' + key.toUpperCase() + '_URL', content: _.first(grouped[key]).url };
		});

		var likes = Object.keys(grouped).map(function (key) {
			return { name: 'BEST_OF_' + key.toUpperCase() + '_LIKES', content: _.first(grouped[key]).likes };
		});

		var fields = _.union([titles, descriptions, urls, likes]);

		callback(null, fields);
	}

	function emails(fields, callback) {
		var users = {};

		mongo.users.find({unsubscribed: {$exists: false}, firstTimeUser: {$exists: false}}).forEach(function (err, user) {
			if (err) {
				return callback(err);
			}

			if (!user) {
				return callback(null, users, fields);
			}

			users[user.email] = user._id.toString();
		});
	}

	function send(users, fields, callback) {
		callback(null);
	}

function either() {
	var o = arguments[0];
	var p = Array.prototype.slice.call(arguments, 1);

	return p.reduce(function (p, c) {
		return o[p] || o[c];
	});
}
}

module.exports = spread;