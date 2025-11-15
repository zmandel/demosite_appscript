# Google Apps Script Website Integration Framework

**Develop, debug and publish Google Apps Script webapps as a regular website without any frontend restrictions**

 → Provides two robust methods (#1 and #2) to load your GAS pages depending on your needs.  
 → Sample, live Apps Script pages illustrate various interaction patterns.  
 → `agents.md` files to facilitate your use of AI coding agents.  

**This repo contains two projects**, one for the website and another for the GAS. Both projects work together and implement the functionalities for methods #1 and #2. Additionally, the website contains an optional sub-project for a Firebase backend.

## Documentation map
- **`readme.md` (this file)** – Conceptual overview of the bridge and iframe modes, setup notes, and the shared messaging contract table. Keep this file in sync whenever integrations change.
- **`AGENTS.md`** – Repository-wide contribution guide. When you edit any directory, read the `AGENTS.md` closest to that file for coding standards.
- **`website/AGENTS.md`** – Build/deploy instructions plus architectural notes for the Vite website (including the optional `functions/` folder).
- **`google-apps-script/AGENTS.md`** – Bundling, clasp, and iframe/bridge coordination details for the Apps Script project.
- **`util-org-sig/readme.md`** – Companion doc describing how to generate signing keys for the multi-org loader.

## Index
- [Method #1️⃣: Use a regular frontend (prefered)](#method-1️⃣-use-a-regular-frontend-prefered)
- [Method #2️⃣: Load GAS HTMLService as an iframe](#method-2️⃣-load-gas-htmlservice-as-an-iframe)
- [Additional functionality for both methods #1 and #2](#additional-functionality-for-both-methods-1-and-2)
- [Firebase Auth](#firebase-auth)
- [Demos](#demos)
- [Production Website using this framework](#production-website-using-this-framework)
- [Directory Structure](#directory-structure)
- [Setup & Configuration common to both projects (website and apps script)](#setup--configuration-common-to-both-projects-website-and-apps-script)
- [Website project `website/`](#website-project-website)
  - [Key Features](#key-features)
  - [Setup & Configuration](#setup--configuration)
- [Google Apps Script project `google-apps-script/`](#google-apps-script-project-google-apps-script)
  - [Key Features](#key-features-1)
  - [Setup & Configuration](#setup--configuration-1)
  - [Local debugging](#local-debugging)
  - [Script Properties](#script-properties)
  - [Sample Pages](#sample-pages)
  - [Key Files](#key-files)
  - [Deploy Apps Script](#deploy-apps-script)
- [Customization](#customization)
- [Messaging Protocol](#messaging-protocol)
  - [Message highlights](#message-highlights)
- [License](#license)



## Method #1️⃣: Use a regular frontend (prefered)
The coolest one. Completely liberates you from all GAS webapp limitations but it does not support [GAS HTML Templates](https://developers.google.com/apps-script/guides/html/templates)
1. Runs the frontend in the top window, outside of the GAS webapp iframe.
2. Provides a mirror `google.script` API as a transparent bridge for invoking `.gs` server-side functions.
3. Develop, debug an publish the frontend using any tooling, frameworks, libraries or languages (React, Vue, Typescript, Vite, live reloading, etc.)
4. Use all the browser functionalities without restrictions imposed by the GAS iframe like localStorage, notifications, credential APIs, serviceWorker, direct URL access, etc.
5. Build as SPA, MPA or PWA.
6. Reduce GAS load by moving all the frontend serving outside of GAS.

## Method #2️⃣: Load GAS HTMLService as an iframe
Run an MPA, each page using a different GAS frontend HTMLService. Runs the GAS webapps inside an iframe. Can behave more like a regular frontend by using special helpers to avoid HTMLService limitations.
This was the original functionality of the framework and can still be useful if you rely heavily on [GAS HTML Templates](https://developers.google.com/apps-script/guides/html/templates), otherwise its best to migrate your HTML template to regular HTML and handle the templating from the frontend js.  

Works arround the limitations of a GAS frontend inside an iframe:
1. **Custom Domain Serving**: Serves apps under a custom domain, providing more control than Google Sites.
2. **Analytics Integration**: Manages Google Analytics through GTM, receiving events from embedded Apps Scripts.
3. **Smooth Transitions**: Avoids flashing screens by smoothly transitioning page loads on a MPA webapp.
4. **Responsive Design**: Ensures compatibility on both mobile and desktop devices.
5. **Change the browser header colorscheme** to match the script webapp.
6. **Fullscreen support**

## Additional functionality for both methods #1 and #2:
1. **Multi-account Compatibility**: Ensures functionality even when users are signed into multiple Google accounts (a long standing issue with GAS HTMLService.)
2. **Google Workspace Compatibility**: Handles redirects typically problematic when users are under a Google Workspace account profile (another long standing issue with GAS HTMLService.)
3. **Dynamic Multiple Script version Loading**: Securely loads different script versions (could be on the same or a different Google Workspace or Google Account) under the same website routes by passing parameters for different "organizations" you can create with the "org/sig" feature.
4. **Secure domain serving**: Only allows your specific domain to embed the apps script iframes.
5. **Firebase auth** including the new Google Sign-in by fedCM with automatic popup and redirect mode fallback without reloading the current page.
6. **Promise-based calls to google.script.** with automatic retries for common communication errors to the server.
7. **Bundling system** for apps script:
    - organize files as html, js, css, gs.
    - use `.env` / `.env.local` variables shared in `.js` and `.gs` files to better organize and share variables without hardcoded values.
    - For method #2: bundle into inlined html files to improve performance and comply with the apps script format.
    - Website only bundles what you use.
8. **Logs to GCP Logging**: Sends logging events to the parent website, which sends the frontend logs to GCP (same place where the .gs logs go.)
9. **Easy installation and customization**: just `npm install` in both the website and apps script directories, customize `.env.local` files and `npm deploy`. The website uses vite and the apps script uses a custom npm bundling script and `clasp` to deploy from the command-line.
10. Optional helpers to support multiple languages in your website (both in `website` and `HTMLService`) using `i18n` tags.

## Firebase Auth
Can be used with both hosting methods.
I implemented this because I couldnt find a good firebase UI that could be:
- bundable to generate much smaller code.
- handled all possible cases in the auth flow automatically, including redirection when both fedCM and popups are blocked or on older browsers.  

It can be used independent of Apps Script. Its a `lit` component with:
- English & Spanish translations.
- Bundling support (the official FirebaseUI can´t bundle).
- "Google" signin and "Email & Password" signin, including the "verify email flow".
- Extends Firebase Auth with Google FedCM Signing, the newest method with the least user friction.
- Handles failures by automatically retrying with three different methods for Google Signin:
  - [FedCM](https://developers.google.com/identity/gsi/web/guides/fedcm-migration): Works even with 3rd party cookies disabled, but needs a newer browser.
  - Popup method using the same domain: Works with most browsers, but the user might have manually disabled the popup.
  - Redirect method: Works with all browsers. does it *without leaving the apps script page*.

**On the redirect method**: If the first two methods fail (browser is too old and popups were blocked) it automatically opens a new [login](website/src/login.html) page which handles the login.
It uses the new Firebase sync mechanism `indexedDBLocalPersistence` and the `BroadcastChannel` API to communicate with the original "opener" (where the user was trying to log-in) and thus finishes the original login flow. All this is done without refreshing the Apps Script webapp.
On the Apps Script:
- Adds the missing Crypto support in `.gs`, to securely validate a firebase idToken.
- It can define a page as requiring authentication before loading, or can login on-demand after load. 
- It has new messages to request the user to log-in, or get an idToken.
  
## Demos
Shows a simple website with three pages.
- Page 1: uses method #2, follows the simplest flow, where the page loading animation stops as soon as the script page loads.
- Page 2: uses method #2 with a more complex flow where the page partially loads while the loading animation (from the parent website) continues. It then loads external libraries and the rest of the page, then stops the parent loading animation.
- Page 3: showcases method #1. Loads the GAS bridge asynchronously, with a button that calls a GAS backend API.

NOTE: The demo websites do not have a public login API key configured so the demos only show the login UI. You can try the full login features on the production website.
* **Demo Website**: [fir-apps-script.firebaseapp.com](https://fir-apps-script.firebaseapp.com/)
* **Using the "org/sig" with sample URL parameters**: [fir-apps-script.firebaseapp.com?org=xxx&sig=yyy](https://fir-apps-script.firebaseapp.com?org=XXXX&sig=YYYY)

## Production Website using this framework 
* Visit [Tutor For Me](https://tutorforme.org)
* **Optional login**: Do a demo lesson from the homepage. You can view the page without login, then use the login-on-demand feature at the time you save the page.
* **Forced login**: [Tutor For Me | My lessons](https://tutorforme.org/lessonplans)
* This website only uses method #2, but its in the process of migrating to method #1.
  
## Directory Structure

Each folder listed below also ships an `AGENTS.md` or readme with implementation notes—read them before editing so the bridge/iframe contract stays aligned.

* **`website/`**: Parent website project managing the bridge, Apps Script embedding, communication, analytics and login.
* **`website/functions/`**: Optional Firebase Cloud Functions (Node.js 22) project. `api/logs.js` proxies frontend logs into Google Cloud Logging and can be extended with more endpoints.
* **`google-apps-script/`**: Google Apps Script project (compiles separate from the parent website project).
* **`util-org-sig/`**: Crypto utility functions for the "org/sig" feature. See `util-org-sig/readme.md` for key generation and signing instructions.

## Setup & Configuration common to both projects (website and apps script)
clone, then inside `website/src` and `google-apps-script/src`, create your `.env.local` files for each `src` directory.
- `npm install` at `website/` and at `google-apps-script/`. If you change the Firebase function proxy, also run `npm install` inside `website/functions/` (Cloud Functions require Node.js 22, while Vite/dev builds work with Node.js ≥18).
- To use cloud logging for the frontend, use the firebase function in `website/functions/api/logs.js`.
- Keep shared environment variables (`URL_WEBSITE`, Firebase project IDs, and the `org/sig` public keys) aligned between both `.env` trees so the iframe/bridge validation logic matches on each side.
- For improved security set the `ALLOWED_HOST` and `URL_WEBSITE` environment variable to the same domain in both `.env` files and set `ALLOW_ANY_EMBEDDING=false` in `google-apps-script/`.

## Website project `website/`

### Key Features
* **Bridge**: Implements the mirror `google.script` API. The bridge loads a minimal GAS hidden iframe that handles the API calls (for method #1).
* **Embedding**: Embeds Apps Script web apps using visible iframes that show the GAS webapp frontend (for method #2).
* **Custom Domain**: Uses Firebase Hosting for domain management and authentication.
* **Firebase Auth** (UI, login with Google, login with email, script helpers to validate auth id tokens)
* **Dynamic Loading**: Load scripts dynamically using the `org` URL parameter.
* **Security**: Validates scripts via URL `org` and `sig` parameters using public key signature verification. See [`util-org-sig/readme.md`](util-org-sig/readme.md) for instructions to create your own public/private key pairs.
* **Centralized logging**: Sends logs from the frontend an backend to the same GCP logging.
* **Parent-Iframe Communication** for method #2:
  * login tokens (idToken)
  * URL parameter changes
  * Analytics event tracking
  * Page title updates
  * Load state notifications
* **Analytics**: Integrated Google Tag Manager (GTM).
* **Centralized Logging**: Logs iframe error events via Firebase Cloud Functions to Google Cloud Logging.
* **Backend**: Uses Firebase cloud functions under [`functions`](website/functions), it implements the `api/logs/putLogs` endpoint to send frontend logs to GCP logging. It can be easily extended to add more API endpoints.

### Setup & Configuration
- Do the common setup in the section above.
- install `clasp` in `google-apps-script/` : `npm install @google/clasp -g`
- [create or clone a GAS](https://developers.google.com/apps-script/guides/clasp#create_a_new_project) with `clasp`.
- `npm install` at `google-apps-script/`
- `npm run login`: authorizes `clasp`
- `npm run build`: builds and uploads to apps script "dev" environment.
- add your apps script production id to "pub-prod" in `package.json` in the `google-apps-script/` project
- `npm run deploy`: deploys the script to production.

### Key Files

* [`common.js`](website/src/js/common.js): Core logic
* [`index.html`](website/src/index.html): Landing page
* [`page1.html`, `page2.html`, `page3.html`](website/src/page1.html): Iframe hosts
* [`logs.js`](website/functions/api/logs.js): Server-side logging
* [`firebase.json`](website/firebase.json): Hosting config

## Google Apps Script project `google-apps-script/`

### Key Features

* **Bridge** to execute `.gs` server function (for method #1)
* **Enhanced Logging**: Captures GAS frontend an backend logs and sends to parent, to the same GCP backend projectl logs.
* **Iframe Communication**: Manages message passing for method #2 (analytics, login, events, load states).
* **Crypto support** to securely validate idToken signatures and expiration from Firebase Auth (for method #2)
* **Promise-based** calls to google.script with automatic retries:
    `await server.run('myServerFn', arg1, arg2);`
    `const loc = await server.getLocation();`
* **separate html/js/css/gs**. Contains npm scripts to bundle, push, use `.env`/`.env.local` and publish with `clasp`.

### Setup & Configuration
- Do the common setup in the section above.
- `npm install` at `website/`
- `npm run login`: authorizes Firebase
- `npm run dev`: live preview on localhost. See `ALLOW_ANY_EMBEDDING` in `google-apps-script/` so GAS can load in localhost.
- `npm run deploy`: deploys to Firebase

### Local debugging
- Run the website from localhost. This requires `ALLOW_ANY_EMBEDDING=true`. The easiest way is to publish to production allowing any embedding. To make it more robust only allow any embedding from the dev build by setting `ALLOW_ANY_EMBEDDING=true` and doing a build without publishing, thus the dev deploy in GAS will allow embedding while the production deploy will not. You can then set the script id to be the GAS development ID instead of the production ID in `.env.local`, or by generating a new org/sig pair with the utility in `util-org-sig`. This last method allows you to  generate a URL so the website loads the dev GAS instead of the default production one, giving you an easy way to run production and dev without having to constantly change and deploy the GAS or website.

### Script Properties
For Firebase auth, the script´s crypto implementation automatically downloads and updates the Firebase Certificates needed to verify signatures, and stores it in Script Properties.
- FIREBASE_CERTS_JSON: holds the cert.
- FIREBASE_CERTS_UNTIL: holds its expiration.

### Sample Pages

* **Page 1** (method #2):

  * Initialization notification
  * Custom analytics events
  * URL parameter changes without refresh
  * Login / Logout
  * GAS HTMLService is used for the UI.

* **Page 2** (method #2):

  * Progressive load notifications
  * Title updates
  * Custom analytics events
  * GAS HTMLService is used for the UI.

* **Page 3** (method #1):

  * Frontend lives in the parent as a regular frontend, which calls a `.gs` server function.
  * GAS HTMLService is **not used** for the UI.
    
### Key Files

* [`util.js`](google-apps-script/src/js/util.js): Client-side utilities
* [`util.gs`](google-apps-script/src/gs/util.gs): Server-side utilities, including the list of your public `.gs` function for method #1, in `PUBLIC_FUNCTIONS`.
* [`page1.html`, `page1.js`](google-apps-script/src/html/page1.html): Sample Page 1 (method #2)
* [`page2.html`, `page2.js`](google-apps-script/src/html/page2.html): Sample Page 2 (method #2)
* [`bridge.html`, `bridge.js`](website/src/html/page3.html): Sample Page 3 (method #1)

### Deploy Apps Script
  * Deploy as Web App (Execute: Me, Access: Anyone)
  * Use standard GCP project for centralized logs ([instructions](https://developers.google.com/apps-script/guides/cloud-platform-projects#standard)) using the same gcp project for this and the firebase project.
     
## Customization
* create and configure `.env.local` files both in website/src and google-apps-script/src base on their respective `.env` files. 
* Search for `CUSTOMIZE:` comments in the repo for key spots to extend to your needs.

## Messaging Protocol
You only need to know this protocol if you plan to modify it. The iframe and parent page communicate via `postMessage` events. The following messages are emitted by the Google Apps Script frontend and processed by `website/src/js/common.js`, letting you provide further processing if needed. When you add new events, update both `website/src/js/common.js` and `google-apps-script/src/js/util.js`/`bridge.js` so the contract stays in sync.

| Action | From → To | Description | Sample data Payload |
| ------ | --------- | -------------- | -------------- |
| `serverRequest` / `serverResponse` | parent → iframe → parent | Send and respond to a server request from the frontend (method #1 bridge) | `{ "type": "FROM_PARENT", "action": "serverRequest", "data": { "functionName": "...", "arguments": [...] }, "idRequest": "..." }` and `{ "type": "FROM_IFRAME", "action": "serverResponse", "data": { "result": ... }, "idRequest": "..." }` |
| `siteInited` | iframe → parent | Tells the parent that the iframe can be displayed, with or without stopping the progress animation | `{ "data": { "dontStopProgress": false } }` |
| `siteFullyLoaded` | iframe → parent | Used only when `siteInited` set `dontStopProgress: true`; tells the parent when to stop the progress animation |  |
| `titleChange` | iframe → parent | Change the title of the website | `{ "data": { "title": "new title" } }` |
| `logs` | iframe → parent | Send a logs batch to the parent (which then sends it to GCP logging) | `{ "data": { "logs": [ { "message": "..." } ] } }` |
| `analyticsEvent` | iframe → parent | Send an analytics event | `{ "data": { "name": "customEvent" } }` |
| `urlParamChange` | iframe → parent | Change a URL param of the main website | `{ "data": { "refresh": false, "urlParams": { "lang": "en" } } }` |
| `openUrlWithProps` | iframe → parent | Open or replace a route with specific query/path props (method #2 navigation helper) | `{ "data": { "pathname": "/lesson", "props": { "step": 2 } } }` |
| `toggleFullscreen` | iframe → parent | Ask the parent to toggle fullscreen mode for smoother demos |  |
| `getUser` / `logoutUser` | iframe → parent (reply sent via the same event name) | Coordinate Firebase login prompts and user info exchange | `{ "data": { "force": true, "addIdToken": true } }` |
| `validateDomain` | parent → iframe → parent  | Received by the iframe. If the domain is correct, it enables the iframe; otherwise it remains hidden to prevent clickjacking |  |

### Message highlights
- `validateDomain`: The parent page validates the domain after receiving `siteInited`, responding with `validateDomain`, then enabling the GAS (and keeping unknown origins hidden to prevent clickjacking).
- `serverRequest`/`serverResponse`: Wire up the method #1 bridge—exposed via the mirrored `google.script` proxy—so `.gs` functions can be invoked from the top-level website.
- `getUser`/`logoutUser`: Allow method #2 pages to show login prompts or sign out from the iframe while reusing the website’s Firebase session state.
- The rest are for controlling the iframe load lifecycle and implementing UX features for the GAS frontend in method #2.

## License

This project is released under the [MIT License](LICENSE).
