var config = {
	connection: process.env.MONGO_CONNECTION,

	mandrill: {
		token: process.env.MANDRILL_TOKEN
	},

	mixpanel: {
		api: 'http://api.mixpanel.com',
		token: process.env.MIXPANEL_TOKEN
	},

	logentries: {
		token: process.env.LOGENTRIES_TOKEN
	},

	elastic: {
		host: {
			host: 'localhost'
		},

		requestTimeout: 10000
	}
};

module.exports = config;