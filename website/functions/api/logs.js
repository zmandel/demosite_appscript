// api/logs.js

const g_maxLogsSend = 10; //maximum per request
const g_host = "mywebsite.com"; //REVIEW: set to your domain (for security)

exports.putLogsHandler = (req, res) => {
  function notAllowed() {
    res.status(405).send('Not Allowed');
  }

  //for improved security, the function can only be called from a forwarded request (done in firebase hosting)
  if (req.headers['x-forwarded-host'] !== g_host)
    return notAllowed();

  if (req.method !== 'PUT')
    return notAllowed();

  const logs = req.body.logs;
  if (!logs || !Array.isArray(logs) || logs.length > g_maxLogsSend)
    return notAllowed();

  logs.forEach((logEntry) => {
    console.log(JSON.stringify(logEntry)); //the firebase function is setup to send logs to Cloud Logging
  });

  res.status(200).send('OK');
};
