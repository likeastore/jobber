var config = {
	connection: process.env.MONGO_CONNECTION,

	mandrill: {
		token: '2kXX0stV1Hf56y9DYZts3A'
	},

	logentries: {
		token: 'dda9ed8e-678b-42b8-ab15-b7cec4a6ee1d'
	},

	analytics: {
		url: 'http://localhost:3005',
		application: 'likeastore-development',
		username: 'likeastore',
		password: 'mypass'
	}
};

module.exports = config;