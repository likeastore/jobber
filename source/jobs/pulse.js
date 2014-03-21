var async = require('async');
var moment = require('moment');
var config = require('../../config');
var mongo = require('../db/mongo')(config);

function nearestTimespan(interval) {
	var intervals = {
		'half-hour': 30,
		'hour': 60,
		'six-hours': 360,
		'twelve-hours': 720,
		'day': 1440
	};

	var minutes = intervals[interval];

	if (minutes) {
		var current = moment().subtract(5, 'days');
		var from = moment(current).subtract(minutes, 'minutes').toDate();
		var to = current.toDate();

		return {
			from: from,
			to: to
		};
	}
}

function pulse(interval, callback) {
	var timespan = nearestTimespan(interval);

	if (!timespan) {
		return callback({message: 'failed to calculate timespan', interval: interval});
	}

	async.waterfall([
		aggregate,
		filter,
		resolve,
		store
	], callback);

	function aggregate(callback) {
		mongo.items.aggregate([
			{
				$match: {created: {$gte: timespan.from, $lt: timespan.to}}
			},
			{
				$group: {
					_id: {
						url: '$source',
						item: '$itemId'
					},
					likes: { $sum: 1 }
				}
			},
			{
				$sort: {
					likes: -1
				}
			},
			{
				$limit: 30
			}
		], callback);
	}

	function filter(aggregated, callback) {
		var filtered = aggregated.filter(function (item) {
			return item.likes > 1;
		});

		callback(null, filtered);
	}

	function resolve(filtered, callback) {
		async.map(filtered, db, callback);

		function db(item, callback) {
			mongo.items.findOne({itemId: item._id.item}, function (err, found) {
				if (err) {
					return callback(err);
				}

				callback(null, {
					url: item._id.url,
					likes: item.likes,
					description: found.description,
					thumbnail: found.thumbnail,
					type: found.type
				});
			});
		}
	}

	function store(resolved, callback) {
		callback(null, resolved);
		//mongo.pulse.save({interval: interval, prepared: timespan.to, timespan: timespan, results: aggregated}, callback);
	}
}

module.exports = pulse;