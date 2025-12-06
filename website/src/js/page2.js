
import { initializePage, loadGTM, handleloadEvent, } from "/js/common.js";

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