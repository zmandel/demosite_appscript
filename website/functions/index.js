const { onRequest } = require("firebase-functions/v2/https");
const express = require('express');
const { putLogsHandler } = require('./api/logs/logs');

const onlyAllowFromHosting = false;
const app = express();
app.use(express.json());

app.put('/api/logs/putlogs', putLogsHandler);

// Firebase
exports.api = onRequest(
 {
    ...(onlyAllowFromHosting && { invoker: 'firebase-hosting@system.gserviceaccount.com' })
  },
  app
);