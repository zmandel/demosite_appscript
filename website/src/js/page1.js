
import { initializePage, onErrorBaseIframe } from "/js/common.js";
initializePage({
  loadIframe: true,
  loadAnalytics: true,
  paramsExtra: "page=1",
  callbackMessage: data => {
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
  },
  onError: onErrorBaseIframe,
  callbackContentLoaded: null
});