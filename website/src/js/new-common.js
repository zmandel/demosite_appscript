import '../common.css';
export default toast;

const g_orgDefault = "AKfycbz-Z4nIlqQU4ejz8lyL_HfzhnkH6-hG6DmOpTG3MIrEJTq9cFwigNkR_gIgDbowVsAA"; //default org
const g_idGTM = 'G-BCTVM5DWRZ';
//note: create a "item_id" custom dimension to track the analytics custom events.
// see: https://support.google.com/analytics/answer/14239696
//g_dimensionsGTM: custom dimensions for GTM. can be empty.
const g_dimensionsGTM = {
  "session_lesson": null,
  "language_selected": null,
};


const g_prefixTemplateLesson = "template.";
export function isTemplateSession(session) {
    return (session && session.startsWith(g_prefixTemplateLesson));
  }

  

export function onErrorBaseIframe() {
  hideLoading();
  let elem = document.querySelector('#errPage');
  if (elem)
    elem.style.display = "";
}

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

export function isLocalhost() {
  return window.location.hostname === "localhost";
}

export async function initializePage({
  loadIframe,
  loadAnalytics,
  paramsExtra,
  callbackMessage,
  onError,
  callbackContentLoaded
} = {}) {
  let initedBase = await initializeBase();

  if (loadIframe && !g_paramsClean.session)
    initedBase = false;

  function sendLogsToServer(logQueue) {
    if (isLocalhost()) {
      return;
    }

    fetch('/api/putlogs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: logQueue })
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res;
      })
      .catch(e => {
        console.error('Error sending logs', e);
      });
  }


  window.addEventListener("message", function (event) {
    // It's crucial to validate the origin of the message
    const allowedHostnames = [
      "tutorforme-org.firebaseapp.com",
      "tutorforme.org",
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

    if (event.data.action == "siteInited") {
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
        gtag('event', 'select_content', {
          content_type: 'button',
          item_id: event.data.data.name
        });
      }
    }
    else if (event.data.action == "urlParamChange") {
      //review: generalize to a set of parameters
      const dataEvent = event.data.data;
      if (dataEvent && dataEvent.lang) {
        const url = new URL(window.location.href);
        url.searchParams.set("lang", dataEvent.lang);
        window.location.replace(url);
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
    document.addEventListener('DOMContentLoaded', function () {
      onContentLoadedBase();
    });
  }
}

const g_forceGTM = false;  //false is default in production
// Set to true when you need GTM to load on localhost or when 'gtag_disabled'
// is set in local storage. Toggle to false for normal deployments so local
// environments skip analytics loading.

let gtag = null;

let g_paramsClean = {
  org: g_orgDefault,
  sig: "",
  lang: "en",
  session: "",
  demo: "",
}

export function getLang(onlyFromURL = true) {
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  if (urlLang)
    return urlLang;
  if (onlyFromURL)
    return "en"; //default language

  const stored = localStorage.getItem('lang');
  if (stored)
    return stored;
  return navigator.language.startsWith('es') ? 'es' : 'en';
}

export function setLanguage(langCode, translations) {
  const elemLang = document.getElementById('language');
  if (elemLang)
    elemLang.value = langCode;
  localStorage.setItem('lang', langCode);
  const dict = translations[langCode];
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

export function applyTranslations(root, translations, lang) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const mapped = t(translations, lang)[key];
    if (mapped)
      el.innerHTML = mapped;
    else {
      if (lang !== "en") {
        console.log("Missing translation for ", key, " in ", lang);
        const mapped2 = t(translations, "en")[key];
        if (mapped2) {
          el.innerHTML = mapped2;
          return;
        }
      }
      el.innerHTML = "?";
      
    }
  });
}

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

const publicKeyJwk = {
  "kty": "EC",
  "crv": "P-256",
  "x": "b5kxtfrQQdKWsh06ixmAUetiYOPgkymM4eWJda3hJsM",
  "y": "FZInICTDI43Yzvr_UcUTn7C04Yq7JG95QZtiK4ITp64",
  "ext": true
};

async function verifyScript(org, signatureBase64Url) {
  let isValid = false;
  try {
    if (org && !signatureBase64Url)
      return false;
    const alg = "ECDSA";
    const publicKey = await window.crypto.subtle.importKey(
      "jwk",
      publicKeyJwk,
      {
        name: alg,
        namedCurve: publicKeyJwk.crv
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
  if (params.has("lang"))
    g_paramsClean.lang = params.get("lang");

  if (params.has("session"))
    g_paramsClean.session = params.get("session");

  if (params.has("demo"))
    g_paramsClean.demo = params.get("demo");


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

  g_dimensionsGTM["session_lesson"] = g_paramsClean.session;
  g_dimensionsGTM["language_selected"] = g_paramsClean.lang;
  beforeLoadGTM();
  return true;
}

let g_loadedFrame = false;
let g_timeoutIdiframe = null;

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

export function loadIframeFromCurrentUrl(paramsExtra) {
  cleanupTimeoutIdiframe();
  g_timeoutIdiframe = setTimeout(function () {
    if (!g_loadedFrame) {
      document.getElementById("loadingPage").style.display = "none";
      document.getElementById("loadingPageLong").style.display = "";
    }
  }, 13000);

  g_loadedFrame = false;
  document.getElementById("loadingPageLong").style.display = "none";
  document.getElementById("loadingPage").style.display = "";
  document.querySelector('iframe').style.opacity = "0";
  const strBuilder = paramsExtra ? "&" + paramsExtra : "";
  const strDemo = (g_paramsClean.demo == "1") ? "&demo=1" : "";
  let url = `https://script.google.com/macros/s/${g_paramsClean.org}/exec?lang=${g_paramsClean.lang}&session=${g_paramsClean.session}${strBuilder}${strDemo}&embed=1`;
  document.querySelector('iframe').src = url;
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
    if (typeof value !== 'undefined' && value !== null && value !== '')
      dimensionsGTM[name] = value;
  });

  gtag('js', new Date());
  gtag('config', g_idGTM, dimensionsGTM);

  g_beforeGTMFinished = true;
}

// mini-toast.js — tiny, dependency-free toast (ESM). Import and call `toast(...)`.
// Usage:
//   import toast from './mini-toast.js';
//   toast('Saved', { type: 'success', position: 'center' });

const STYLE_ID = 'mini-toast-style';
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
  if (typeof document === 'undefined') return; // SSR no-op
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
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
  const el = document.createElement('div');
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
  if (typeof document === 'undefined') {
    throw new Error('mini-toast requires a browser environment');
  }
  injectCSS();

  const {
    duration = 2400,
    type = '',
    position = 'tr',
    dismissible = true,
    max = Infinity,
  } = opts;

  const host = getContainer(position);
  while (host.children.length >= max) host.firstChild.remove();

  const el = document.createElement('div');
  el.className = `_toast ${type}`;
  if (text instanceof Node) el.appendChild(text);
  else el.textContent = String(text);
  host.appendChild(el);

  // animate in
  requestAnimationFrame(() => el.classList.add('show'));

  let timer = duration > 0 ? setTimeout(hide, duration) : null;

  function hide() {
    if (!el.isConnected) return;
    if (timer) { clearTimeout(timer); timer = null; }
    el.classList.remove('show');
    el.classList.add('hide');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  }

  if (dismissible) el.addEventListener('click', hide);

  return { close: hide, el };
}

/** Remove all toasts in a position (or every position if omitted). */
export function clearToasts(position) {
  if (typeof document === 'undefined') return;
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
