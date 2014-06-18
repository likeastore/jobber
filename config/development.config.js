var config = {
	connection: 'mongodb://localhost:27017/likeastoredb',

	mandrill: {
		token: null,
	},

	mixpanel: {
		api: 'http://api.mixpanel.com',
		token: null
	},

	logentries: {
		token: null
	}
};

module.exports = config;