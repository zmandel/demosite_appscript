
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithRedirect,
  signInWithCredential,
} from "firebase/auth";
import { getLang, t } from "./common.js";
import messageBox from "./messagebox.js";

const translations = {
  en: {
    googleLoginFailed: "Google login failed",
    loginFailed: "Login failed",
    signUpFailed: "Sign up failed",
    passwordResetFailed: "Password reset failed",
    invalidEmail: "Invalid email address.",
    userNotFound: "User not found.",
    wrongPassword: "Incorrect password.",
    tooManyRequests: "Too many requests. Try again later.",
    emailInUse: "Email already in use.",
    weakPassword: "Password is too weak.",
    networkError: "Network error. Check your connection.",
    popupBlocked: "Popup was blocked. Lets try again in a different way.",
    quickLoginBlocked: "Quick login was blocked. Lets try again in a different way."
  },
  es: {
    googleLoginFailed: "Error al iniciar con Google",
    loginFailed: "Error al iniciar sesión",
    signUpFailed: "Error al registrarse",
    passwordResetFailed: "Error al restablecer la contraseña",
    invalidEmail: "Correo electrónico inválido.",
    userNotFound: "Usuario no encontrado.",
    wrongPassword: "Contraseña incorrecta.",
    tooManyRequests: "Demasiadas solicitudes. Intenta más tarde.",
    emailInUse: "El correo ya está en uso.",
    weakPassword: "La contraseña es demasiado débil.",
    networkError: "Error de red. Verifica tu conexión.",
    popupBlocked: "El popup fue bloqueado. Probemos nuevamente de otra forma.",
    quickLoginBlocked: "El login rápido fue bloqueado. Probemos nuevamente de otra forma."
  }
};

function getErrorMessage(t, error, defaultTitle) {
  const map = {
    "auth/invalid-email": "invalidEmail",
    "auth/user-not-found": "userNotFound",
    "auth/wrong-password": "wrongPassword",
    "auth/invalid-credential": "wrongPassword",
    "auth/too-many-requests": "tooManyRequests",
    "auth/email-already-in-use": "emailInUse",
    "auth/credential-already-in-use": "emailInUse",
    "auth/weak-password": "weakPassword",
    "auth/network-request-failed": "networkError",
    "auth/popup-blocked": "popupBlocked",
  };
  const key = map[error?.code];
  let message = key ? t[key] : null;
  if (!message) {
    message = defaultTitle;
    console.error("Unhandled auth error:", error);
  }
  return { title: defaultTitle, message: message };
}

const ONE_TAP_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let gsiScriptPromise = null;

function getGoogleClientId() {
  const meta = document.querySelector("meta[name=\"google-signin-client_id\"]");
  const globalClientId = window.__GOOGLE_CLIENT_ID__;
  const envClientId = (import.meta && import.meta.env)? import.meta.env.VITE_GOOGLE_SIGNIN_CLIENT_ID : null;
  return globalClientId || meta?.content || envClientId || null;
}

function createOneTapError(code, message) {
  const error = new Error(message || "Google One Tap failed");
  error.code = code;
  return error;
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id)
    return Promise.resolve();

  if (!gsiScriptPromise) {
    gsiScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = ONE_TAP_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.accounts?.id) {
          resolve();
        } else {
          reject(createOneTapError("one-tap-unavailable", "Google Identity Services did not initialize."));
        }
      };
      script.onerror = () => {
        script.remove();
        reject(createOneTapError("one-tap-load-failed", "Failed to load Google Identity Services."));
      };
      document.head.appendChild(script);
    }).catch(error => {
      gsiScriptPromise = null;
      throw error;
    });
  }

  return gsiScriptPromise;
}

function finalizePromptCompletion(callback) {
  let completed = false;
  return (value) => {
    if (completed)
      return;
    completed = true;
    try {
      if (window.google?.accounts?.id?.cancel)
        window.google.accounts.id.cancel();
    } catch {
      // ignore cancellation errors
    }
    callback(value);
  };
}

async function signInWithGoogleOneTap(auth) {
  const clientId = getGoogleClientId();
  if (!clientId)
    throw createOneTapError("one-tap-missing-client-id", "Google One Tap client ID is not configured.");

  await loadGoogleIdentityServices();

  if (!window.google?.accounts?.id)
    throw createOneTapError("one-tap-unavailable", "Google Identity Services is unavailable.");

  return new Promise((resolve, reject) => {
    const safeResolve = finalizePromptCompletion(resolve);
    const safeReject = finalizePromptCompletion(reject);

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        cancel_on_tap_outside: false,
        auto_select: false,
        context: "signin",
        callback: (response) => {
          (async () => {
            try {
              if (!response || !response.credential)
                throw createOneTapError("one-tap-missing-credential", "Missing credential from Google One Tap response.");

              const credential = GoogleAuthProvider.credential(response.credential);
              const userCredential = await signInWithCredential(auth, credential);
              safeResolve(userCredential);
            } catch (error) {
              safeReject(error);
            }
          })();
        },
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (!err.code)
        err.code = "one-tap-unavailable";
      safeReject(err);
      return;
    }

    window.google.accounts.id.prompt((notification) => {
      if (typeof notification?.isNotDisplayed === "function" && notification.isNotDisplayed()) {
        safeReject(createOneTapError("one-tap-unavailable", notification.getNotDisplayedReason?.() || "Google One Tap was not displayed."));
        return;
      }
      if (typeof notification?.isSkippedMoment === "function" && notification.isSkippedMoment()) {
        const reason = notification.getSkippedReason?.();
        if (reason === "credential_returned")
          return;
        if (reason === "user_cancelled") {
          safeReject(createOneTapError("one-tap-dismissed", reason));
          return;
        }
        safeReject(createOneTapError("one-tap-unavailable", reason || "Google One Tap was skipped."));
        return;
      }
      if (typeof notification?.isDismissedMoment === "function" && notification.isDismissedMoment()) {
        const reason = notification.getDismissedReason?.();
        if (reason === "credential_returned")
          return;
        if (reason === "tap_outside" || reason === "user_cancelled" || reason === "cancel_called") {
          safeReject(createOneTapError("one-tap-dismissed", reason));
          return;
        }
        safeReject(createOneTapError("one-tap-unavailable", reason || "Google One Tap was dismissed."));
      }
    });
  });
}

function shouldFallbackToFirebaseProvider(error) {
  return error?.code === "one-tap-unavailable"
    || error?.code === "one-tap-missing-client-id"
    || error?.code === "one-tap-load-failed";
}

function handleFirebaseProviderError(e) {
  if (!e)
    return;
  const code = e.code;
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request")
    return;
  const { title, message } = getErrorMessage(t, e, t(translations).googleLoginFailed);
  if (code === "auth/popup-blocked") {
    messageBox(title, message, { cancel: true }).then((result) => {
      if (result) {
        const url = new URL(window.location.href);
        url.pathname = "/login";
        url.searchParams.set("forceRedirect", "1");
        url.searchParams.set("lang", getLang());
        let w = null;
        const messageHandler = function (event) {
          if (event.origin !== window.location.origin)
            return;
          if (w && event.data && event.data.type === "login-done") {
            window.removeEventListener("message", messageHandler);
            try {
              w.close();
              w = null;
            } catch {
              console.warn("Failed to close popup window");
            }
          }
          if (event.data.messageError)
            messageBox(t(translations).loginFailed, event.data.messageError);
        };
        window.addEventListener("message", messageHandler);
        w = window.open(url, "_blank"); //no noopener so we can close it later
      }
    });
    return;
  }
  messageBox(title, message);
  throw e;
}

export async function doGoogleAuth(auth, redirectMode) {
  try {
    return await signInWithGoogleOneTap(auth);
  } catch (error) {
    if (error?.code === "one-tap-dismissed")
      return;

    if (shouldFallbackToFirebaseProvider(error)) {
      if (!redirectMode) {
        const ret = await messageBox(t(translations).googleLoginFailed, t(translations).quickLoginBlocked, { cancel: true });
        if (!ret)
          return;
      }
      const provider = new GoogleAuthProvider();
      const fbCall = redirectMode ? signInWithRedirect : signInWithPopup;
      return fbCall(auth, provider).catch(handleFirebaseProviderError);
    }

    handleFirebaseProviderError(error);
    throw error;
  }
}

export async function doEmailLogin(auth, email, password) {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    const { title, message } = getErrorMessage(t, error, t(translations).loginFailed);
    messageBox(title, message);
    throw error;
  }
}

export async function doEmailSignup(auth, email, password) {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCred.user);
    return userCred;
  } catch (error) {
    const { title, message } = getErrorMessage(t, error, t(translations).signUpFailed);
    messageBox(title, message);
    throw error;
  }
}

export async function doPasswordReset(auth, email) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    const { title, message } = getErrorMessage(t, error, t(translations).passwordResetFailed);
    messageBox(title, message);
    throw error;
  }
}
