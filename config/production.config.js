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
			protocol: 'https',
			host: 'search.likeastore.com',
			port: 443,
			query: {
				access_token: process.env.ELASTIC_ACCESS_TOKEN
			}
		},

		requestTimeout: 5000
	}
};

module.exports = config;