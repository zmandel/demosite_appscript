import { initializePage, setLanguage } from "./common.js";

function onContentLoaded() {
  const btnPage1 = document.getElementById('page1');
  const btnPage2 = document.getElementById('page2');


  btnPage1.addEventListener('click', function () {
    const url = new URL(window.location.href);
    const paramsSite = new URLSearchParams(window.location.search);

    url.pathname = '/page1';
    //CUSTOMIZE: Set other parameters here, as in:
    //url.searchParams.set("parameter1", value1);
    //where value1 could come from paramsSite.get("parameter1") or other sources
    window.location.assign(url); //navigate forward
  });

  btnPage2.addEventListener('click', function () {
    const url = new URL(window.location.href);
    const paramsSite = new URLSearchParams(window.location.search);

    url.pathname = '/page2';
    //CUSTOMIZE: Set other parameters here, as in:
    //url.searchParams.set("parameter1", value1);
    window.location.assign(url); //navigate forward
  });
}

initializePage({
  loadIframe: false,
  loadAnalytics: true,
  paramsExtra: "",
  callbackMessage: null,
  onError: function () { },
  callbackContentLoaded: onContentLoaded
});