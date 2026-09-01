const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const app = require('./src/api/app');

// Blueprint Sec 7: Fixed region for INFRIA deployment
setGlobalOptions({ region: 'asia-southeast2', maxInstances: 10 });

exports.api = onRequest(
  {
    cors: true
  },
  app
);
