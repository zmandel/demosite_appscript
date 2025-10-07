import { t } from "../js/common.js";
import { signOut, setPersistence, indexedDBLocalPersistence, getAuth, onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { doGoogleAuth, doEmailLogin, doEmailSignup, doPasswordReset } from "./authService.js";
import messageBox from "./messagebox.js";
import "../components/authdialog.js";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_KEY,
  authDomain: import.meta.env.VITE_ROOT_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJNAME,
};

const authState = {
  auth: null,
  user: null,
  headerText: "",
};

export async function signOutCurrentUser() {
  if (authState.user) {
    await signOut(authState.auth);
  }
}

export async function getCurrentUser(force, cancelable = false) {
  if (authState.user)
    return authState.user;

  if (!force)
    return null;
  return await showAuthDialog(authState.headerText, cancelable);
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
 * Initializes the Firebase authentication listener.
 * @param {Promise<void>} [readyPromise] - A promise to await before processing the first auth state.
 * @param {() => void} [onDone] - A callback to run once the initial user state is determined (just once).
 */
export async function setupAuth({ doAuth, headerText, redirectMode, forceRedirect, readyPromise }, onDone) {
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
    if (readyPromise) {
      await readyPromise;
      readyPromise = null;
    }
    onDoneOneTime(error.message);
  }

  onAuthStateChanged(authState.auth, async user => {
    authState.user = user;
    if (pauseActions)
      return;
    if (readyPromise) {
      // waiting here means the firebase auth async loading happens while the app page loads,
      // thus here we finally make sure the page is ready before showing UI,
      // for example the page might want to have its analytics loaded).
      await readyPromise;
      readyPromise = null;
    }

    if (forceRedirect && !user) {
      doGoogleAuth(authState.auth, true);
      return;
    }

    if (doAuth && !user) {
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
          await messageBox(t(translations).signInTitle, t(translations).verifyEmailBefore);
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

/**
 * Displays the authentication dialog.
 * @returns {Promise<import("firebase/auth").User>} A promise that resolves with the user object upon successful login,
 * or rejects if the dialog is cancelled.
 */
function showAuthDialog(headerText, cancelable = false) {
  return new Promise((resolve, reject) => {
    let dialog = document.querySelector('auth-dialog');
    if (!dialog) {
      dialog = document.createElement('auth-dialog');
      document.body.appendChild(dialog);
    }

    const handleSuccess = (event) => {
      cleanUp();
      resolve(event.detail.user);
    };

    const handleCancel = () => {
      cleanUp();
      reject(new Error('Authentication cancelled by user.'));
    };

    const handleGoogleLogin = () => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("failPopup") === "1")
        window.open("about:blank", "_blank"); //two popups in a row will trigger the popup-blocked error in Chrome
      doGoogleAuth(authState.auth, authState.redirectMode);
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
        messageBox(t(translations).passwordResetTitle, t(translations).passwordResetSent);
      } catch (error) {
        console.error("Password reset error:", error);
        // Error is already displayed by authService
      }
    };

    function cleanUp() {
      dialog.removeEventListener('success', handleSuccess);
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('google-login', handleGoogleLogin);
      dialog.removeEventListener('email-login', handleEmailLogin);
      dialog.removeEventListener('email-signup', handleEmailSignup);
      dialog.removeEventListener('password-reset', handlePasswordReset);
    }

    dialog.addEventListener('success', handleSuccess, { once: true });
    dialog.addEventListener('cancel', handleCancel, { once: true });
    dialog.addEventListener('google-login', handleGoogleLogin);
    dialog.addEventListener('email-login', handleEmailLogin);
    dialog.addEventListener('email-signup', handleEmailSignup);
    dialog.addEventListener('password-reset', handlePasswordReset);

    dialog.show(authState.auth, headerText, authState.redirectMode, cancelable);
  });
}
