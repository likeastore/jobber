var _ = require('underscore');
var async = require('async');

var config = require('../config');
var db = require('./db')(config);
var elastic = require('./elastic')(config);
var timing = require('./utils/timing');

var indexName = 'feeds', typeName = 'item';

var mappings = {
	'item': {
		'properties': {
			'authorName': {
				'type': 'string'
			},
			'itemId': {
				'type': 'string',
				'index': 'not_analyzed'
			},
			'idInt': {
				'type': 'string',
				'store': 'false',
				'index': 'not_analyzed'
			},
			'created': {
				'type': 'date',
				'format': 'dateOptionalTime'
			},
			'date': {
				'type': 'date',
				'format': 'dateOptionalTime'
			},
			'description': {
				'type': 'string'
			},
			'source': {
				'type': 'string',
			},
			'type': {
				'type': 'string',
				'index': 'not_analyzed'
			},
			'user': {
				'type': 'string',
				'index': 'not_analyzed'
			},
			'feedOwner': {
				'type': 'string',
				'index': 'not_analyzed'
			},
			'userData': {
				'type': 'object',
				'index': 'not_analyzed'
			},
			'collection': {
				'type': 'object',
				'properties': {
					'title': {
						'type': 'string',
					},
					'description': {
						'type': 'string'
					},
					'owner': {
						'type': 'object',
						'index': 'not_analyzed'
					}
				}
			}
		}
	}
};

function indexFeed(callback) {
	var users = 0, items = 0;

	timing.start('user-feed-index');

	ensureIndex(function (err) {
		if (err) {
			return callback(err);
		}

		db.users
			.find({email: {$exists: true}, followCollections: {$exists: true}})
			.sort({_id: -1})
			.toArray(indexUserFeed);
	});

	function ensureIndex(callback) {
		elastic.indices.exists({index: indexName}, function (err, result) {
			if (err) {
				return callback(err);
			}

			if (result) {
				console.log('index already exists', indexName);
			} else {
				console.log('index is missing and will be created', indexName);
			}

			result ? callback(null) : createIndex(callback);
		});

		function createIndex(callback) {
			console.log('index does not exist, creating one');

			elastic.indices.create({index: indexName}, function (err) {
				if (err) {
					console.error('failed to created new index', indexName, err);
					return callback(err);
				}

				console.log('initalizing index mappings');

				elastic.indices.putMapping({index: indexName, type: typeName, body: mappings[typeName] }, function (err) {
					if (err) {
						console.log('failed to initialize index mappings');
						return callback(err);
					}

					console.log('index created successfully', indexName);
					callback(null);
				});
			});
		}
	}

	function indexUserFeed(err, users) {
		if (err) {
			return callback(err);
		}

		async.eachLimit(users, 16, retriveFeedAndIndex, function (err, results) {
			if (err) {
				return callback(err);
			}

			var duration = timing.finish('user-feed-index').asSeconds();

			callback(null, {users: users, items: items, duration: duration });
		});
	}

	function retriveFeedAndIndex(user, callback) {
		console.log('retrieving feed for user:', user.email);

		feed(user, function (err, items) {
			if (err) {
				console.error('failed to retrieve feed', user.email);
				return callback(err);
			}

			if (!items || items.length === 0) {
				console.log('users feed is empty, nothing to index');
				return callback(null);
			}

			users += 1;
			items += items.length;

			console.log('receieved ' + items.length + ' favorites');
			indexItems(user, items, callback);
		});
	}

	function feed(user, callback) {
		var follows = user.followCollections;

		console.log('user', user.email, 'follows', follows.length, 'collections');

		if (!follows || follows.length === 0) {
			return callback(null);
		}

		var ids = follows.map(function (f) {
			return f.id;
		});

		db.collections.aggregate([
			{
				$match: {_id: {$in: ids}}
			},
			{
				$unwind: '$items'
			},
			{
				$project: {
					_id: 0,
					item: '$items',
					collection: {
						_id: '$_id',
						title: '$title',
						description: '$description',
						owner: '$userData'
					}
				}
			},
			{
				$sort: { 'item.added': -1 }
			},
			{
				$limit: 512
			}
		], function (err, items) {
			items = (items && items.map(function (i) {
				return _.extend(i.item, {collection: i.collection, feedOwner: user.email});
			})) || [];

			callback(null, items);
		});
	}

	function indexItems(user, items, callback) {
		console.log('creating bulk operation for', indexName, 'index');

		var commands = [];

		items.forEach(function (item) {
			commands.push({'index': {'_index': indexName, '_type': typeName, '_id': item._id.toString()}});
			commands.push(item);
		});

		elastic.bulk({body: commands}, function (err) {
			if (err) {
				console.error('failed to bulk insert', user.email);
				return callback(err);
			}

			console.log('feed index sucessfully updated', user.email);
			callback(null);
		});
	}
}

function define(agenda) {
	agenda.define('index feed', function (job, callback) {
		indexFeed(callback);
	});

	agenda.every('6 hours', 'index feed');
}

module.exports = define;