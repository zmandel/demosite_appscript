import "../css/dialog.css";
import A11yDialog from "a11y-dialog";

/**
 * Show a simple message box with OK and optional Cancel buttons.
 * @param {string} title Dialog title
 * @param {string} message Message paragraph
 * @param {{cancel?: boolean, okText?: string, cancelText?: string}} [options]
 * @returns {Promise<boolean>} Resolves with the button clicked.
 */
export default function messageBox(title, message, options = {}) {
  const { cancel = false, okText = "OK", cancelText = "Cancel" } = options;
  return new Promise((resolve) => {
    const dialogEl = document.createElement("div");
    dialogEl.className = "dialog";
    dialogEl.setAttribute("aria-hidden", "true");
    const titleId = `msgbox-title-${Math.random().toString(36).slice(2)}`;
    dialogEl.setAttribute("aria-labelledby", titleId);

    const overlay = document.createElement("div");
    overlay.className = "dialog-overlay";
    if (cancel) overlay.setAttribute("data-a11y-dialog-hide", "");

    const content = document.createElement("div");
    content.className = "dialog-content";
    content.setAttribute("role", "document");

    const h2 = document.createElement("h2");
    h2.id = titleId;
    h2.textContent = title;

    const p = document.createElement("p");
    p.style.whiteSpace = "pre-line";
    p.textContent = message;

    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.textContent = okText;

    content.appendChild(h2);
    content.appendChild(p);
    content.appendChild(okBtn);

    let cancelBtn;
    if (cancel) {
      cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = cancelText;
      content.appendChild(cancelBtn);
    }

    dialogEl.appendChild(overlay);
    dialogEl.appendChild(content);
    document.body.appendChild(dialogEl);

    const dialog = new A11yDialog(dialogEl);
    // This is the result if the dialog is closed by ESC or overlay click.
    // An OK-only dialog should resolve true, an OK/Cancel dialog should resolve false.
    let result = !cancel;

    okBtn.addEventListener("click", () => {
      result = true;
      dialog.hide();
    });

    cancelBtn?.addEventListener("click", () => {
      result = false;
      dialog.hide();
    });

    const hideHandler = () => {
      // Unregister self to prevent recursion, as destroy() can trigger hide().
      dialog.off("hide", hideHandler);
      dialog.destroy();
      dialogEl.remove();
      resolve(result);
    };

    dialog.on("hide", hideHandler);

    dialog.show();
    setTimeout(() => okBtn.focus({ preventScroll: true }), 0);
  });
}
