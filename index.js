const restify = require('restify'),
	  plugins = require('restify').plugins,
	  config = require('./config'),
	  corsMiddleware = require('restify-cors-middleware');

var server = restify.createServer();

const cors = corsMiddleware({
  origins: ['*']
})

server.pre(cors.preflight)
server.use(cors.actual)

server.pre(restify.pre.userAgentConnection());
server.pre(restify.pre.sanitizePath());

server.pre(function(req, res, next) {
  req.headers.accept = 'application/json';
  return next();
});

server.use(restify.plugins.acceptParser(server.acceptable));

server.use(restify.plugins.queryParser({
	mapParams: true
}));

server.use(restify.plugins.bodyParser({
	mapParams: true
}));

server.use(restify.plugins.jsonp());

// Bring in our routes
require('./routes')(server);

server.listen(config.port, function() {
  console.log('%s listening at %s', server.name, server.url);
});

module.exports = server;
