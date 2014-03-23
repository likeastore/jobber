var config = {
	connection: process.env.MONGO_CONNECTION,

	mandrill: {
		token: '2kXX0stV1Hf56y9DYZts3A'
	},

	logentries: {
		token: '95bf3d71-0b03-455f-b096-2a080961782d'
	},

	analytics: {
		url: 'http://localhost:3005',
		application: 'likeastore-development',
		username: 'likeastore',
		password: 'mypass'
	}
};

module.exports = config;