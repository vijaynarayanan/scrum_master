var appServer = require('./index');
appServer.listen({ port: process.env.PORT || 3000, debug: true });