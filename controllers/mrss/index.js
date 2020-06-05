const config = require(process.cwd() + "/config"),
			awsConfig = require(process.cwd() + "/aws-config"),
			jsonxml = require('jsontoxml'),
			fs = require('fs'),
			redis = require('../../helpers/redis');

/**
 * Get what we need from AWS to compile an MRSS Feed
 * @since 1.0.0
 *
 * @param {object} req - The request object from Restify
 * @param {function} callback - The callback function to send the result to the router
 * @returns {function}
 */
const getFeedData = (req, callback) => {
	// Load the SDK and UUID
	const AWS = require('aws-sdk');
	const uuid = require('uuid');
	AWS.config.loadFromPath(process.cwd() + '/aws-config.json');

	// Get our bucket value
	const bucketName = req.params.bucket || awsConfig.default_bucket;

	// Basic default configs
	const base_aws_url = "https://s3.amazonaws.com/";

	// Create a promise on S3 service object
	const params = {
		Bucket: bucketName,
		Delimiter: "/"
	}

	const folder = req.params.folder || awsConfig.folder;

	if (folder && folder.length) {
		params.Prefix = folder + "/";
	}
	const bucketPromise = new AWS.S3({
		apiVersion: '2006-03-01'
	}).listObjectsV2(params).promise();

	// Handle promise fulfilled/rejected states
	bucketPromise
		.then(async data => {
			let truncated = data.IsTruncated;
			let dataHolder = data;
			// Make sure we get all values if AWS has truncated it
			if (dataHolder.IsTruncated) {
				while (truncated) {
					params.ContinuationToken = dataHolder.NextContinuationToken;
					const nextPromise = new AWS.S3({
						apiVersion: '2006-03-01'
					}).listObjectsV2(params).promise();
					const nextData = await nextPromise.catch(err => {
						throw new Error(err)
					});
					data.Contents = data.Contents.concat(nextData.Contents);
					dataHolder = nextData;
					truncated = dataHolder.IsTruncated;
				}
			}
			const objects = data.Contents;
			console.log({
				totalNum: objects.length
			})
			if (!objects.length) throw "No objects in bucket.";
			const mrssJson = {
				"channel": [{
					"name": "title",
					"text": "dotstudioPRO S3 Bucket MRSS Feed",
				}, {
					"name": "link",
					"text": (req.isSecure()) ? 'https' : 'http' + '://' + req.headers.host + "/feed",
				}, {
					"name": "description",
					"text": "MRSS Feed for ingesting videos into dotstudioPRO",
				}]
			};
			objects
				// Make sure we only grab video files
				.filter(obj => {
					console.log({
						key: obj.Key
					})
					return ['mp4', 'mov', 'mpg'].indexOf(obj.Key.split(".").pop()) > -1
				});


			var promises = [];
			objects.forEach(function(obj) {
				promises.push(
					getS3signedUrl(bucketName, obj, AWS)
					.then(function(data) {
						// Make sure we aren't grabbing the root folder and setting it up as media
						if (obj.Key === params.Prefix) return;
						const json = {
							"item": [{
								"name": "title",
								"text": obj.Key.replace('&', ''),
							}, {
								"name": "link",
								"text": base_aws_url + bucketName + "/",
							}, {
								"name": "description",
								"text": obj.Key.replace('&', '') + ", last modified: " + obj.LastModified,
							}, {
								"name": "guid",
								"text": Buffer.from(obj.LastModified + obj.Key).toString('base64'),
								"attrs": {
									"isPermaLink": "false"
								}
							}, {
								"name": "media:content",
								"attrs": {
									"url": data,
									"fileSize": obj.Size,
								},
								"children": [{
									"name": "media:title",
									"text": obj.Key.replace('&', '')
								}]
							}, ]
						};
						console.log(json);
						mrssJson.channel.push(json);
					}).catch(function(error) {
						console.log('Error: ', error);
					})
				);
			});

			Promise.all(promises).then(() =>

				fs.readFile(process.cwd() + "/views/mrss.xml", "utf8", (err, data) => {
					const finalMrss = data.replace("CONTENT_GOES_HERE", jsonxml(mrssJson));
					if (config.redis) {
						// If we have a Redis config, assume we have a Redis connection
						const redisKey = 'dotstudioPRO_Watch_Folder:' + awsConfig.default_bucket;
						redis.set(redisKey, finalMrss)
							.then(result => {
								// Assume all went well
							})
							.catch(err => {
								console.log("Error setting key in Redis: ", err);
							});
					}
					// Note that we return the callback outside of the Redis key save
					// because we don't need to hold the user up while we are caching
					// items; this isn't going to be constantly hit anyway, so the
					// caching is almost for show at this point
					return callback(null, finalMrss);
				})
			);


		}).catch(err => {
			console.error(err);
			return callback({
				code: 400,
				msg: err
			})
		});
}

/**
 * Quick pit stop to see if we have a Redis config and to see if our data is stored in Redis
 * @since 1.0.0
 *
 * @param {object} req - The request object from Restify
 * @param {function} callback - The callback function to send the result to the router
 * @returns {function}
 */
const getFeed = (req, callback) => {
	if (config.redis) {
		// If we have a Redis config, assume we have a Redis connection
		const redisKey = 'dotstudioPRO_Watch_Folder:' + awsConfig.default_bucket;
		redis.get(redisKey)
			.then(val => {
				console.log("Getting feed from Redis");
				return callback(null, val);
			})
			.catch(err => {
				console.log(err);
				return getFeedData(req, callback);
			});
	} else {
		return getFeedData(req, callback);
	}
}

const getS3signedUrl = (bucketName, obj, AWS) => {
	var s3 = new AWS.S3({
		apiVersion: '2006-03-01'
	});
	var url = s3.getSignedUrl('getObject', {
		Bucket: bucketName,
		Key: obj.Key,
		Expires: 60 * 60 * 24 * 7  // 7 days = 604800 seconds
	});
	console.log(url);
	url = url.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
	return Promise.resolve(url);
}

module.exports = {
	getFeed
}