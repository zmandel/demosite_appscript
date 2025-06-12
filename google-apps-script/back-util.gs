/* Utilities for:
 * - manual structured logging (with callstacks) to GCP. (error_, warn_, log_)
 * - error handling (throwOnError, throwError, etc.)
 * - "include_" function to include "js" files from HTML files
 * - a simple sample routing for two pages
 */

const g_moduleLog = "backend"; //GCP logging tag

/**
 * sample routing (page 1 or page 2)
 */
function doGet(e) {
    let bPage2 = false;

    if (e.parameter) {
        if (e.parameter.page === "2")
            bPage2 = true;
    }

    let file = "";
    let title = "";

    if (bPage2) {
        title = "page 2";
        file = "html-page2";
    }
    else {
        title = "page 1";
        file = "html-page1";
    }

    let template = HtmlService.createTemplateFromFile(file);
    template.title = title;
    let htmlOutput = template.evaluate();
    htmlOutput.addMetaTag('viewport', 'width=device-width, initial-scale=1.0, interactive-widget=resizes-content');
    htmlOutput.setTitle(title);
    //htmlOutput.setFaviconUrl('https://....png'); //not visible in iframe mode, but can be set here if you also support standalone mode
    htmlOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); //allows embedding
    return htmlOutput;
}

/**
 * include script files from html
 */
function include_(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Checks the response for errors.
 * Optionally parses error details, logs warnings, and throws if an error is found.
 * @param {Object} response - The response object to check.
 * @param {boolean} [bParseError=false] - If true, attempts to parse and log error details from the response text.
 * @returns {void}
 */
function throwOnError(response, bParseError = false) {
    const responseCode = (response && response.getResponseCode());
    let textError = "unknown error";
    const isError = (!responseCode || responseCode < 200 || responseCode >= 300);
    let appended = "";
    function appendWarn(str) {
        if (!appended)
            appended = str;
        else
            appended += ("\n" + str);
    }

    if (isError) {
        const responseText = (response ? response.getContentText() : null);
        if (responseText)
            textError = responseText;

        if (responseText && bParseError) {
            try {
                const errorData = JSON.parse(responseText);
                appendWarn("Error Code (from JSON): " + errorData.error.code);
                appendWarn("Error Message: " + errorData.error.message);
                appendWarn("Error Status: " + errorData.error.status);

                textError = `${errorData.error.message} | status ${errorData.error.status} | code ${errorData.error.code}`;

                if (errorData.error.details) {
                    appendWarn("Error Details:");
                    errorData.error.details.forEach(detail => {
                        appendWarn(JSON.stringify(detail, null, 2));
                    });
                }
            } catch (e) {
                appendWarn("Raw error response: " + responseText);
                //fall through
            }
        }

        try {
            if (appended)
                warn_(appended);
        }
        catch (e) {
            //no warn_ again
            //fall through
        }

        throwError(textError);
    }
    return;
}

/**
 * Logs and Throws an Error with the given argument
 * @param {any} arg - The error message or object.
 * @throws {Error}
 */
function throwError(arg) {
    arg = arg || "unknown error";
    error_("throw: " + arg);
    throw new Error(arg);
}

/**
 * Throws a generic error
 * @returns {void}
 */
function throwErrorGeneric() {
    throwError(null);
}

/**
 * Logs arguments as an error
 * @param {...any} args - Arguments to log
 */
function error_(...args) {
    logBase_(false, true, ...args);
}

/**
 * Logs arguments as a warning
 * @param {...any} args - Arguments to log
 */
function warn_(...args) {
    logBase_(true, false, ...args);
}

/**
 * Logs arguments as a debug message
 * @param {...any} args - Arguments to log
 */
function log_(...args) {
    logBase_(false, false, ...args);
}

/** helper */
function payloadBase(message) {
    const unk = "unknown";

    const payload = {
        message: g_moduleLog + ": " + message,
        functionName: unk,
        callStack: unk,
        moduleLog: g_moduleLog,
    };
    return payload;
}

/** helper */
function generateLogPayload(...args) {
    const unk = "unknown";

    const message = args.map(arg => {
        if (typeof arg === 'object') {
            try {
                if (arg instanceof Error)
                    return "Error obj: " + (arg.message || unk);
                return JSON.stringify(arg);
            } catch (err) {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');

    let payload = payloadBase(message);

    const IGNORED = [
        "throwErrorGeneric",
        "throwError",
        "error_",
        "warn_",
        "log_",
        "logBase_"
    ];

    function parseFnName(line) {
        try {
            const match = line.match(/at (\S+) \(/);
            if (match)
                return match[1];
        } catch (e) {
            error_(e);
            //fall through
        }
        return "";
    }

    function getCleanStackLines(stackLines) {
        let startIndex = 2;

        while (startIndex < stackLines.length) {
            const line = stackLines[startIndex];
            if (line.trim() && !IGNORED.includes(parseFnName(line))) {
                break;
            }
            startIndex++;
        }

        // Return the slice starting at the first valid line.
        return stackLines.slice(startIndex);
    }

    try {
        const error = new Error("");
        error.name = "";
        const stack = getCleanStackLines(error.stack?.split("\n") || []);

        let nameFunction = null;
        if (stack.length > 0)
            nameFunction = parseFnName(stack[0]);

        payload.functionName = nameFunction || unk;
        payload.callStack = stack.join("\n") || unk;
    } catch (e) {
        //fall through
    }
    return payload;
}

let g_isLogging = false; //to prevent recursive logging
/** helper */
function logBase_(bWarn, bError, ...args) {
    try {
        let payload = null;
        let wasLogging = g_isLogging;
        g_isLogging = true;
        if (wasLogging) {
            Logger.warning("recursive log within logBase_");
            payload = payloadBase(args[0]);
        }
        else
            payload = generateLogPayload(...args);

        //note: since the backend doesnt queue them (unlike the frontend) it doesnt add an explicit timestamp
        if (bWarn)
            Logger.warning(payload);
        else if (bError)
            Logger.severe(payload);
        else
            Logger.log(payload); //this one understands the payload
    } catch (e) {
        //fall through, no logging
    }
    g_isLogging = false;
}
