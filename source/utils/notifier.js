var _ = require('underscore');
var request = require('request');
var config = require('../../config');
var logger = require('./logger');

function notifierRequestUrl() {
	return config.notifier.url + '/api/events?access_token=' + config.notifier.accessToken;
}

function notifier(e, data, callback) {
	var url = notifierRequestUrl();
	var event = _.extend({event: e.replace(/ /g, '-')}, {user: 'devs@likeastore.com'}, {data: data});

	request.post({url: url, body: event, json: true}, function (err) {
		if (err) {
			logger.warning({message: 'failed to send event to notifier', err: err});
		}

		callback && callback();
	});
}

module.exports = notifier;