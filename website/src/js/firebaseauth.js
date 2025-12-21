import { t, isOnline } from "../js/common.js";
import { signOut, setPersistence, indexedDBLocalPersistence, getAuth, onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { doGoogleAuth, doEmailLogin, doEmailSignup, doPasswordReset, loadGIS } from "./authService.js";
import messageBox from "../components/js/messagebox.js";
import "../components/js/authdialog.js";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_KEY,
  authDomain: import.meta.env.VITE_ROOT_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJNAME,
};

const g_keyUserCached = "userCached";
const g_allowCachedUsers = true; //allows to load an offline page that is protected by login, even if the auth token is no longer valid.
const authState = {
  auth: null,
  user: null,
  headerText: "",
};

export async function signOutCurrentUser() {
  if (g_allowCachedUsers)
    localStorage.removeItem(g_keyUserCached);
  if (authState.user) {
    if (authState.user.isCached) {
      authState.user = null; //TODO: more robust way for future unhandled onAuthStateChanged calls
      return;
    }
    await signOut(authState.auth);
  }
}

export async function getCurrentUser(force, cancelable = false, addIdToken = false) {
  let user = null;

  if (authState.user)
    user = authState.user;

  if (!user) {
    if (!force)
      return null;
    
    user = await showAuthDialog(authState.headerText, cancelable);
  }
  
  if (user && addIdToken && !user.isCached)
      user.idToken = await user.getIdToken();
  
  if (!user && !cancelable) {
    console.error("No user error"); //bug. showAuthDialog should have been called
    throw new Error("Authentication error");
  }
  return user;
}

const translations = {
  en: {
    signInTitle: 'Sign in',
    signUpTitle: 'Sign up',
    verifyEmailBefore: 'Verify your email from the link in your inbox and try again.',
    passwordResetTitle: 'Password reset',
    passwordResetSent: 'A password reset link has been sent to the email.',
  },
  es: {
    signInTitle: 'Iniciar sesión',
    signUpTitle: 'Registrarse',
    verifyEmailBefore: 'Verifica tu correo desde el enlace en tu bandeja de entrada y vuelve a intentarlo.',
    passwordResetTitle: 'Restablecer contraseña',
    passwordResetSent: 'Se envió un enlace de restablecimiento al correo.',
  }
};

let loginFromRedirect = false;
authState.auth = getAuth(initializeApp(firebaseConfig));
setPersistence(authState.auth, indexedDBLocalPersistence);

/**
 * Call after content loaded to set up authentication state handling.
 * @param {Object} options - Configuration options.
 * @param {boolean} options.doAuth - If true, prompts for login immediately if not authenticated.
 * @param {string} [options.headerText] - Title text for the authentication dialog.
 * @param {boolean} options.redirectMode - If true, uses page redirection for Google Sign-In instead of a popup.
 * @param {boolean} options.forceRedirect - If true, inmediately redirects to Google Sign-In if not authenticated (skips dialog).
 * @param {function(boolean, string=): void} [onDone] - Callback run once initial auth state is resolved. Args: (loginFromRedirect, errorMessage).
 */
export async function setupAuth({ doAuth, headerText, redirectMode, forceRedirect = false } = {}, onDone) {
  if (typeof redirectMode === "undefined")
    redirectMode = ((new URLSearchParams(window.location.search)).get("redirectMode") === "1");
  authState.redirectMode = redirectMode;
  authState.headerText = headerText || "";
  let pauseActions = false;

  function onDoneOneTime(message) {
    if (pauseActions) {
      console.warning("paused but onDoneOneTime called");
      return;
    }
    doAuth = false; //once the first flow finishes, we dont force auth anymore
    if (!onDone)
      return;

    const cb = onDone;
    onDone = null;
    cb(loginFromRedirect, message);
  }

  // Handle the redirect result before setting up the main auth state listener.
  // This avoids a race condition where onAuthStateChanged might consume the
  // redirect result before getRedirectResult can process it.
  try {
    const result = await getRedirectResult(authState.auth);
    if (result) {
      // User signed in via redirect. `onAuthStateChanged` will now fire with this user.
      loginFromRedirect = true;
    }
  } catch (error) {
    console.error("Error during redirect sign-in:", error);
    onDoneOneTime(error.message);
  }

  onAuthStateChanged(authState.auth, async user => {
    authState.user = user;
    const isUserOnline = isOnline();
    
    function saveCachedUser () {
      if (!user) {
        if (isUserOnline)
          localStorage.removeItem(g_keyUserCached);
        return;
      }
      
      if (!g_allowCachedUsers)
        return;
      let userCached = {};
      userCached.uid = user.uid;
      userCached.email = user.email;
      userCached.emailVerified = user.emailVerified;
      userCached.displayName = user.displayName;
      userCached.isAnonymous = user.isAnonymous;
      userCached.photoURL = user.photoURL;
      userCached.providerData = user.providerData;
      userCached.isCached = true;
      localStorage.setItem(g_keyUserCached, JSON.stringify(userCached));
    }
    
    saveCachedUser();
    
    if (pauseActions)
      return;

    if (forceRedirect && !user) { //forceRedirect only happens in the Google case. TODO: generalize later
      doGoogleAuth(authState.auth, true).catch(err => {
        console.error("Error during forced redirect sign-in:", err);
      });
      return;
    }

    if (doAuth && !user) {

      if (!isUserOnline) {
        if (g_allowCachedUsers) {
          const strUser = localStorage.getItem(g_keyUserCached);
          if (strUser) {
            try {
            user= JSON.parse(strUser);
            if (!user || !user.isCached)
              throw new Error("bad cached user format");
            } catch (e) {
              console.error("Error parsing cached user data:", strUser, e);
            }
          }
        }
        if (user) {
          authState.user = user;
          onDoneOneTime();
          return;
        }
      }
      // If auth is required and there's no user, show the dialog.
      // The onAuthStateChanged listener will re-run upon successful login.
      showAuthDialog(authState.headerText, false).catch(err => {
        // Signal that the initial auth flow is complete, even if the user cancelled.
        onDoneOneTime();
      });
    } else {
      if (user && !user.emailVerified) {
        // The user will see a message from the login dialog, which remains open.
        // the user then either verifies the email and continues login,
        // or cancels the login dialog
          pauseActions = true; //temporarily prevent the recursive call to finish the flow.
          await signOutCurrentUser();
          pauseActions = false;
          await messageBox(t("signInTitle", null, translations), t("verifyEmailBefore", null, translations));
          if (!isAuthDialogCreated()) {
            //user left the app without vetrifying, just before we logged them out during onboarding.
            showAuthDialog(authState.headerText, !doAuth).catch(err => {
              // Signal that the initial auth flow is complete, even if the user cancelled.
              onDoneOneTime();
            });
          }
      }
      else {
        onDoneOneTime();
      }
    }
  });
}

function isAuthDialogCreated() {
  const dialog = document.querySelector('auth-dialog');
  return dialog != null;
}

let g_controllerAuthDialog = null;
/**
 * Displays the authentication dialog.
 * @returns {Promise<import("firebase/auth").User>} A promise that resolves with the user object upon successful login,
 * or rejects if the dialog is cancelled.
 */
async function showAuthDialog(headerText, cancelable = false) {
  if (g_controllerAuthDialog) {
    g_controllerAuthDialog.abort();
    g_controllerAuthDialog = null;
  }
  g_controllerAuthDialog = new AbortController();
  const { signal } = g_controllerAuthDialog;
  
  try {
    await loadGIS(); //preload
  } catch (error) {
    console.error("Error loading Google Identity Services:", error);
    //continue
  }
  return new Promise((resolve, reject) => {
    let dialog = document.querySelector('auth-dialog');
    if (!dialog) {
      dialog = document.createElement('auth-dialog');
      document.body.appendChild(dialog);
    }

    const handleSuccess = (event) => {
      resolve(event.detail.user);
    };

    const handleCancel = () => {
      if (cancelable)
        resolve(null);
      else
      reject(new Error('Authentication cancelled by user.'));
    };

    const handleGoogleLogin = async () => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("failPopup") === "1")
        window.open("about:blank", "_blank"); //two popups in a row will trigger the popup-blocked error in Chrome

      dialog.setBusy?.(true);
      try {
        await doGoogleAuth(authState.auth, authState.redirectMode);
      } catch (error) {
        console.warn("Google auth error:", error);
        // doGoogleAuth already surfaces the error via messageBox
      } finally {
        dialog.setBusy?.(false);
      }
    };

    const handleEmailLogin = async (event) => {
      try {
        const { email, password } = event.detail;
        const userCred = await doEmailLogin(authState.auth, email, password);
        if (userCred.user && !userCred.user.emailVerified) {
          //the auth state listener will handle the rest of the flow.
        } else {
          dialog.hide();
        }
      } catch (error) {
        console.error("Login error:", error);
        // Error is already displayed by authService
      }
    };

    const handleEmailSignup = async (event) => {
      try {
        const { email, password } = event.detail;
        const userCred = await doEmailSignup(authState.auth, email, password);
      } catch (error) {
        console.error("Signup error:", error);
        // Error is already displayed by authService
      }
    };

    const handlePasswordReset = async (event) => {
      try {
        const { email } = event.detail;
        await doPasswordReset(authState.auth, email);
        messageBox(t("passwordResetTitle", null, translations), t("passwordResetSent", null, translations));
      } catch (error) {
        console.error("Password reset error:", error);
        // Error is already displayed by authService
      }
    };

    dialog.addEventListener('success', handleSuccess, { once: true, signal });
    dialog.addEventListener('cancel', handleCancel, { once: true, signal });
    dialog.addEventListener('google-login', handleGoogleLogin, { signal });
    dialog.addEventListener('email-login', handleEmailLogin, { signal });
    dialog.addEventListener('email-signup', handleEmailSignup, { signal });
    dialog.addEventListener('password-reset', handlePasswordReset, { signal });

    dialog.show(authState.auth, headerText, authState.redirectMode, cancelable);
  });
}
