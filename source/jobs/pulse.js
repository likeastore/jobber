var async = require('async');
var moment = require('moment');
var config = require('../../config');
var mongo = require('../db/mongo')(config);

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
			}
		], callback);
	}

	function filter(aggregated, callback) {
		var filtered = aggregated.filter(function (item) {
			return item.likes > 2;
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
		var date = moment(timespan.from).format('YYYY-MM-DD');

		mongo.pulse.update(
			{interval: interval, date: date},
			{interval: interval, date: date, timespan: timespan, results: resolved},
			{upsert: true, 'new': true},
			callback);
	}
}

function nearestTimespan(interval) {
	var intervals = {
		'day': function () {
			return {
				from: moment().startOf('day').toDate(),
				to: moment().endOf('day').toDate()
			};
		},
		'week': function () {
			return {
				from: moment().startOf('week').toDate(),
				to: moment().endOf('week').toDate()
			};
		},
		'month': function () {
			return {
				from: moment().startOf('month').toDate(),
				to: moment().endOf('month').toDate()
			};
		}
	};

	var nearest = intervals[interval];

	return nearest && nearest();
}

module.exports = pulse;