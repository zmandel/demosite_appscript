
import { initializePage, IframeLoadEvents } from "/js/common.js";
import { server } from "/components/js/gscriptrun.js";

/* Handles iframe load events to update the loading status on the page
 * Used only while the iframe is loading, until it loads or fails to load
 */
function handleIframeLoadEvent(iframeLoadEvent) {
  const loadingPage = document.getElementById("loadingPage");
  const loadingPageLong = document.getElementById("loadingPageLong");

  switch (iframeLoadEvent) {
    case IframeLoadEvents.LOADING:
      loadingPageLong.style.display = "none";
      loadingPage.style.display = "";
      loadingPage.textContent = "Loading GAS iframe... (you can click the Call button while it loads)";
      break;

    case IframeLoadEvents.ERRORLOADING:
      loadingPage.style.display = "none";
      loadingPageLong.style.display = "";
      break;

    case IframeLoadEvents.LOADED:
      loadingPageLong.style.display = "none";
      loadingPage.textContent = "GAS iframe is loaded.";
      break;
  }
}

/* Initialize the page with iframe loading, analytics etc
 * Note: this is used just to standarize the way all pages are initialized in the framework,
 * regardless of whether they use the bridge or not.
 **/
initializePage({
  loadIframe: true, //load the iframe immediately. if false, it will be loaded on-demand when a server function is called (using the given paramExtra)
  loadAnalytics: true,
  paramsExtra: "bridge=1", //tells the GAS page to load the gscript-bridge
  callbackMessage: null,   //not needed since the GAS frontend is now the top window
  callbackIframeLoadEvents: handleIframeLoadEvent,
  onError: onErrorBaseIframe,
  callbackContentLoaded: onDomContentLoaded
});

async function onDomContentLoaded() {
  const btn = document.getElementById('callGAS');
  const txtOriginal = btn.textContent;
  btn.onclick = async function () {
    try {
      btn.textContent = "Calling GAS function...";
      btn.disabled = true;
      //call GAS. You can use "server.run" (cleaner, promise-based), "google.script.run" (just like in a GAS frontend) or the raw "serverRequest" helper.
      const result = await server.run("demoServerFunction", "hello ","world");
      alert("GAS function returned success: " + result);
    } catch (error) {
      alert("GAS function returned error: " + error.message);
    }
    btn.textContent = txtOriginal;
    btn.disabled = false;
  };
}

function onErrorBaseIframe() {
  console.log("Error loading iframe content");
}
