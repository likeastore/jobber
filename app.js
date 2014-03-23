var Agenda = require('agenda');
var config = require('./config');

var pulse = require('./source/jobs/pulse');
var logger = require('./source/utils/logger');
var timing = require('./source/utils/timing');

var agenda = new Agenda({db: {address: config.connection, collection: 'jobs'}, defaultConcurrency: 1});

agenda.define('daily pulse', function (job, callback) {
	pulse('day', callback);
});

agenda.define('weekly pulse', function (job, callback) {
	pulse('week', callback);
});

agenda.define('month pulse', function (job, callback) {
	pulse('month', callback);
});

// agenda.every('1 minute', 'daily pulse');
// agenda.every('1 minute', 'weekly pulse');
agenda.every('1 minute', 'month pulse');

agenda.on('start', function (job) {
	timing.start(job.attrs.name);
	logger.info({message: 'job started', job: job.attrs.name});
});

agenda.on('success', function (job) {
	var duration = timing.finish(job.attrs.name);
	logger.success({message: 'job compeleted', job: job.attrs.name, duration: duration.asMilliseconds()});
});

agenda.on('fail', function (err, job) {
	logger.error({message: 'job failed', job: job.attrs.name, err: err});
});

agenda.start();