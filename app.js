var pulse = require('./source/jobs/pulse');
var moment = require('moment');

var current = moment();

pulse('day', function (err, results) {
	if (err) {
		return console.error('pulse failed', err);
	}

	var done = moment();

	console.log('pulse succeeded, timing:' + moment.duration(done.diff(current)).asMilliseconds(), results);
});