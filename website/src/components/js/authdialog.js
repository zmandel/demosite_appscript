import { LitElement, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import componentHTML from "../html/authdialog.html?raw";
import "../css/dialog.css";
import A11yDialog from "a11y-dialog";
import messageBox from "./messagebox.js";
import { t, toast, applyTranslations, insertSpinner, addTranslationMap } from "../../js/common.js";
import { onAuthStateChanged } from "firebase/auth";

const translations = {
  en: {
    welcomeUser: "Welcome ",
    loginPrompt: "Welcome! log in ",
    signInWithGoogle: "Sign in with Google",
    signInWithEmail: "Sign in with Email",
    emailSignInTitle: "Sign in with Email",
    emailLabel: "Email",
    passwordLabel: "Password",
    forgotPassword: "Forgot password?",
    login: "Login",
    signUp: "Sign Up",
    cancel: "Cancel",
    signInTitle: "Sign in",
    enterEmailPassword: "Please enter both email and password.",
    signUpTitle: "Sign up",
    passwordResetTitle: "Password reset",
    pwdResetAlert: "A password reset link will be sent to the email.",
    enterEmailReset: "Please enter your email to reset your password.",
  },
  es: {
    welcomeUser: "Bienvenido ",
    loginPrompt: "¡Bienvenido! inicia sesión ",
    signInWithGoogle: "Inicia sesión con Google",
    signInWithEmail: "Inicia sesión con Email",
    emailSignInTitle: "Inicia sesión con Email",
    emailLabel: "Correo electrónico",
    passwordLabel: "Contraseña",
    forgotPassword: "¿Olvidaste tu contraseña?",
    login: "Iniciar sesión",
    signUp: "Registrarse",
    cancel: "Cancelar",
    signInTitle: "Iniciar sesión",
    enterEmailPassword: "Por favor ingresa correo y contraseña.",
    signUpTitle: "Registrarse",
    passwordResetTitle: "Restablecer contraseña",
    pwdResetAlert: "Se enviará un enlace de restablecimiento al correo.",
    enterEmailReset: "Por favor ingresa tu correo para restablecer la contraseña.",
  }
};

addTranslationMap(translations);

function initAuth(auth, headerText, rootElement, host) {
  const $ = (id) => rootElement.querySelector(id); //shortcut
  applyTranslations(rootElement, translations);
  $("#loginPrompt").textContent =t("loginPrompt", null, translations) + (headerText || "");
  const googleLoginBtn = $("#google-login-btn");
  const emailOptionBtn = $("#email-option-btn");
  const emailSignupBtn = $("#email-signup-btn");
  const forgotPasswordBtn = $("#forgot-password-btn");
  const emailInput = $("#email-input");
  const passwordInput = $("#password-input");
  const emailDialogEl = $("#email-dialog");
  const emailDialog = new A11yDialog(emailDialogEl);
  const cancelBtn = $("#auth-cancel-btn");
  const emailForm = $("#email-form");
  const emailCancelBtn = $("#email-cancel-btn");
  const spinnerWait = $(".loginSpinnerContainer");
  const emailDialogOverlay = emailDialogEl.querySelector(".dialog-overlay");
  let isBusy = false;
  let emailDialogVisible = false;

  const updateButtonState = () => {
    const disabled = isBusy || emailDialogVisible;
    googleLoginBtn.disabled = disabled;
    emailOptionBtn.disabled = disabled;
    if (cancelBtn)
      cancelBtn.disabled = disabled;
    spinnerWait.style.visibility = isBusy ? "visible" : "hidden";
  };

  host.setBusy = (busy) => {
    isBusy = !!busy;
    updateButtonState();
    host.classList.toggle("auth-busy", isBusy);
  };

  updateButtonState();

  onAuthStateChanged(auth, (user) => {
    updateUI(user);
  });

  function updateUI(user) {
    if (user && !user.emailVerified)
      user = null;
    
    if (user) {
      host.setBusy(false);
      toast(t("welcomeUser", null, translations) + (user.displayName || user.email || ""), { type: "success", position: "tl" });
      if (emailDialog)
        emailDialog.hide();
      if (host) {
        host.hide();
        host.dispatchEvent(new CustomEvent("success", { detail: { user }, bubbles: true, composed: true }));
      }
    } else {
      updateButtonState();
    }
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      host.hide();
      host.dispatchEvent(new CustomEvent("cancel", { bubbles: true, composed: true }));
    });
  }

  googleLoginBtn.addEventListener("click", () => {
    host.dispatchEvent(new CustomEvent("google-login", { bubbles: true, composed: true }));
  });

  const blurFocusedElementOnClick = () => {
    if (emailDialogEl.contains(document.activeElement)) {
      document.activeElement.blur(); //to make aria-hidden happy (accessibility warning)
    }
  };
  emailCancelBtn.addEventListener("click", blurFocusedElementOnClick);
  emailDialogOverlay.addEventListener("click", blurFocusedElementOnClick);

  emailOptionBtn.addEventListener("click", () => {
    emailDialog.show();
  });

  emailDialog.on("show", () => {
    emailDialogVisible = true;
    updateButtonState();
    setTimeout(() => emailInput.focus(), 0);
  });

  emailDialog.on("hide", () => {
    emailDialogVisible = false;
    updateButtonState();
    emailInput.value = "";
    passwordInput.value = "";
  });

  emailInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      passwordInput.focus();
    }
  });

  emailForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = (emailInput.value || "").trim();
    const password = (passwordInput.value || "").trim();
    if (!email || !password) {
      messageBox(t("signInTitle", null, translations), t("enterEmailPassword", null, translations));
      return;
    }
    host.dispatchEvent(new CustomEvent("email-login", {
      detail: { email, password },
      bubbles: true,
      composed: true
    }));
  });

  emailSignupBtn.addEventListener("click", () => {
    const email = (emailInput.value || "").trim();
    const password = (passwordInput.value || "").trim();
    if (!email || !password) {
      messageBox(t("signUpTitle", null, translations), t("enterEmailPassword", null, translations));
      return;
    }
    host.dispatchEvent(new CustomEvent("email-signup", {
      detail: { email, password },
      bubbles: true,
      composed: true
    }));
  });

  forgotPasswordBtn.addEventListener("click", async () => {
    const email = (emailInput.value || "").trim();
    if (!email) {
      messageBox(t("passwordResetTitle", null, translations), t("enterEmailReset", null, translations));
      return;
    }
    const result = await messageBox(t("passwordResetTitle", null, translations), t("pwdResetAlert", null, translations), { cancel: true });
    if (!result)
      return;

    host.dispatchEvent(new CustomEvent("password-reset", {
      detail: { email },
      bubbles: true,
      composed: true
    }));
  });
}

export class AuthDialog extends LitElement {
  #authInitialized = false;

  // Use light DOM so styles in authdialog.html affect global overlay.
  createRenderRoot() { return this; }
  render() {
    // This is safe as it's a local file.
    return html`${unsafeHTML(componentHTML)}`;
  }

  async show(auth, headerText, redirectMode = false, cancelable = false) {
    if (!this.hasUpdated) {
      await this.updateComplete;
    }

    const footer = this.querySelector(".dialog-footer");
    if (cancelable) {
      footer.classList.remove("hidden");
    } else {
      footer.classList.add("hidden");
    }
    
    if (!this.#authInitialized) {
      if (!auth) {
        console.error("AuthDialog: auth instance is required for initialization");
        throw new Error("AuthDialog requires an auth instance");
      }
      initAuth(auth, headerText, this, this);
      this.#authInitialized = true;
    }

    if (this.overlay) this.overlay.classList.add("visible");
    this.classList.add("visible");
  }

  hide() {
    this.classList.remove("visible");
    if (this.overlay) this.overlay.classList.remove("visible");
  }

  firstUpdated() {
    // Initialize auth logic with light DOM root
    // Initialization is now deferred to the first `show()` call
    // to ensure the `auth` object is available.
    this.overlay = getOverlay(this);
    const spinnerHost = this.querySelector(".loginSpinnerContainer");
    if (spinnerHost && !spinnerHost.querySelector(".waitingSpinner")) {
      insertSpinner(spinnerHost);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }
}

function getOverlay(host) {
  let ov = document.getElementById("auth-overlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "auth-overlay";
    ov.className = "auth-overlay";
    ov.setAttribute("aria-hidden", "true");
    ov.addEventListener("click", (e) => {
      e.stopPropagation();
      if (host) {
        host.classList.add("shake");
        setTimeout(() => host.classList.remove("shake"), 500);
      }
    });
    document.body.appendChild(ov);
  }
  return ov;
}

// Define the custom element using the standard browser API.
customElements.define("auth-dialog", AuthDialog);
