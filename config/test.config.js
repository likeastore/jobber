var config = {
	connection: 'mongodb://localhost:27017/likeastoretestdb',

	mandrill: {
		token: null
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