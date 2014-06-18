var async = require('async');
var moment = require('moment');
var config = require('../../config');
var db = require('../db/mongo')(config);

function updateMixpanel(callback) {
	var period = moment().subtract(4, 'month');

	db.users
		.find({email: {$exists: true}, unsubscribed: {$exists: false}, loginLastDate: {$gte: period.toDate()}})
		.sort({_id: -1})
		.toArray(update);

	function update(err, users) {
		if (err) {
			return callback(err);
		}

		var updates = users.map(function (user) {
			return function (callback) {
				userProfile(user, function (err, profile) {
					if (err) {
						return callback(err);
					}

					var payload = {
						$token: mixpanelToken,
						$ip: '0',
						$distinct_id: user.email,
						$ignore_time: true,
						$set: profile
					};

					var encoded = new Buffer(JSON.stringify(payload)).toString('base64');
					var url = mixpanelApi + '/engage?data=' + encoded;

					console.log('updating profile', user.email);

					request(url, callback);
				});
			};
		});

		async.parallelLimit(updates, 16, callback);
	}
}


function define(agenda) {
	agenda.define('update mixpanel', function (job, callback) {
		updateMixpanel(callback);
	});

	agenda.every('12 hours', 'update mixpanel');
}

module.exports = define;