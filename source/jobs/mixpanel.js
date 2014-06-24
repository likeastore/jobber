var _ = require('underscore');
var async = require('async');
var moment = require('moment');
var request = require('request');

var config = require('../../config');
var db = require('../db/mongo')(config);

var mixpanelApi = config.mixpanel.api;
var mixpanelToken = config.mixpanel.token;

function userProfile(user, callback) {
	var parts = [
		id,
		email,
		avatar,
		fullName,
		firstName,
		userName,
		location,
		website,
		registered,
		lastLogin,
		publicCollections,
		privateCollections,
		collectionsFollows,
		collectionsFollowed,
		networksEnabled,
		networksDisabled,
		followers,
		activated,
		totalItems,
		totalItemsInPublicCollections,
		totalItemsInPrivateCollections,
		verified,
		score,
		unsubscribed
	];

	async.parallel(parts, function (err, results) {
		if (err) {
			return callback(err);
		}

		var profile = results.reduce(function (memo, prop) {
			return _.extend(memo, prop);
		}, {});

		callback(null, profile);
	});

	function id(callback) {
		callback(null, {'Id': user._id});
	}

	function email(callback) {
		callback(null, {'$email': user.email});
	}

	function avatar(callback) {
		callback(null, {'Avatar': user.avatar});
	}

	function fullName(callback) {
		callback(null, {'$name': user.displayName});
	}

	function firstName(callback) {
		callback(null, {'$first_name': extractName(user.displayName)});

		function extractName(name) {
			return (name && name.split(/\s|,/)[0]) || name;
		}
	}

	function userName(callback) {
		callback(null, {'$username': user.name});
	}

	function location(callback) {
		callback(null, {'Location': user.location});
	}

	function website(callback) {
		callback(null, {'Website': user.website});
	}

	function registered(callback) {
		callback(null, {'$created': user.registered});
	}

	function lastLogin(callback) {
		callback(null, {'$last_login': user.loginLastDate});
	}

	function publicCollections(callback) {
		db.collections.count({user: user.email, public: true}, function (err, count) {
			if (err) {
				return callback(err);
			}

			callback(null, {'Public Collections': count});
		});
	}

	function privateCollections(callback) {
		db.collections.count({user: user.email, public: false}, function (err, count) {
			if (err) {
				return callback(err);
			}

			callback(null, {'Private Collections': count});
		});
	}

	function collectionsFollows(callback) {
		callback(null, {'Collections Follows': (user.followCollections && user.followCollections.length) || 0 });
	}

	function collectionsFollowed(callback) {
		db.collections.count({user: user.email, followers: {$exists: true}}, function (err, count) {
			if (err) {
				return callback(err);
			}

			callback(null, {'Collections Followed': count});
		});
	}

	function networksEnabled(callback) {
		db.networks.count({user: user.email, disabled: {$exists: false}}, function (err, count) {
			callback(err, {'Networks Enabled': count});
		});
	}

	function networksDisabled(callback) {
		db.networks.count({user: user.email, disabled: true}, function (err, count) {
			callback(err, {'Networks Disabled': count});
		});
	}

	function followers(callback) {
		callback(null, {'Followers': (user.followed && user.followed.length) || 0});
	}

	function activated(callback) {
		db.networks.count({user: user.email}, function (err, networksCount) {
			if (err) {
				return callback(err);
			}

			db.collections.count({user: user.email, public: true}, function (err, collectionsCount) {
				if (err) {
					return callback(err);
				}

				var verified = user.verified || true;
				var activated = verified && networksCount > 1 && collectionsCount > 2;

				callback(null, {'Activated': activated});
			});
		});
	}

	function totalItems(callback) {
		db.items.count({user: user.email}, function (err, count) {
			if (err) {
				return callback(err);
			}

			callback(null, {'Total Likes Stored': count});
		});
	}

	function totalItemsInPublicCollections(callback) {
		db.collections.find({user: user.email, public: true}, function (err, collections) {
			if (err) {
				return callback(err);
			}

			var total = collections.reduce(function (memo, collection) {
				return memo + ((collection.items && collection.items.length) || 0);
			}, 0);

			callback(null, {'Likes in Public Collections': total});
		});
	}

	function totalItemsInPrivateCollections(callback) {
		db.collections.find({user: user.email, public: false}, function (err, collections) {
			if (err) {
				return callback(err);
			}

			var total = collections.reduce(function (memo, collection) {
				return memo + ((collection.items && collection.items.length) || 0);
			}, 0);

			callback(null, {'Likes in Private Collections': total});
		});
	}

	function verified(callback) {
		callback(null, {'Verified': user.verified || true});
	}

	function score(callback) {
		callback(null, {'Score': user.score.total});
	}

	function unsubscribed(callback) {
		callback(null, {'Unsubscribed': user.unsubscribed || false});
	}
}

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

	agenda.every('1 hour', 'update mixpanel');
}

module.exports = define;