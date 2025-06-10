const { onRequest } = require("firebase-functions/v2/https");
const express = require('express');
const { putLogsHandler } = require('./api/logs');

const app = express();
app.use(express.json());


//optional rewrite to reorganize methods
app.use((req, res, next) => {
  if (req.path === '/api/putlogs') {
    req.url = '/logs/putlogs';
  }
  next();
});

app.put('/logs/putlogs', putLogsHandler);

// Firebase
exports.api = onRequest(
  { invoker: 'firebase-hosting@system.gserviceaccount.com' },
  app
);
