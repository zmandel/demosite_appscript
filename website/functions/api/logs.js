// api/logs.js

const g_maxLogsSend = 10; // Maximum logs per request (keep in sync with the apps script version of this constant)
// The host expected in the forwarded request header.
const g_host = process.env.ALLOWED_HOST || null;

exports.putLogsHandler = (req, res) => {
    function notAllowed() {
        res.status(405).send('Not Allowed');
    }

    // For improved security, the function can only be called from a forwarded
    // request (done in Firebase Hosting).
    if (g_host && req.headers['x-forwarded-host'] !== g_host) {
        return notAllowed();
    }

    if (req.method !== 'PUT') {
        return notAllowed();
    }

    const logs = req.body.logs;
    if (!logs || !Array.isArray(logs) || logs.length > g_maxLogsSend) {
        return notAllowed();
    }

    logs.forEach((logEntry) => {
        // The Firebase function is set up to forward these console logs to Cloud
        // Logging.
        console.log(JSON.stringify(logEntry));
    });

    res.status(200).send('OK');
};
