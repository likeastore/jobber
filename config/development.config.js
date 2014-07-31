var config = {
	connection: 'mongodb://localhost:27017/likeastoreproddb',

	mandrill: {
		token: null,
	},

	mixpanel: {
		api: 'http://api.mixpanel.com',
		token: null
	},

	logentries: {
		token: null
	},

	elastic: {
		host: {
			host: 'localhost'
		},

		requestTimeout: 10000
	},

	notifier: {
		url: 'http://localhost:3031',
		accessToken: '1234'
	}
};

module.exports = config;