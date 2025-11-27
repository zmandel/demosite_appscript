import { getLang, initializePage } from "./common.js";
import messageBox from "./messagebox.js";
import {
  setupAuth,
  getCurrentUser,
  signOutCurrentUser,
} from "./firebaseauth.js";

const urlParams = new URLSearchParams(window.location.search);
const forceRedirect = urlParams.get("forceRedirect") === "1";
const translations = {
  en: {
    closeTab: "You can now close this tab.",
    loginSuccess: "Logged in successfully.",
    loginCancelled: "Login cancelled or failed.",
    verifyEmailBefore: "Verify your email from the link in your inbox and try again."
  },
  es: {
    closeTab: "Ya puedes cerrar esta pestaña.",
    loginSuccess: "Has iniciado sesión correctamente.",
    loginCancelled: "El inicio de sesión fue cancelado o falló.",
    verifyEmailBefore: "Verifica tu correo desde el enlace en tu bandeja de entrada y vuelve a intentarlo."
  }
};

if (forceRedirect) {
  //prevent redirect loop in cases where the google redirect fails and comes back
  const url = new URL(window.location.href);
  url.searchParams.delete("forceRedirect");
  window.history.replaceState({}, document.title, url.toString());
}

function initializeAuth() {
  setupAuth({
      doAuth: true,
      headerText: "",
      redirectMode: true,
      forceRedirect,
    }, async (loginFromRedirect, errText) => {
    if (errText)
      messageBox("Error", errText);
    let user = await getCurrentUser(false);
    const t = translations[getLang() || "en"] || translations["en"];
    let innerHTML = "";

    if (user) {
      if (!user.emailVerified) {
        console.warning("Email not verified in login redirect mode");
        signOutCurrentUser();
        user = null;
        innerHTML = t.verifyEmailBefore;
      } else {
        innerHTML = t.loginSuccess;
        console.log("Login successful in redirect mode");
      }
    } else {
      innerHTML = t.loginCancelled;
    }

    let textShort = innerHTML;
    innerHTML += "<br>" + t.closeTab;
    const box = document.createElement("div");
    box.className = "centerMessage";
    box.innerHTML = innerHTML;
    document.body.appendChild(box);
    if (!user)
      return;

    // we used to have a BroadcastChannel here to notify the opener window,
    // but now we instead use the firebase auth mode indexedDBLocalPersistence
    // which automatically calls onAuthStateChanged in the opener window.
    if (window.opener)
      window.opener.postMessage({ type: "login-done", messageError: user ? null : textShort }, window.location.origin);
  })
}


initializePage({
  captureLogs: true,
  loadIframe: false, //we load it later, so login is initialized first
  loadAnalytics: true,
  callbackContentLoaded: initializeAuth
});
