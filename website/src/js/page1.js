
import { initializePage, onErrorBaseIframe, loadIframeFromCurrentUrl, replyUser  } from "/js/common.js";
import {
  setupAuth,
  signOutCurrentUser,
  getCurrentUser,
} from "/js/firebaseauth.js";

setupAuth({
  doAuth: false, //no forced login on this page
  headerText: "to test this feature",
  redirectMode: false,
  forceRedirect: false,
  readyPromise: null
},
  (loginFromRedirect, errText) => {
    if (errText)
      alert(errText);
    if (loginFromRedirect) {
      //handled by firebaseauth.js
    } else {
      // Not a redirect login, so load the iframe now.
      loadIframe();
    }
});

let g_iframeLoaded = false;
function loadIframe() {
  if (!g_iframeLoaded) {
    loadIframeFromCurrentUrl("");
    g_iframeLoaded = true;
  }
}

initializePage({
  loadIframe: false, //we load it later, so login is initialized first
  loadAnalytics: true,
  paramsExtra: "page=1",
  callbackMessage: async (data, event) => {
    if (!data)
      return;

    const dataEvent = data.data;
    if (data.action == "siteInited") {
      //iframe loaded, so remove our scrollbar.
      //we initially show a scrollbar to make a smoother transition into the loaded script iframe, which also has one.
      document.documentElement.classList.remove('scrollY');
    }
    else if (data.action == "openWebsite") {
      if (!dataEvent)
        return;
      const url = new URL(window.location.href);
      const paramsSite = new URLSearchParams(window.location.search);
      url.pathname = '/newPath';
      url.searchParams.set("parameter1", dataEvent.xxx);
      url.searchParams.set("parameter2", dataEvent.yyy);
      window.open(url, '_blank');
    }
     else if (data.action == "logoutUser") {
      const user = await getCurrentUser(false);
      if (user) {
        await signOutCurrentUser();
        // onAuthStateChanged will handle the rest.
      }
      replyUser(data.action, event, null);
    }
    else if (data.action == "getUser") {
      try {
        const currentUser = await getCurrentUser(dataEvent && dataEvent.force, true);
        replyUser(data.action, event, currentUser);
      } catch (error) {
        // User cancelled
        replyUser(data.action, event, null);
      }
    }
  },
  onError: onErrorBaseIframe,
  callbackContentLoaded: null
});