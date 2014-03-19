var config = {
	connection: 'mongodb://localhost:27017/likeastoredb',

	mandrill: {
		token: '2kXX0stV1Hf56y9DYZts3A'
	},

	logentries: {
		token: null
	},

	analytics: {
		url: 'http://localhost:3005',
		application: 'likeastore-development',
		username: 'likeastore',
		password: 'mypass'
	}
};

module.exports = config;