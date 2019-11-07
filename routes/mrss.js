const MRSS = require("../controllers/mrss");

module.exports = (server) => {
	/*** GET METHODS ***/

	// Get the feed based on the configs we have
	server.get('/feed', (req, res) => {
		MRSS.getFeed(req, (err, resp) => {
			// Return the proper error if we have one
    	res.setHeader('content-type', 'application/xml');
			if (err) return res.send(err.code, err.xml);
			return res.sendRaw(200, resp);
		});
	});

}