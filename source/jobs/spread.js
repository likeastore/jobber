var _ = require('underscore');
var async = require('async');
var moment = require('moment');
var config = require('../../config');
var mongo = require('../db/mongo')(config);
var mandrill = require('node-mandrill')(config.mandrill.token);

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

			if (!pulse) {
				return callback({message: 'failed to get pulse', date: current});
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
		var emails = Object.keys(users);

		var merge = emails.map(function (email) {
			return {rcpt: email, vars: [{name: 'userid', content: emails[email]}]};
		});

		async.map(splitToChunks(emails), pushToMandrill, callback);

		function pushToMandrill(emailsChunk, callback) {
			var to = emailsChunk.map(function (email) {
				return { email: email };
			});

			mandrill('/messages/send-template', {
				template_name: 'likeastore-pulse-weekly',
				template_content: [],
				global_merge_vars: fields,

				message: {
					auto_html: null,
					to: to,
					preserve_recipients: false,
					merge_vars: merge
				},
			}, callback);
		}

	}

	function splitToChunks(arr) {
		var chunks = [], size = 1024;

		while (arr.length > 0) {
			chunks.push(arr.splice(0, size));
		}

		return chunks;
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