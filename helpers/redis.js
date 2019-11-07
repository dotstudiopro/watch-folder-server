const config = require('../config'),
			Redis = require('ioredis')
if (config.redis) {
	const redisConn = new Redis({
	  port: config.redis.port,          // Redis port
	  host: config.redis.endpoint,   // Redis host
	  family: 4,           // 4 (IPv4) or 6 (IPv6)
	  password: config.redis.password
	});

	/**
	 * Get a stored Redis value if one exists
	 * @since 1.0.0
	 *
	 * @param {string} redisKey - The key for the Redis store that has the value
	 * @returns {Promise}
	 */
	const get = (redisKey) => {
		return new Promise((resolve, reject) => {
			redisConn.get(redisKey, function (err, result) {
			  if (err) return reject(err);
			  // Normally we would worry about this failing
			  // when grabbing objects from Redis since they
			  // don't have a length, but we are only pulling
			  // MRSS XML, which should be a string w/ a length
			  if (!result || !result.length) return reject("No value present in Redis for '" + redisKey + "'");
			  return resolve(result);
			});
		});
	}

	/**
	 * Get a stored Redis value if one exists
	 * @since 1.0.0
	 *
	 * @param {string} redisKey - The key for the Redis store we are saving the value for
	 * @param {any} redisVal - The value we are saving
	 * @returns {Promise}
	 */
	const set = (redisKey, redisVal) => {
		return new Promise((resolve, reject) => {
			redisConn.set(redisKey, redisVal, function (err, result) {
			  if (err) return reject(err);
			  // We are storing approximately the same data every time,
			  // so we don't need to give resource types their own
			  // expiration time
			  redisConn.expire(redisKey, 3600)
			  return resolve(result);
			});
		});
	}

	module.exports = {
		get,
		set
	}
}