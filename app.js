var Agenda = require('agenda');
var config = require('./config');

// jobs
var pulse = require('./source/jobs/pulse');
var mixpanel = require('./source/jobs/mixpanel');
var indexFeed = require('./source/jobs/indexFeed');

// helpers
var logger = require('./source/utils/logger');
var timing = require('./source/utils/timing');

var agenda = new Agenda({db: {address: config.connection, collection: 'jobs', defaultConcurrency: 1, maxConcurrency: 1} });

agenda.purge(function () {
	pulse(agenda);
	mixpanel(agenda);

	//indexFeed(agenda);

	agenda.start();
});

// pulse(agenda);
// mixpanel(agenda);
// indexFeed(agenda);

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
