
import { initializePage, loadGTM, IframeLoadEvents } from "/js/common.js";

function handleIframeLoadEvent(iframeLoadEvent, data) {
  const loadingPage = document.getElementById("loadingPage");
  const loadingPageLong = document.getElementById("loadingPageLong");

  switch (iframeLoadEvent) {
    case IframeLoadEvents.LOADING:
      loadingPageLong.style.display = "none";
      loadingPage.style.display = "";
      break;

    case IframeLoadEvents.ERRORLOADING:
      loadingPage.style.display = "none";
      loadingPageLong.style.display = "";
      break;

    case IframeLoadEvents.LOADED:
      //note: including as an example, but in this sample, LOADED always comes with dontStopProgress set to true
      if (!data || !data.dontStopProgress) {
        loadingPage.style.display = "none";
        loadingPageLong.style.display = "none";
      }
      break;

    case IframeLoadEvents.FULLYLOADED:
      loadingPage.style.display = "none";
      loadingPageLong.style.display = "none";
      break;
  }
}

initializePage({
  loadIframe: true,
  loadAnalytics: false, //in this sample, we wait until a custom time later to enable it through loadGTM()
  paramsExtra: "page=2",
  callbackIframeLoadEvents: handleIframeLoadEvent,
  callbackMessage: async (data, event) => {
    if (!data)
      return;
    if (data.action == "titleChange") {
      //as a sample, here it loads GTM only after the title has changed
      //in this sample, we change the title of the window, and we want the GTM reports to pick up that new title.
      //this is just an example on how to control the timing of the GTM loading.
      loadGTM();
    }

  },
  callbackContentLoaded: null
});