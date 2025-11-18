
const g_allowAnyEmbedding = ("true" === "__ALLOW_ANY_EMBEDDING__");
const g_isProduction = ("true" === "__IS_PRODUCTION__");
const g_parentWebsite = "__URL_WEBSITE__";
const g_parentDomainFilter = g_allowAnyEmbedding ? "*" : g_parentWebsite;

queueMicrotask(() => {
  if (document.readyState !== "loading")
    onDomContentLoaded();
  else
    document.addEventListener('DOMContentLoaded', () => onDomContentLoaded());
});


function onDomContentLoaded() {
  window.top.postMessage(
    {
      type: "FROM_IFRAME",
      action: "siteInited",
      data: null
    },
    g_parentDomainFilter
  );
}

window.addEventListener("message", async function (event) {
  if (!g_allowAnyEmbedding && event.origin.toLowerCase() !== g_parentWebsite) {
    captureConsole("error", "unknown message domain. event:", event);
    return;
  }
  if (!event.data || event.data.type !== "FROM_PARENT" || event.data.action !== "serverRequest")
    return;
  const data = event.data.data;
  const idRequest = event.data.idRequest;

  function postSiteMessage(action, data) {
    window.top.postMessage(
      {
        type: "FROM_IFRAME",
        action: action,
        data: data,
        idRequest: idRequest
      },
      g_parentDomainFilter
    );
  }

  function errorResult(message) {
    if (!g_isProduction)
      console.log("bridge received server error response:", message);
    postSiteMessage("serverResponse", {error: message || "error"} );
  }

  google.script.run.withSuccessHandler(function (objResponse) {
      if (!g_isProduction)
        console.log("bridge received server response:", objResponse);
      if (!objResponse || objResponse.error || !objResponse.hasOwnProperty("result")) {
        errorResult(objResponse?.error);
        return;
      }
      postSiteMessage("serverResponse", {result: objResponse.result || null} );
    }).withFailureHandler(function (error) {
      errorResult(error?.message);
    }).processServerRequest(data);
});
