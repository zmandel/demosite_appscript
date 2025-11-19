# Website Guidelines

This Vite project implements the website that hosts the Apps Script web app via an iframe bridge.
It implementes two different methods (#1 and #2) for hosting the Apps Script:
- Method #1 embeds the GAS webapp, which shows its frontend inside the iframe.
- Method #2 keeps the frontend on the top window, outside the GAS iframe, using GAS only to call .gs backend functions.

Consult the root `readme.md` whenever you modify either method so the repo-wide documentation (especially the messaging table) matches the behavior described here and in `google-apps-script/AGENTS.md`.

## Project layout
- `src/index.html`, `src/page{1-3}.html`, and `src/login.html` are Vite entry points defined in `vite.config.js`. Page 1 & 2 embed the GAS HTMLService (method #2), while `page3` demonstrates the top-level bridge (method #1).
- `src/js/common.js` centralizes iframe loading, messaging, Google Tag Manager loading, logging queue management, cryptographic validation for the org/sig feature, and translation helpers. Pages wire themselves by calling `initializePage(...)` from this module.
- `src/js/page*.js` contain page-specific bootstrap logic that imports helpers from `common.js`. Each file (including `src/js/index.js`) is responsible for invoking `initializePage` with the right callbacks and query parameters.
- `src/login.html` is a fallback page for Firebase login, used when both fedCM and Popup modes fail, opened with an oauth redirect flow.
- `src/js/firebaseauth.js` wraps the Firebase SDK configuration, dialog lifecycle, and exposes helpers (`setupAuth`, `getCurrentUser`, `signOutCurrentUser`) used by the demo pages and iframe message handlers.
- It is paired with `src/js/authService.js`, which orchestrates the `<auth-dialog>` component shown by the login flow.
- `src/components/` has reusable components. UI uses `lit` and ships the Firebase auth dialog (`components/js/authdialog.js`).
- `src/components/js/gscriptrun` mirrors the `google.script` API so method #1 pages can call `.gs` functions from the parent window. Use `import { server }` for promise-based calls or directly use the `google.script.run` proxy.
- `src/css/` contains shared styles. Keep selectors descriptive; components import what they need explicitly.
- `static/` exposes assets copied verbatim by Vite. Anything referenced from HTML should live here or under `src/`.
- `functions/` is a separate optional project that implements Firebase Cloud functions, used for logging to GCP.
- `functions/api/logs.js` defines the Cloud Function that relays console output to Cloud Logging. It relies on the `ALLOWED_HOST` environment variable (see `firebase.json`).

### Adding a new page or entry point
- Create the HTML file under `src/` and register it in `vite.config.js -> build.rollupOptions.input`.
- Provide a page script under `src/js/` that calls `initializePage` and, if needed, imports Firebase auth helpers. Reuse the options (`loadIframe`, `paramsExtra`, `callbackMessage`, etc.) visible in existing pages to stay consistent with the iframe contract.
- For iframe-backed flows (method #2) keep the messaging contract in sync with `google-apps-script/src/js/bridge.js`. For parent-hosted flows (method #1) use the `GS` helper from `components/js/gscriptrun.js` or the mirrored `google.script` namespace.

## Environment & configuration
Environment variables live in `website/src/.env` and `website/src/.env.local`. The following keys are consumed in code:

| Key | Used in | Description |
| --- | ------- | ----------- |
| `VITE_ORG_DEFAULT` | `js/common.js` | Default organization identifier passed to the iframe bridge.
| `VITE_ENDPOINT_PUT_LOGS` | `js/common.js` | HTTPS endpoint (Firebase function) that receives batched console logs.
| `VITE_FIREBASE_PROJNAME` | `js/common.js`, `js/firebaseauth.js` | Firebase project ID shared with the Apps Script runtime.
| `VITE_ROOT_DOMAIN` | `js/common.js`, `js/firebaseauth.js` | Hostname expected during domain validation and Firebase Auth.
| `VITE_GTM_ID` | `js/common.js` | Google Tag Manager container ID.
| `VITE_LANG_DEFAULT` | `js/common.js` | Default locale for translations.
| `VITE_PUBLIC_KEY_X`, `VITE_PUBLIC_KEY_Y` | `js/common.js` | Elliptic-curve public key used to validate iframe signatures (generate via `util-org-sig`).
| `VITE_FIREBASE_KEY` | `js/firebaseauth.js` | Firebase Web API key.
| `VITE_GOOGLE_SIGNIN_CLIENT_ID` | `js/authService.js` | Optional Google One Tap client ID if not injected via `<meta>` or global.

Keep `.env.local` for developer overrides. Update both the website and Apps Script environments when adjusting shared values such as domain or organization identifiers.

### Org/sig security keys
- Use the helper under `util-org-sig/` to generate the EC keypair. Only the public key belongs in this repo (`g_publicKeyJwk` in `common.js`).
- `org`/`sig` parameters determine which Apps Script deployment to load. When you add a new deployment, sign its script ID with the private key outside the repo and share the resulting `sig` with the website build/deploy pipeline.
- Keep the constants synchronized with `google-apps-script/src/js/util.js` and `google-apps-script/src/.env` so both projects validate the same signatures.

## Core runtime flow
- `initializePage` orchestrates GTM loading, iframe bootstrapping, and message routing. Supply optional callbacks such as `callbackLoadEvents` to react to `loadEvents`, or `callbackMessage` to handle `postMessage` actions sent by GAS (see `_util.gs` and `bridge.js`).
- The iframe is lazily created via `loadIframeFromCurrentUrl`. Parent pages can delay the load until Firebase auth finishes.
- `serverRequest` is the raw function to send requests into GAS for method #1 and resolves when the iframe replies with a `serverResponse`. This function is used from `gscriptrun.js`.
- Logging is buffered until `sendLogsToServer` can push to the Cloud Function. During local development the queue stays client-side to avoid noise.
- Authentication flows originate from `firebaseauth.js` and `authService.js`, which render the `<auth-dialog>` component. Redirect logins are used as fallback, opening `/login.html` to automatically handle it.
- To extend analytics, add custom dimensions in `g_dimensionsGTM`.

## Firebase Hosting & Cloud Functions
- Hosting configuration lives in `firebase.json`. `/api/**` routes proxy to the Express app exported from `functions/index.js`; add new endpoints there.
- `functions/api/logs.js` enforces a per-request cap (`g_maxLogsSend = 10`) that must stay in sync with `google-apps-script/src/js/util.js`. The `ALLOWED_HOST` env var should match your production hostname so only Firebase Hosting requests are accepted.
- Cloud Functions require **Node.js 22** (`functions/package.json -> engines.node`). Install dependencies in `website/functions/` separately from the frontend.

## Tooling & scripts
- Install dependencies with `npm install` in both `website/` and `website/functions/` (if you change the Cloud Function code).
- Vite scripts (`package.json`):
  - `npm run dev` – start the dev server on port 5173.
  - `npm run debug` – dev server bound to `0.0.0.0` for LAN/HTTPS testing. Enable HTTPS by providing certs referenced in `vite.config.js`.
  - `npm run build` – generate the static site in `dist/`.
  - `npm run preview` – serve the production build locally on port 4173.
  - `npm run deploy` – build then deploy Hosting via the Firebase CLI (ensure you are logged in with `firebase login`).
  - `npm run deployserver` – deploy only Cloud Functions.
- Optional Firebase CLI helpers inside `website/functions/package.json` include `npm run serve` (emulators) and `npm run logs`.

## Development workflow
1. Run `npm install` in `website/` and, separately, in `website/functions/` if you change the Cloud Function code.
2. Use `npm run dev` (or `npm run debug` for LAN/HTTPS) to serve the Vite app from `src/`. Output is written to `dist/` when you run `npm run build`.
3. Deploy Hosting + Functions with `npm run deploy` from `website/`. Use `npm run deployserver` if you only changed backend code.
4. Cloud Functions require **Node.js 22** (see `website/functions/package.json`). The front-end tooling works with modern Node (>=18).
5. Configure runtime secrets via `.env`/`.env.local` files placed in `website/src/`. Vite exposes them through `import.meta.env.VITE_*`—the keys referenced in `common.js` must be defined before building.

## Coding standards
- Use **2 spaces** for indentation in JavaScript, HTML, and CSS to match the existing files.
- Prefer double quotes for strings and terminate statements with semicolons.
- Keep translation dictionaries (`translations` objects in `common.js`, `authService.js`, `firebaseauth.js`, and `components/js/*.js`) in sync across supported languages when introducing new keys.
- When adding new iframe events, update the handler switch in `common.js` and mirror the contract on the Apps Script side (`google-apps-script/src/js/bridge.js`).
- Route all log output through the queuing helpers in `common.js` so the Firebase function can forward them consistently.

No automated tests exist for this project. Run the relevant build command(s) before submitting changes.
