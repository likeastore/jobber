var async = require('async');
var moment = require('moment');
var mongo = require('../db/mongo');

function nearestTimespan(interval) {
	var intervals = {
		'half-hour': 30,
		'hour': 60,
		'six-hours': 360,
		'twelve-hours': 720,
		'day': 1440
	};

	var minutes = intervals[interval];
	var current = moment();

	return {
		from: current.subtract(minutes, 'minutes'),
		to: current
	};
}

function pulse(interval, callback) {
	var timespan = nearestTimespan(interval);

	async.waterfall([
		aggregate,
		store
	], callback);

	function aggregate(likes, callback) {
		mongo.items.aggregate([
			{
				$match: {created: {$gte: timespan.from, $lt: timespan.to}}
			},
			{
				$group: {}
			}
		], callback);
	}

	function store(aggregated, callback) {
		mongo.pulse.save({interval: interval, timespan: timespan, results: aggregated}, callback);
	}
}

module.exports = pulse;