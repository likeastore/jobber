var _ = require('underscore');
var async = require('async');
var moment = require('moment');
var config = require('../../config');
var mongo = require('../db/mongo')(config);
var mandrill = require('node-mandrill')(config.mandrill.token);

function spread(interval, recipients, callback) {
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
			return { name: 'BEST_OF_' + key.toUpperCase() + '_DESCRIPTION', content: truncate(_.first(grouped[key]).description || '', 240) };
		});

		var urls = Object.keys(grouped).map(function (key) {
			return { name: 'BEST_OF_' + key.toUpperCase() + '_URL', content: _.first(grouped[key]).url };
		});

		var likes = Object.keys(grouped).map(function (key) {
			return { name: 'BEST_OF_' + key.toUpperCase() + '_LIKES', content: _.first(grouped[key]).likes };
		});

		var thumbnails = Object.keys(grouped).map(function (key) {
			return { name: 'BEST_OF_' + key.toUpperCase() + '_THUMBNAIL', content: _.first(grouped[key]).thumbnail };
		});

		var mores = [
			{ name: 'MORE', content: Math.floor((Math.random() * 20) + 24) }
		];

		var fields = _.union(titles, descriptions, urls, likes, thumbnails, mores);

		var subject = createSubject(titles);

		callback(null, {fields: fields, subject: subject});

		function createSubject(titles) {
			var titles = titles.map(function (title) {
				return title.content;
			}).join(', ');

			return 'Likeastore: ' + titles + ' and more..';
		}
	}

	function emails(message, callback) {
		var users = {};

		if (recipients === 'devs') {
			return callback(null, {'info@likeastore.com': 1}, message);
		} else if (recipients === 'users') {
			return findUsers();
		}

		function findUsers() {
			mongo.users.find({unsubscribed: {$exists: false}, firstTimeUser: {$exists: false}}).forEach(function (err, user) {
				if (err) {
					return callback(err);
				}

				if (!user) {
					return callback(null, users, message);
				}

				users[user.email] = user._id.toString();
			});
		}
	}

	function send(users, message, callback) {
		var emails = Object.keys(users);

		var merge = emails.map(function (email) {
			return {rcpt: email, vars: [{name: 'userid', content: users[email]}]};
		});

		async.map(splitToChunks(emails), pushToMandrill, callback);

		function pushToMandrill(emailsChunk, callback) {
			var to = emailsChunk.map(function (email) {
				return { email: email };
			});

			mandrill('/messages/send-template', {
				template_name: 'likeastore-pulse-weekly',
				template_content: [],

				message: {
					global_merge_vars: message.fields,
					subject: message.subject,
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

	function truncate(text, length, end) {
		if (isNaN(length)) {
			length = 100;
		}

		if (!end || typeof end !== 'string') {
			end = "...";
		}

		if (text.length <= length || text.length - end.length <= length) {
			return text;
		} else {
			return text.substring(0, length - end.length) + end;
		}
	}
}

module.exports = spread;