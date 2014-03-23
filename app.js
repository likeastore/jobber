var Agenda = require('agenda');
var config = require('./config');

var pulse = require('./source/jobs/pulse');
var logger = require('./source/utils/logger');
var timing = require('./source/utils/timing');

var agenda = new Agenda({db: {address: config.connection, collection: 'jobs'} });

agenda.purge(function () {
	agenda.define('measure pulse day', function (job, callback) {
		pulse('day', callback);
	});

	agenda.define('measure pulse week', function (job, callback) {
		pulse('week', callback);
	});

	agenda.define('measure pulse month', function (job, callback) {
		pulse('month', callback);
	});

	agenda.every('10 minutes', 'measure pulse day');
	agenda.every('30 minutes', 'measure pulse week');
	agenda.every('60 minutes', 'measure pulse month');

	agenda.on('start', function (job) {
		timing.start(job.attrs.name);
		logger.info({message: 'job started', job: job.attrs.name });
	});

	agenda.on('success', function (job) {
		var duration = timing.finish(job.attrs.name);
		logger.success({message: 'job compeleted', job: job.attrs.name, duration: duration.asMilliseconds()});
	});

	agenda.on('fail', function (err, job) {
		logger.error({message: 'job failed', job: job.attrs.name, err: err});
	});

	agenda.start();
});
