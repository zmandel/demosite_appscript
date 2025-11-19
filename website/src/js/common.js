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

export default toast;

export const g_isProduction = ("true" === import.meta.env.VITE_IS_PRODUCTION);
const g_orgDefault = import.meta.env.VITE_ORG_DEFAULT;
const g_endpointPutLogs = import.meta.env.VITE_ENDPOINT_PUT_LOGS;
const g_firebaseProjname = import.meta.env.VITE_FIREBASE_PROJNAME;
const g_rootDomain = import.meta.env.VITE_ROOT_DOMAIN;
const g_idGTM = import.meta.env.VITE_GTM_ID; //Google Tag Manager ID
const g_langDefault = import.meta.env.VITE_LANG_DEFAULT;
let g_lang = "";

/**
 * Public key for verifying signatures.
*/
//CUSTOMIZE: replace with your own public key generated from util-org-sig/readme.md
const g_publicKeyJwk = {
  "kty": "EC",
  "crv": "P-256",
  "x": import.meta.env.VITE_PUBLIC_KEY_X,
  "y": import.meta.env.VITE_PUBLIC_KEY_Y,
  "ext": true
};


let g_mapsLang = {
  "en": {},
  "es": {}
};

/**
 * Parameters allowed in the URL. Others are ignored.
 * Initialized during initializePage.
*/
let g_paramsClean = {
  org: g_orgDefault,
  sig: "",
  lang: "en",
  //CUSTOMIZE: add or modify parameters as needed
}

//CUSTOMIZE: replace with your own. properties are appended to each log sent to the server. Return null or an empty object if you don't want to include any.
function paramsForLogging() {
  return {
  };
}

/**
 * Dimensions for Google Tag Manager (GTM)
 * Use for tracking custom dimensions in GTM, for example the language of the page for the current session.
 * You need to first set up your custom dimensions "item_id" in your GTM account, then configure them here.
 see: https://support.google.com/analytics/answer/14239696
*/
//g_dimensionsGTM: custom dimensions for GTM. can be empty.
const g_dimensionsGTM = {
  // "dimension1": null,
  // "dimension2": null,
  //CUSTOMIZE: replace with your own
};

/*
 * Initializes custom dimensions for GTM (g_dimensionsGTM)
 * called only once, during initializePage
 * This function can be modified to set custom dimensions based on URL parameters or other criteria.
*/
function initializeCustomDimensions(params) {
  // Example of how to set custom dimensions based on URL parameters
  //g_dimensionsGTM["dimension1"] = params.dim1;
  //g_dimensionsGTM["dimension2"] = params.dim2;
  //CUSTOMIZE: replace with your own
  // see: https://support.google.com/analytics/answer/14239696
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
let gtag = null;
let g_sourceIframe = null;

export async function serverRequest(prop, ...args) {
  const strArgs = JSON.stringify(args);

  await loadIframeFromCurrentUrl();

  //TODO: if the frame loads ok but the .gs function never responds, we should have a timeout here to reject the promise.
  return new Promise(resolve => {
    const idRequest = g_callbackRunner.setCallback(function (response) {
      resolve(response); //Note the response can be a success or error return from the .gs server function
    });
    //note we post with no domain filtering ("*") because the GAS domain varies, but we validate g_sourceIframe when its set
    g_sourceIframe.postMessage({ type: "FROM_PARENT", action: "serverRequest", data: { functionName: prop, arguments: strArgs }, idRequest: idRequest }, "*");
  });
}

/**
 * Loads the Google Tag Manager (GTM) script
 * Skips loading on localhost or when 'gtag_disabled' is set in local storage, unless g_forceGTM is true.
 * Appends the GTM script to the document head.
 */
export function loadGTM() {
  beforeLoadGTM();
  const host = window.location.hostname;
  if (!host.includes(".") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || localStorage.getItem("gtag_disabled") == "1") {
    if (!g_forceGTM)
      return; //ignore local or disabled
  }

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + g_idGTM;
  document.head.appendChild(script);
}

export function isLocalhost() {
  return window.location.hostname === "localhost";
}

export function sendLogsToServer(logQueue) {
  if (isLocalhost()) {
    return;
  }

  fetch(g_endpointPutLogs, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logs: logQueue })
  })
    .then(res => {
      if (!res.ok) {
        console.error("Error sending logs, status:", res.status);
        throw new Error(`HTTP ${res.status}`);
      }
      return res;
    })
    .catch(e => {
      console.error("Error sending logs", e);
    });
}

export function setTitle(title) {
  document.title = title + "  |  Tutor for Me";
}

export function openUrlWithProps(dataEvent) {
  if (!dataEvent)
    return;
  const url = new URL(window.location.href);
  if (dataEvent.pathname)
    url.pathname = dataEvent.pathname;

  if (dataEvent.props) {
    Object.entries(dataEvent.props).forEach(([key, value]) => {
      //if value is empty, remove the parameter
      if (value === null || value === undefined || value === "")
        url.searchParams.delete(key);
      else
        url.searchParams.set(key, value);
    });
  }
  window.open(url, dataEvent.replacePage ? "_self" : "_blank");
}

let g_callbackIframeLoadEvents = null;
function setNoytifyIframeLoadEventCallback(callback) {
  if (g_callbackIframeLoadEvents)
    console.warn("Overwriting existing callbackIframeLoadEvents"); //unusual

  g_callbackIframeLoadEvents = callback;
}

function notifyIframeLoadEvent(eventType, data = null) {
  if (IframeLoadEvents.ERRORLOADING === eventType)
    console.error("Error loading iframe content");

  if (g_callbackIframeLoadEvents)
      g_callbackIframeLoadEvents(eventType, data);
}

/**
 * events that the iframe can send:
 * - analyticsEvent
 * - siteInited
 * - siteFullyLoaded
 * - logs
 * - titleChange
 * - urlParamChange 
 * - toggleFullscreen
 * - serverResponse
 * - openUrlWithProps
*/
export function processAction(data, event, callbackMessage) {
  if (data.action == "siteInited") {
    if (!g_sourceIframe && event)
      g_sourceIframe = event.source;
    g_loadedFrame = true;
    g_loadingFrame = false;
    event.source.postMessage({ type: 'validateDomain' }, event.origin);

    document.querySelector("iframe").style.opacity = "1";

    notifyIframeLoadEvent(IframeLoadEvents.LOADED, data?.data);
  }
  else if (data.action == "serverResponse") {
    g_callbackRunner.runCallback(data.idRequest, data.data);
  }
  else if (data.action == "openUrlWithProps") {
    const dataEvent = data.data;
    if (!dataEvent)
      return;
    openUrlWithProps(dataEvent);
  }
  else if (data.action == "siteFullyLoaded") {
    notifyIframeLoadEvent(IframeLoadEvents.FULLYLOADED);
  }
  else if (data.action == "titleChange") {
    setTitle(data.data.title);
  }
  else if (data.action == "logs") {
    const logs = data.data.logs;
    if (!logs || !Array.isArray(logs) || logs.length == 0) {
      console.error("Invalid logs");
      return;
    }
    sendLogsToServer(logs);
  }
  else if (data.action == "toggleFullscreen") {
    toggleFullscreen();
  }
  else if (data.action == "analyticsEvent") {
    if (gtag) {
      gtag("event", "select_content", {
        content_type: "button",
        item_id: data.data.name
      });
    }
  }
  else if (data.action == "urlParamChange") {
    const dataEvent = data.data;
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
    }
  }

  if (data.action == "siteInited")
    g_signalLoadFrame.resolve();
  
  if (callbackMessage)
    callbackMessage(data, event); //propagate
}

export const IframeLoadEvents = {
  LOADING: "loading",
  LOADED: "loaded",
  FULLYLOADED: "fullyloaded",
  ERRORLOADING: "error"
};

let g_iframeParamsExtra = "";
/**
 * Initializes the main page logic for the Apps Script iframe integration.
 * @param {Object} options - Options for initialization
 * @param {boolean} options.loadIframe - Whether to load the iframe right away. false will loadit later on-demand.
 * @param {boolean} options.loadAnalytics - Whether to load analytics (can be loaded later as well)
 * @param {Object} options.paramsExtra - Extra parameters to pass to the iframe URL
 * @param {Function} options.callbackMessage - Callback for message events received from the iframe
 * @param {Function} options.callbackContentLoaded - Callback for the content loaded event
 * @param {(event: string, data?: any) => void} options.callbackIframeLoadEvents - Callback for iframe loading events; receives (event, data) where event is one of IframeLoadEvents and data is optional (sent by the appscript)
 * @param {boolean} options.captureLogs - Whether to capture logs for debugging (captures calls to console.*)
 * 
 */
export async function initializePage({
  loadIframe,
  loadAnalytics,
  captureLogs,
  paramsExtra,
  callbackMessage,
  callbackContentLoaded,
  callbackIframeLoadEvents,
} = {}) {
  setNoytifyIframeLoadEventCallback(callbackIframeLoadEvents);
  g_iframeParamsExtra = paramsExtra || "";
  if (captureLogs) {
    enableLogCapture(payload => {
      const paramsAppend = paramsForLogging();
      if (paramsAppend)
        Object.assign(payload, paramsAppend);
    }, [
        //CUSTOMIZE: add your own function names to ignore in the stack trace
    ]);
  }

  let initedBase = await initializeBase();

  window.addEventListener("message", (event) => {
    // validate the origin of the message
    const allowedHostnames = [
      g_firebaseProjname + ".firebaseapp.com",
      g_rootDomain,
      "localhost",
    ];
    let originHostname;
    try {
      // This can throw if event.origin is "null" (e.g., from a sandboxed iframe)
      originHostname = new URL(event.origin).hostname;
    } catch (e) {
      console.warn("Message from an invalid or opaque origin:", event.origin);
      return;
    }

    const isAllowed = originHostname.endsWith(".googleusercontent.com") ||
      allowedHostnames.includes(originHostname);

    if (!isAllowed) {
      console.warn("Message from untrusted origin:", event.origin);
      return;
    }

    if (!event.data || event.data.type !== "FROM_IFRAME")
      return;
    // Walk up via .parent to see if it reaches this window
    {
      let w = event.source;
      let ok = false;
      for (let i = 0; i < 5 && w; i++) {
        if (w === window) {
          ok = true;
          break;
        }
        if (w === w.parent)
          break;   // reached that tree's top
        w = w.parent;
      }
      if (!ok) {
        console.warn("Message from unknown origin:", event.origin);
        return;
      }
    }

    const data = event.data;
    processAction(data, event, callbackMessage);
  });

  function onContentLoadedBase() {
    if (!initedBase) {
      notifyIframeLoadEvent(IframeLoadEvents.ERRORLOADING);
      return;
    }

    if (loadAnalytics)
      loadGTM();
    if (callbackContentLoaded)
      callbackContentLoaded();
    if (loadIframe)
      loadIframeFromCurrentUrl(paramsExtra).catch(() => {}); //errors are handled in notifyIframeLoadEvent
  }

  if (document.readyState !== "loading") {
    onContentLoadedBase();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      onContentLoadedBase();
    });
  }
}

export function getLang() {
  if (g_lang)
    return g_lang;
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get("lang");
  if (urlLang)
    return urlLang;

  const stored = localStorage.getItem("lang");
  if (stored)
    return stored;
  return navigator.language.startsWith("es") ? "es" : "en";
}

export function setLang(lang, mapTranslations) {
  if (!lang)
    lang = g_langDefault;
  if (lang !== "en" && lang !== "es") {
    console.error("invalid language in setLang: " + lang);
    throw new Error("invalid language");
  }
  g_lang = lang;

  if (mapTranslations) {
    g_mapsLang = mapTranslations;
    if (!haveSamePropertyNames(g_mapsLang.en, g_mapsLang.es))
      console.error("EN and ES differ");
  }

  const elemLang = document.getElementById("language");
  if (elemLang)
    elemLang.value = lang;
  localStorage.setItem("lang", lang);
  applyTranslations(document, mapTranslations, lang);
}

export function t(lang = null, translations = null) {
  if (!translations)
    translations = g_mapsLang;

  if (!lang)
    lang = g_lang;

  if (!lang)
    lang = getLang();

  if (!lang) {
    console.error("no lang in t");
    lang = g_langDefault; //recover
  }
  if (lang == "es")
    return translations.es;
  return translations.en;
}

let g_firstTranslationDone = false;

export function applyTranslations(root, translations, lang) {
  let isLanding = false;
  //set isLanding if the current url is the landing page (no pathname)
  if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
    isLanding = true;
  }

  root.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const mapped = t(lang, translations)[key];
    if (typeof mapped === "string") {
      if (!g_firstTranslationDone && lang == "en" && el.innerHTML !== mapped) {
        if (isLanding || el.innerHTML.trim() !== "") //avoid logging empty elements in non-landing pages
          console.log("unmatched translation for", key);
      }
      el.innerHTML = mapped;
    }
    else {
      if (lang !== "en") {
        console.log("Missing translation for", key, "in", lang);
        const mapped2 = t("en", translations)[key];
        if (mapped2) {
          el.innerHTML = mapped2;
          return;
        }
      }
      console.log("missing: " + key + ': "' + el.innerHTML + '"');
      el.innerHTML = "?";
    }
  });
  g_firstTranslationDone = true;
}

/** crypto helper */
function base64UrlToArrayBuffer(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/"); //Base64url to standard Base64.
  // Add padding if needed.
  while (base64.length % 4)
    base64 += "=";

  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

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

async function initializeBase() {
  const params = new URLSearchParams(window.location.search);
  Object.keys(g_paramsClean).forEach(key => {
    if (params.has(key))
      g_paramsClean[key] = params.get(key);
  });

  if (g_paramsClean.lang !== "en" && g_paramsClean.lang !== "es") {
    console.error("Unsupported lang: " + g_paramsClean.lang);
    return false;
  }

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
let g_loadingFrame = false;
let g_signalLoadFrame = null;

/**
 * Loads the iframe from the current URL with the given extra parameters. 
* if paramsExtra is not provided, uses the one set during initializePage.
 * @param {string} paramsExtra - Extra parameters to append to the iframe URL.
 */
export async function loadIframeFromCurrentUrl(paramsExtra = "", selector = "iframe") {
  if (g_loadedFrame || g_loadingFrame)
    return g_signalLoadFrame.promise;
  g_loadingFrame = true;
  if (!paramsExtra)
    paramsExtra = g_iframeParamsExtra;

  const iframeElem = document.querySelector(selector);
  let startedRetry = false;

  function executor(resolve, reject) {
    if (!iframeElem) {
      console.error("No iframe found");
      reject(new Error("no iframe found"));
    }

    function setRetryMode() {
      if (startedRetry)
        return;
      startedRetry = true;
      g_loadingFrame = false;
      notifyIframeLoadEvent(IframeLoadEvents.ERRORLOADING);
      reject(new Error("iframe load timeout"));
    }

    iframeElem.addEventListener("load", (event) => {
      if (g_loadedFrame)
        return;

      setTimeout(() => {
        if (g_loadedFrame)
          return;
        setRetryMode();
      }, 5000);
    });

    setTimeout(() => {
      if (g_loadedFrame || startedRetry)
        return;
      //in rare cases (ie frame load cancelled), the iframe load event is never called.
      setRetryMode();
    }, 12000);

    notifyIframeLoadEvent(IframeLoadEvents.LOADING);
    iframeElem.style.opacity = "0";
    iframeElem.src = getScriptUrlWithParams(paramsExtra);
  }

  g_signalLoadFrame = makeSignal(executor);
  return g_signalLoadFrame.promise;
}

export function makeSignal(executor) {
  let resolve, reject;

  const promise = new Promise((res, rej) => {
    // 1. Capture the resolver functions
    resolve = res;
    reject = rej;

    // 2. Run user code (your previous executor logic)
    if (executor) {
      // Pass the same resolve/reject you would have gotten in new Promise(...)
      executor(res, rej);
      // or: executor(resolve, reject);  // same functions
    }
  });

  return { promise, resolve, reject };
}

function getScriptUrlWithParams(paramsExtra) {
  const strBuilder = paramsExtra ? "&" + paramsExtra : "";
  const strDemo = (g_paramsClean.demo == "1") ? "&demo=1" : "";
  const lang = getLang(); //g_paramsClean has the actual url param, but getLang adds a localStorage preference if url doesnt have it
  let url = `https://script.google.com/macros/s/${g_paramsClean.org}/exec?lang=${lang}&session=${g_paramsClean.session}${strBuilder}${strDemo}&embed=1`;
  return url;
}

let g_beforeGTMFinished = false;
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
    if (typeof value !== "undefined" && value !== null && value !== "")
      dimensionsGTM[name] = value;
  });

  gtag("js", new Date());
  if (Object.keys(dimensionsGTM).length > 0)
    gtag("config", g_idGTM, dimensionsGTM);

  g_beforeGTMFinished = true;
}

// mini-toast.js — tiny, dependency-free toast (ESM). Import and call `toast(...)`.
// Usage:
//   import toast from './mini-toast.js';
//   toast('Saved', { type: 'success', position: 'center' });

const STYLE_ID = "mini-toast-style";
/** @type {Map<string, HTMLElement>} */
const containers = new Map();

/**
 * @typedef {'tr'|'tl'|'br'|'bl'|'center'} ToastPosition
 * @typedef {'success'|'warn'|'error'|''} ToastType
 * @typedef {{
 *   duration?: number,            // ms; 0 = sticky
 *   type?: ToastType,
 *   position?: ToastPosition,
 *   dismissible?: boolean,        // click to close
 *   max?: number                  // stack cap per position
 * }} ToastOptions
 */

/** Injects CSS once */
function injectCSS() {
  if (typeof document === "undefined") return; // SSR no-op
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    ._toaster{position:fixed;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
    ._toaster.tr{top:12px;right:12px;align-items:flex-end}
    ._toaster.tl{top:12px;left:12px}
    ._toaster.br{bottom:12px;right:12px;align-items:flex-end}
    ._toaster.bl{bottom:12px;left:12px}
    ._toaster.center{top:50%;left:50%;transform:translate(-50%,-50%);align-items:center}
    ._toast{pointer-events:auto;max-width:min(420px,90vw);padding:10px 14px;border-radius:10px;
            background:#222;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.18);
            font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
            opacity:0;transform:translateY(-6px);transition:opacity .18s ease, transform .18s ease}
    ._toaster.center ._toast{transform:none} /* fade-only in center */
    ._toast.show{opacity:1;transform:translateY(0)}
    ._toast.hide{opacity:0;transform:translateY(-6px)}
    ._toast.success{background:#222}
    ._toast.warn{background:#ca8a04}
    ._toast.error{background:#dc2626}
  `;
  document.head.appendChild(s);
}

/** @param {ToastPosition} pos */
function getContainer(pos) {
  if (containers.has(pos)) return containers.get(pos);
  const el = document.createElement("div");
  el.className = `_toaster ${pos}`;
  document.body.appendChild(el);
  containers.set(pos, el);
  return el;
}

/**
 * Show a toast.
 * @param {string|Node} text
 * @param {ToastOptions} [opts]
 * @returns {{close:()=>void, el:HTMLElement}}
 */
export function toast(text, opts = {}) {
  if (typeof document === "undefined") {
    const msgError = "mini-toast requires a browser environment";
    console.error(msgError);
    throw new Error(msgError);
  }
  injectCSS();

  const {
    duration = 2400,
    type = "",
    position = "tr",
    dismissible = true,
    max = Infinity,
  } = opts;

  const host = getContainer(position);
  while (host.children.length >= max) host.firstChild.remove();

  const el = document.createElement("div");
  el.className = `_toast ${type}`;
  if (text instanceof Node) el.appendChild(text);
  else el.textContent = String(text);
  host.appendChild(el);

  // animate in
  requestAnimationFrame(() => el.classList.add("show"));

  let timer = duration > 0 ? setTimeout(hide, duration) : null;

  function hide() {
    if (!el.isConnected) return;
    if (timer) { clearTimeout(timer); timer = null; }
    el.classList.remove("show");
    el.classList.add("hide");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
  }

  if (dismissible) el.addEventListener("click", hide);

  return { close: hide, el };
}

/** Remove all toasts in a position (or every position if omitted). */
export function clearToasts(position) {
  if (typeof document === "undefined") return;
  if (position) {
    const host = containers.get(position);
    if (host) host.replaceChildren();
    return;
  }
  for (const host of containers.values()) host.replaceChildren();
}

export function toggleFullscreen() {
  const elem =
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement;

  const safeCall = (api, context) => {
    if (api) {
      const result = api.call(context);
      if (result instanceof Promise) {
        result.catch(err => console.error(err));
      }
    }
  };

  if (elem) {
    const exitFullscreen =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen;
    safeCall(exitFullscreen, document);
  } else {
    const element = document.documentElement;
    const requestFullscreen =
      element.requestFullscreen ||
      element.webkitRequestFullscreen ||
      element.mozRequestFullScreen ||
      element.msRequestFullscreen;
    safeCall(requestFullscreen, element);
  }
}

export function waitForAutoPageView(intervalMs = 50, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const ready = Boolean(window.gtag && window.gtag.get && window.gtag.get("G-" + g_idGTM));
      const timedOut = Date.now() - start > timeoutMs;

      if (ready || timedOut) {
        clearInterval(timer);
        resolve(ready);
      }
    }, intervalMs);
  });
}

export function replyUser(action, event, user, idToken = null) {
  const userParam = user ? {
    idToken,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    uid: user.uid,
  } : null;
  event.source.postMessage({ reply: action, user: userParam }, event.origin);
}

export function insertSpinner(host) {
  host.style.visibility = "hidden";
  host.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.spinner_S1WN{animation:spinner_MGfb .8s linear infinite;animation-delay:-.8s; fill:currentColor;}.spinner_Km9P{animation-delay:-.65s}.spinner_JApP{animation-delay:-.5s}@keyframes spinner_MGfb{93.75%,100%{opacity:.2}}</style><circle class="spinner_S1WN" cx="4" cy="12" r="3"/><circle class="spinner_S1WN spinner_Km9P" cx="12" cy="12" r="3"/><circle class="spinner_S1WN spinner_JApP" cx="20" cy="12" r="3"/></svg>`;
}

function haveSamePropertyNames(obj1, obj2) {
  const keys1 = Object.keys(obj1).sort(); // Get and sort keys of obj1
  const keys2 = Object.keys(obj2).sort(); // Get and sort keys of obj2

  // Find missing or extra keys in obj1 relative to obj2
  const missingInObj2 = keys1.filter(key => !keys2.includes(key));
  const missingInObj1 = keys2.filter(key => !keys1.includes(key));

  // Log warnings for missing or extra keys
  if (missingInObj2.length > 0) {
    console.warn("Keys missing in obj2:", missingInObj2);
  }

  if (missingInObj1.length > 0) {
    console.warn("Keys missing in obj1:", missingInObj1);
  }

  // Compare lengths and each key
  const isSame = keys1.length === keys2.length && keys1.every((key, index) => key === keys2[index]);

  return isSame;
}

function createCallbackRunner() {
  const store = new Map();

  const genId = () => {
    // Prefer strong, collision-resistant IDs when available
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    const rand = Math.random().toString(36).slice(2);
    return `cb_${Date.now().toString(36)}_${rand}`;
  };

  function setCallback(callback) {
    if (typeof callback !== "function") throw new TypeError("callback must be a function");
    const id = genId();
    store.set(id, callback);
    return id;
  }

  function runCallback(id, data) {
    const cb = store.get(id);
    if (!cb)
      return false;
    // Delete first to prevent reentrancy or double-invoke if cb calls set/run
    store.delete(id);
    cb(data); // let errors bubble; caller decides how to handle
    return true;
  }

  return Object.freeze({ setCallback, runCallback });
}

const g_callbackRunner = createCallbackRunner();
const g_moduleLog = "frontend";
const g_maxLogsSend = 10;

//console log capture
function enableLogCapture(callbackContextInject = null, ignoreFnList = null) {
  const noop = function () { };
  if (typeof console === "undefined") {
    window.console = {};
  }
  // Use a fallback if any method is missing.
  const originalConsole = {
    log: typeof console.log === "function" ? console.log.bind(console) : noop,
    warn: typeof console.warn === "function" ? console.warn.bind(console) : noop,
    error: typeof console.error === "function" ? console.error.bind(console) : noop,
    info: typeof console.info === "function" ? console.info.bind(console) : noop,
    debug: typeof console.debug === "function" ? console.debug.bind(console) : noop
  };

  let logQueue = [];
  let idleScheduled = false;


  function scheduleIdleCallback(callback, options) {
    if (window.requestIdleCallback) {
      return window.requestIdleCallback(callback, options);
    } else {
      return setTimeout(() => {
        callback({
          timeRemaining: function () { return 50; } // Arbitrary positive value
        });
      }, options && options.timeout ? options.timeout : 50);
    }
  }

  function payloadBase(message) {
    const unk = "unknown";

    const payload = {
      message: g_moduleLog + ": " + message,
      functionName: unk,
      callStack: unk,
      moduleLog: g_moduleLog,
    };

    if (callbackContextInject) {
      try {
        callbackContextInject(payload);
      } catch (e) {
        console.error("Failed to inject console context data:", e);
      }
    }
    return payload;
  }

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
      "captureConsole",
      "console.log",
      "console.warn",
      "console.error",
      "console.info",
      "console.debug",
    ];

    function parseFnName(line) {
      try {
        const match = line.match(/at (\S+) \(/);
        if (match)
          return match[1];
      } catch (e) {
        originalConsole.error(e);
        //fall through
      }
      return "";
    }

    function getCleanStackLines(stackLines) {
      let startIndex = 2;

      while (startIndex < stackLines.length) {
        const line = stackLines[startIndex].trim();
        if (!line)
          continue;

        if (!IGNORED.includes(parseFnName(line)) && (!ignoreFnList || !ignoreFnList.includes(parseFnName(line)))) {
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

  function levelToSeverity(level) {
    const consoleToSeverity = {
      error: 'ERROR',
      warn: 'WARNING',
      log: 'INFO',
      info: 'INFO',
      debug: 'DEBUG'
    };

    return (consoleToSeverity[level] || 'DEFAULT');
  }

  let g_isLogging = false;
  function captureConsole(level, ...args) {
    try {
      level = level.toLowerCase();
      originalConsole[level](...args);
      if (g_isLogging) {
        originalConsole.error("recursive log within captureConsole");
        return;
      }
      if (level === "debug") {
        if (!g_isProduction)
          return;
        level = "warn"; //treat debug as warn in production (shouldnt be any debug logs in prod)
      }

      g_isLogging = true;
      let payload = generateLogPayload(...args);
      payload.timestamp = new Date().toISOString();
      payload.severity = levelToSeverity(level);
      logQueue.push(payload);
      scheduleLogFlush();
    } catch (e) {
      originalConsole.error(e);
      //ignore
    }
    g_isLogging = false;
  }

  function scheduleLogFlush() {
    if (logQueue.length === 0 || idleScheduled) return;
    idleScheduled = true;
    scheduleIdleCallback(flushLogs, { timeout: 2000 });
  }

  function flushLogs(deadline) {
    //deadline can be undefined. currently unused

    if (logQueue.length === 0) {
      idleScheduled = false;
      return;
    }


    const logSend = logQueue.slice(0, g_maxLogsSend); //first ones only
    logQueue = [];
    sendLogsToServer(logSend);
    idleScheduled = false;
  }

  // Override console methods.
  console.log = (...args) => captureConsole("log", ...args);
  console.warn = (...args) => captureConsole("warn", ...args);
  console.error = (...args) => captureConsole("error", ...args);
  console.info = (...args) => captureConsole("info", ...args);
  console.debug = (...args) => captureConsole("debug", ...args);

  // Global error handling.
  //TODO: merge into single library together with google-apps-script\src\js\util.js
  window.onerror = function (message, source, lineno, colno, error) {
    captureConsole("error", "Uncaught Exception:", { message, source, lineno, colno, error });
  };

  window.addEventListener("unhandledrejection", function (event) {
    const r = event.reason;
    if (typeof r === 'string' && r.includes('Object Not Found Matching Id')) {
      event.preventDefault(); // avoid noisy bot link scanner
      return;
    }
    captureConsole("error", "Unhandled Promise Rejection:", event.reason);
  });

  // Flush logs on page unload.
  window.addEventListener("beforeunload", function () {
    flushLogs();
  });
}

