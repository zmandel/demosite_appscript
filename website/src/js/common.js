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

import "../common.css";
export default toast;

const g_orgDefault = import.meta.env.VITE_ORG_DEFAULT;
const g_endpointPutLogs = import.meta.env.VITE_ENDPOINT_PUT_LOGS;
const g_firebaseProjname = import.meta.env.VITE_FIREBASE_PROJNAME;
const g_rootDomain = import.meta.env.VITE_ROOT_DOMAIN;
const g_idGTM = import.meta.env.VITE_GTM_ID; //Google Tag Manager ID

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
  //g_dimensionsGTM["dimension1"] = params.dimension1;
  //g_dimensionsGTM["dimension2"] = params.dimension2;
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

/**
 * //CUSTOMIZE: replace with your own error handling
 * used as an error callback for initializePage
 */
export function onErrorBaseIframe() {
  hideLoading();
  let elem = document.querySelector("#errPage");
  if (elem)
    elem.style.display = "";
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
          throw new Error(`HTTP ${res.status}`);
        }
        return res;
      })
      .catch(e => {
        console.error("Error sending logs", e);
      });
  }


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

    if (window.location.origin === event.origin) {
      return; //ignore same origin messages (like 'login-done') 
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

    //CUSTOMIZE: add your own custom events here
    if (event.data.action == "siteInited") {
      //this event comes from the script´s postSiteInited
      const dontStopProgress = event.data?.data?.dontStopProgress;
      g_loadedFrame = true;
      cleanupTimeoutIdiframe();
      event.source.postMessage({ type: 'validateDomain' }, event.origin);
      document.querySelector("iframe").style.opacity = "1";
      if (!dontStopProgress) {
        hideLoading();
      }
    }
    if (event.data.action == "openUrlWithProps") {
      const dataEvent = event.data.data;
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
    else if (event.data.action == "siteFullyLoaded") {
      hideLoading();
    }
    else if (event.data.action == "titleChange") {
      if (event.data.data.afterDash) {
        const sep = " - ";
        document.title = document.title.split(sep)[0] + sep + event.data.data.title;
      }
      else {
        document.title = event.data.data.title;
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
    else if (event.data.action == "toggleFullscreen") {
      toggleFullscreen();
    }
    else if (event.data.action == "analyticsEvent") {
      if (gtag) {
        gtag("event", "select_content", {
          content_type: "button",
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
      }
    }
    if (callbackMessage)
      callbackMessage(event.data, event); //propagate
  });

  function onContentLoadedBase() {
    if (!initedBase) {
      cleanupTimeoutIdiframe(); //not currently needed
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
    document.addEventListener("DOMContentLoaded", () => {
      onContentLoadedBase();
    });
  }
}

export function getLang(onlyFromURL = true) {
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get("lang");
  if (urlLang)
    return urlLang;
  if (onlyFromURL)
    return "en"; //default language

  const stored = localStorage.getItem("lang");
  if (stored)
    return stored;
  return navigator.language.startsWith("es") ? "es" : "en";
}

export function setLanguage(langCode, translations) {
  const elemLang = document.getElementById("language");
  if (elemLang)
    elemLang.value = langCode;
  localStorage.setItem("lang", langCode);
  applyTranslations(document, translations, langCode);
}

export function t(translations, lang) {
  let dict = translations[lang || getLang()];
  if (!dict) {
    console.log("Missing translation map ", lang);
    dict = translations["en"];
  }
  return dict;
}

let g_firstTranslationDone = false;

export function applyTranslations(root, translations, lang) {
  root.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const mapped = t(translations, lang)[key];
    if (mapped) {
      if (!g_firstTranslationDone && lang == "en" && el.innerHTML !== mapped) {
        console.log("unmatched translation for", key);
      }
      el.innerHTML = mapped;
    }
    else {
      if (lang !== "en") {
        console.log("Missing translation for", key, "in", lang);
        const mapped2 = t(translations, "en")[key];
        if (mapped2) {
          el.innerHTML = mapped2;
          return;
        }
      }
      console.log("missing: "+key+': "'+ el.innerHTML+'"');
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
  //set g_paramsClean with allowed values from the URL
  Object.keys(g_paramsClean).forEach(key => {
    if (params.has(key))
      g_paramsClean[key] = params.get(key);
  });
  if (g_paramsClean.lang != "en" && g_paramsClean.lang != "es") {
    console.error("Unsupported lang: " + g_paramsClean.lang);
    return false;
  }

  if (params.has("org")) {
    g_paramsClean.org = params.get("org");
    g_paramsClean.sig = params.get("sig");
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
export function loadIframeFromCurrentUrl(paramsExtra) {
  cleanupTimeoutIdiframe();
  g_timeoutIdiframe = setTimeout(() => {
    if (!g_loadedFrame) {
      document.getElementById("loadingPage").style.display = "none";
      document.getElementById("loadingPageLong").style.display = "";
    }
  }, 13000);

  g_loadedFrame = false;
  document.getElementById("loadingPageLong").style.display = "none";
  document.getElementById("loadingPage").style.display = "";
  document.querySelector("iframe").style.opacity = "0";

  let url = `https://script.google.com/macros/s/${g_paramsClean.org}/exec?lang=${g_paramsClean.lang}&${paramsExtra}&embed=1`;
  document.querySelector("iframe").src = url;
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
    throw new Error("mini-toast requires a browser environment");
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

function toggleFullscreen() {
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
