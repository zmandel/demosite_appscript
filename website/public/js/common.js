/* Common utilities and initialization for the integration of the website with the apps script iframes.
* 
* - Handles Google Tag Manager (GTM) loading and configuration.
* - Provides error handling for the base iframe.
* - Initializes the page, including analytics, iframe loading, and event listeners.
* - Processes messages from the embedded iframe, including URL parameter changes, analytics events, and logs.
* - Manages URL parameters and validates organization signatures.
* - Utility functions for loading states, cryptographic verification.
* - "analytics" function: Sends custom events as a "select_content" event with your specified event name as an "item_id".
*   To be able to use reporting based on the "item_id", create a "item_id" event-scoped custom dimension in your GTM account: https://support.google.com/analytics/answer/14239696
*/

/**
 * Default apps script (when not set in the URL)
 * This is called the "org" parameter in the URL, using this default when not set in the URL.
 * Using different orgs lets you use different apps script deployments, for example, for development and production,
 * or for different clients, each with scripts under their own Workspace account.
 * When using a different "org", the "sig" parameter must be set to a valid signature. (see the github documentation)
*/
const g_orgDefault = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; //REVIEW: replace with your own

const g_endpointPutLogs = "/api/putlogs"; //REVIEW: endpoint for sending error/warning logs from the iframe to the firebase function
/**
 * Public key for verifying signatures.
*/
const g_publicKeyJwk = { //REVIEW: replace with your own public key
    "kty": "EC",
    "crv": "P-256",
    "x": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "y": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "ext": true
};

/**
 * Google Tag Manager ID
 * Replace with your actual GTM ID.
 */
const g_idGTM = 'G-XXXXXXXXXX';

/**
 * Parameters allowed in the URL. Others are ignored.
 * Initialized during initializePage.
*/
let g_paramsClean = {
    org: g_orgDefault,
    sig: "",
    lang: "", //sample "language" parameter demoed in page1
    //REVIEW: add or customize parameters as needed
}

/**
 * Dimensions for Google Tag Manager (GTM)
 * Use for tracking custom dimensions in GTM, for example the language of the page for the current session.
 * You need to first set up your custom dimensions in your GTM account, then configure them here and in XXXX 
*/
//g_dimensionsGTM: custom dimensions for GTM. can be empty.
const g_dimensionsGTM = {
    // "dimension1": null,
    // "dimension2": null,
    //REVIEW: replace with your own
};

/*
 * Initializes custom dimensions for GTM (g_dimensionsGTM)
 * called only once, during initializePage
 * This function can be modified to set custom dimensions based on URL parameters or other criteria.
*/
function initializeCustomDimensions(params) {
    // Example of how to set custom dimensions based on URL parameters
    //g_dimensionsGTM["dimension1"] = params.dimension1;
    //g_dimensionsGTM["dimension2"] = params.dimension2;
    //REVIEW: replace with your own
}

/** localStorage usage
 *
 * localStorage["gtag_disabled"] = "1" will disable GTM loading. Useful to mark all developer/tester machines as excluded from GTM.
 */

/**
 * Set to true when you need GTM to load on localhost or to bypass 'gtag_disabled'
 * false is default in production. true is used for development purposes.
 * NOTE: localStorage["gtag_disabled"] = "1" will disable GTM loading (unless this is set to true).
 */
const g_forceGTM = false;

/**
 * //REVIEW: replace with your own error handling
 * used as an error callback for initializePage
 */
export function onErrorBaseIframe() {
    hideLoading();
    let elem = document.querySelector('#errPage');
    if (elem)
        elem.style.display = "block"; //it is hidden by default in the HTML}, so show it.
}

/**
 * Loads the Google Tag Manager (GTM) script
 * Skips loading on localhost or when 'gtag_disabled' is set in local storage, unless g_forceGTM is true.
 * Appends the GTM script to the document head.
 */
export function loadGTM() {
    beforeLoadGTM();
    const host = window.location.hostname;
    if (!host.includes('.') || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || localStorage.getItem('gtag_disabled') == "1") {
        if (!g_forceGTM)
            return; //ignore local or disabled
    }

    var script = document.createElement('script');
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + g_idGTM;
    document.head.appendChild(script);
}

/**
 * events that the iframe can send:
 * - analyticsEvent
 * - siteInited
* - siteFullyLoaded
* - logs
* - titleChange
* - urlParamChange 
*/

/**
 * Initializes the main page logic for the Apps Script iframe integration.
 * @param {Object} options - Options for initialization
 * @param {boolean} options.loadIframe - Whether to load the iframe
 * @param {boolean} options.loadAnalytics - Whether to load analytics (can be loaded later as well)
 * @param {Object} options.paramsExtra - Extra parameters to pass to the iframe URL
 * @param {Function} options.callbackMessage - Callback for message events received from the iframe
 * @param {Function} options.onError - Callback for error events during initialization
 * @param {Function} options.callbackContentLoaded - Callback for the content loaded event
 * 
 */
export async function initializePage({
    loadIframe,
    loadAnalytics,
    paramsExtra,
    callbackMessage,
    onError,
    callbackContentLoaded
} = {}) {
    let initedBase = await initializeBase();

    function sendLogsToServer(logQueue) {
        fetch(g_endpointPutLogs, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logs: logQueue })
        }).catch((e) => {
            console.error('Error sending logs', e);
        });
    }

    window.addEventListener("message", function (event) {
        if (!event.origin.endsWith(".googleusercontent.com")) {
            console.warn("Message from unknown origin:", event.origin);
            return;
        }

        if (event.data && event.data.type === "FROM_IFRAME") {
            //REVIEW: add your own custom events here
            if (event.data.action == "siteInited") {
                //this event comes from the script´s postSiteInited
                const dontStopProgress = event.data?.data?.dontStopProgress;
                g_loadedFrame = true;
                cleanupTimeoutIdiframe();
                document.querySelector("iframe").style.opacity = "1";
                if (!dontStopProgress) {
                    hideLoading();
                }
            }
            else if (event.data.action == "siteFullyLoaded") {
                hideLoading();
            }
            else if (event.data.action == "titleChange") {
                //if the current title already has a separator replace the first part, otherwise replace the whole title
                const sep = " - ";
                if (!document.title.includes(sep)) {
                    document.title = event.data.data.title;
                } else {
                    document.title = document.title.split(sep)[0] + sep + event.data.data.title;
                }
            }
            else if (event.data.action == "logs") {
                const logs = event.data.data.logs;
                if (!logs || !Array.isArray(logs) || logs.length == 0) {
                    console.error("Invalid logs");
                    return;
                }
                sendLogsToServer(logs);

            }
            else if (event.data.action == "analyticsEvent") {
                if (gtag) {
                    gtag('event', 'select_content', {
                        content_type: 'button',
                        item_id: event.data.data.name
                    });
                }
            }
            else if (event.data.action == "urlParamChange") {
                const dataEvent = event.data.data;
                if (dataEvent && typeof dataEvent === 'object' && dataEvent.urlParams) {
                    const urlParams = dataEvent.urlParams;
                    const url = new URL(window.location.href);
                    Object.entries(urlParams).forEach(([key, value]) => {
                        if (value == null) {
                            url.searchParams.delete(key);
                            g_paramsClean[key] = null;
                        } else {
                            url.searchParams.set(key, value);
                            g_paramsClean[key] = value;
                        }
                    });
                    if (dataEvent.refresh)
                        window.location.replace(url);
                    else
                        window.history.replaceState({}, document.title, url);

                    if (callbackMessage)
                        callbackMessage(event.data); //propagate
                }
            }
        }
    });

    function onContentLoadedBase() {
        if (!initedBase) {
            cleanupTimeoutIdiframe(); //to be useful in the future
            if (onError)
                onError();
            return;
        }
        if (loadAnalytics)
            loadGTM();
        if (callbackContentLoaded)
            callbackContentLoaded();
        if (loadIframe)
            loadIframeFromCurrentUrl(paramsExtra);
    }

    if (document.readyState !== "loading") {
        onContentLoadedBase();
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            onContentLoadedBase();
        });
    }
}

let gtag = null;
/** crypto helper */
function base64UrlToArrayBuffer(base64url) {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/'); //Base64url to standard Base64.
    // Add padding if needed.
    while (base64.length % 4)
        base64 += '=';

    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/** crypto helper */
async function verifyScript(org, signatureBase64Url) {
    let isValid = false;
    try {
        if (org && !signatureBase64Url)
            return false;
        const alg = "ECDSA";
        const publicKey = await window.crypto.subtle.importKey(
            "jwk",
            g_publicKeyJwk,
            {
                name: alg,
                namedCurve: g_publicKeyJwk.crv
            },
            true,
            ["verify"]
        );

        const signatureBuffer = base64UrlToArrayBuffer(signatureBase64Url);
        const encoder = new TextEncoder();
        const messageBuffer = encoder.encode(org);
        isValid = await window.crypto.subtle.verify(
            {
                name: alg,
                hash: { name: "SHA-256" }
            },
            publicKey,
            signatureBuffer,
            messageBuffer
        );
    }
    catch (error) {
        console.error("Error verifying script", error);
        isValid = false;
    }
    return isValid;
}

/** helper */
async function initializeBase() {
    const params = new URLSearchParams(window.location.search);
    //set g_paramsClean with allowed values from the URL
    Object.keys(g_paramsClean).forEach(key => {
        if (params.has(key))
            g_paramsClean[key] = params.get(key);
    }
    );

    if (params.has("org")) {
        const isValid = await verifyScript(g_paramsClean.org, g_paramsClean.sig);
        if (!isValid)
            return false;
    }

    initializeCustomDimensions(g_paramsClean);
    beforeLoadGTM();
    return true;
}

let g_loadedFrame = false;
let g_timeoutIdiframe = null;


/**
 * Hides the loading page elements.
 * This function is called when the iframe has loaded or when an error occurs.
 * It hides both the short and long loading pages. 
 * 
*/
function hideLoading() {
    let elem = document.getElementById("loadingPage");
    if (elem)
        elem.style.display = "none";

    elem = document.getElementById("loadingPageLong");
    if (elem)
        elem.style.display = "none";
}

/** helper */
function cleanupTimeoutIdiframe() {
    if (g_timeoutIdiframe) {
        clearTimeout(g_timeoutIdiframe);
        g_timeoutIdiframe = null;
    }
}

/**
 * Loads the iframe from the current URL with the given extra parameters. 
 * It handle the loading state, showing a loading page until the iframe is fully loaded.
 * This function sets a timeout to show a long loading page if the iframe does not load within 10 seconds.
 * @param {string} paramsExtra - Extra parameters to append to the iframe URL.
 */
function loadIframeFromCurrentUrl(paramsExtra) {
    cleanupTimeoutIdiframe();
    g_timeoutIdiframe = setTimeout(function () {
        if (!g_loadedFrame) {
            document.getElementById("loadingPage").style.display = "none";
            document.getElementById("loadingPageLong").style.display = "";
        }
    }, 10000);

    g_loadedFrame = false;
    document.getElementById("loadingPageLong").style.display = "none";
    document.getElementById("loadingPage").style.display = "";
    document.querySelector('iframe').style.opacity = "0";

    let url = `https://script.google.com/macros/s/${g_paramsClean.org}/exec?embed=1&${paramsExtra}`;
    document.querySelector('iframe').src = url;
}

let g_beforeGTMFinished = false;
/** helper */
function beforeLoadGTM() {
    if (g_beforeGTMFinished)
        return;

    if (!window.dataLayer)
        window.dataLayer = [];

    gtag = function () {
        window.dataLayer.push(arguments);
    }

    let dimensionsGTM = {};
    Object.entries(g_dimensionsGTM).forEach(([name, value]) => {
        if (typeof value !== 'undefined' && value !== null && value !== '')
            dimensionsGTM[name] = value;
    });

    gtag('js', new Date());
    if (Object.keys(dimensionsGTM).length > 0)
        gtag('config', g_idGTM, dimensionsGTM);

    g_beforeGTMFinished = true;
}

