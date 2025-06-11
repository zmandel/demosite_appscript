const { onRequest } = require("firebase-functions/v2/https");
const express = require('express');
const { putLogsHandler } = require('./api/logs');

const app = express();
app.use(express.json());

app.put('/api/logs/putLogs', putLogsHandler);

// Firebase
exports.api = onRequest(
  { invoker: 'firebase-hosting@system.gserviceaccount.com' },
  app
);
