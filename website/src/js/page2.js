
import { initializePage, loadGTM, loadEvents } from "/js/common.js";

function handleloadEvent(loadEvent, data) {
  const loadingPage = document.getElementById("loadingPage");
  const loadingPageError = document.getElementById("loadingPageError");

  switch (loadEvent) {
    case loadEvents.LOADING:
      loadingPageError.style.display = "none";
      loadingPage.style.display = "";
      break;

    case loadEvents.ERRORLOADING:
      loadingPage.style.display = "none";
      loadingPageError.style.display = "";
      break;

    case loadEvents.LOADED:
      //note: including as an example, but in this sample, LOADED always comes with dontStopProgress set to true
      if (!data || !data.dontStopProgress) {
        loadingPage.style.display = "none";
        loadingPageError.style.display = "none";
      }
      break;

    case loadEvents.FULLYLOADED:
      loadingPage.style.display = "none";
      loadingPageError.style.display = "none";
      break;
  }
}

initializePage({
  loadIframe: true,
  loadAnalytics: false, //in this sample, we wait until a custom time later to enable it through loadGTM()
  paramsExtra: "page=2",
  callbackLoadEvents: handleloadEvent,
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