# Google Apps Script Website Integration Framework

Develop, debug and publish Google Apps Script webapps as a regular website without any frontend restrictions.
The framework provides two methods to load your GAS pages allowing to use one method for some pages and the other for the rest.
Provides "agents.md" files to facilitate your use of AI coding agents.
Sample, live Apps Script pages illustrate various interaction patterns.

## Method 1️⃣: Use a regular frontend
Completely liberates you from all GAS webapp limitations but it does not support [GAS HTML Templates](https://developers.google.com/apps-script/guides/html/templates).
1. Runs the frontend in the top window, outside of the GAS webapp iframe.
2. Provides a mirror `google.script` API as a transparent bridge for invoking .gs server-side functions.
3. Develop, debug an publish the frontend using any tooling, frameworks, libraries or languages (React, Vue, Typescript, Vite, live reloading, etc.)
4. Use all the browser functionalities without restrictions imposed by the GAS iframe like localStorage, notifications, credential APIS, serviceWorker, direct URL access, etc.
5. Build as SPA, MPA or PWA.

## Method 2️⃣: Load GAS as an iframe.
Runs any exiting GAS webapp inside an iframe while providing helpers to behave more like a regular frontend webapp.
This was the original functionality of this framework and can still be useful if you rely heavily on [GAS HTML Templates](https://developers.google.com/apps-script/guides/html/templates).
Useful to run an MPA, each page using a different GAS frontend HTMLService.

It provides functionality to workarround limitations of a GAS frontend (inside an iframe):
1. **Custom Domain Serving**: Serves apps under a custom domain, providing more control than Google Sites.
2. **Secure domain serving**: Only allows your specific domain to embed the apps script iframes.
3. **Analytics Integration**: Manages Google Analytics through GTM, receiving events from embedded Apps Scripts.
4. **Smooth Transitions**: Avoids flashing screens by smoothly transitioning page loads on a MPA webapp.
5. **Responsive Design**: Ensures compatibility on both mobile and desktop devices.
6. **Change the browser header colorscheme** to match the script webapp.
7. **Fullscreen support**

## Additional functionality for both methods 1 & 2:
1. **Multi-account Compatibility**: Ensures functionality even when users are signed into multiple Google accounts.
2. **Google Workspace Compatibility**: Handles redirects typically problematic when users are under a Google Workspace account profile.
3. **Dynamic Multiple Script version Loading**: Securely loads different script versions (could be on the same or a different Google Workspace or Google Account) under the same website routes by passing parameters for different "organizations" you can create with the "org/sig" feature.
4. **Firebase auth** including the new Google Sign-in by fedCM with automatic popup and redirect mode fallback without reloading the current page.
5. **Promise-based calls to google.script.** with automatic retries for common communication errors to the server.
6. **Bundling system** for apps script:
    - organize files as html, js, css, gs.
    - use .env / .envlocal variables shared in .js and .gs files to better organize and share variables without hardcoded values.
    - For method #2: bundle into inlined html files to improve performance and comply with the apps script format.
7. **Logs to GCP Logging**: Sends logging events to the parent website, which sends the frontend logs to GCP (same place where the .gs logs go.)
8. **Easy installation and customization**: just "npm install" in both the website and apps script directories, customize .env.local files and "npm deploy". The website uses vite and the apps script uses a custom npm bundling script and "clasp" to deploy from the command-line.

## Firebase Auth
Can be used with both hosting methods.
I implemented this because I couldnt find a good firebase UI that could be a) bundable (generates much smaller code) and b) handled all possible cases in the auth flow.
It can actually be used independent of apps script. Its a lit component with:
- English & Spanish translations.
- Bundling support (the official FirebaseUI can´t bundle).
- "Google" signin and "Email & Password" signin, including the "verify email flow".
- Extends Firebase Auth with Google FedCM Signing, the newest method with the least user friction.
- Handles failures by automatically retrying with three different methods for Google Signin:
  - [FedCM](https://developers.google.com/identity/gsi/web/guides/fedcm-migration): Works even with 3rd party cookies disabled, but needs a newer browser.
  - Popup method using the same domain: Works with most browsers, but the user might have manually disabled the popup.
  - Redirect method: Works with all browsers. does it *without leaving the apps script page*.

**On the redirect method**: If the first two methods fail (browser is too old and popups were blocked) it automatically opens a new [login](website/src/login.html) page which handles the login.
It uses the new Firebase sync mechanism "indexedDBLocalPersistence" and the BroadcastChannel API to communicate with the original "opener" (where the user was trying to log-in) and thus finishes the original login flow. All this is done without refreshing the Apps Script webapp.
On the Apps Script:
- Adds the missing Crypto support in .gs, to securely validate a firebase idToken.
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
* Optional login: Do a demo lesson from the homepage. You can view the page without login, then use the login-on-demand feature at the time you save the page.
* Forced login: [Tutor For Me | My lessons](https://tutorforme.org/lessonplans)

## Directory Structure

* **`website/`**: Parent website project managing the bridge, Apps Script embedding, communication, analytics and login.
* **`google-apps-script/`**: Google Apps Script project (compiles separate from the parent website project).
* **`util-org-sig/`**: Crypto utility functions for the "org/sig" feature. See `util-org-sig/readme.md` for key generation and signing instructions.

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
* **Backend**: Uses Firebase cloud functions under [`functions`](website/functions), it implements the "api/logs/putLogs" endpoint to send frontend logs to GCP logging. It can be easily extended to add more API endpoints.

### Setup & Configuration
clone, then inside `website/src` and `google-apps-script/src`, create your .env.local files for each `src` directory.
- install "clasp" in `google-apps-script/` : `npm install @google/clasp -g`
- [create or clone a GAS](https://developers.google.com/apps-script/guides/clasp#create_a_new_project) with clasp.
- `npm install` at `website/` and at `google-apps-script/`
- on apps script:
  - `npm run login`: authorizes "clasp"
  - `npm run build`: builds and uploads to apps script "dev" environment.
  - add your apps script production id to "pub-prod" in `package.json` in the `google-apps-script/` project
  - `npm run deploy`: deploys the script to production.
- on the website:
  - `npm run login`: authorizes Firebase
  - `npm run dev`: live preview on localhost.
  - `npm run deploy`: deploys to Firebase
    
To use cloud logging for the frontend, use the firebase function in `website/functions/api/logs.js`. For improved security set the `ALLOWED_HOST` environment variable to the same domain in both `.env` files.

### Key Files

* [`common.js`](website/src/js/common.js): Core logic
* [`index.html`](website/src/index.html): Landing page
* [`page1.html`, `page2.html`, `page3.html`](website/src/page1.html): Iframe hosts
* [`logs.js`](website/functions/api/logs.js): Server-side logging
* [`firebase.json`](website/firebase.json): Hosting config

## Google Apps Script project `google-apps-script/`

### Key Features

* **Bridge** to execute .gs server function (for method #1)
* **Enhanced Logging**: Captures GAS frontend an backend logs and sends to parent, to the same GCP backend projectl logs.
* **Iframe Communication**: Manages message passing for method #2 (analytics, login, events, load states).
* **Crypto support** to securely validate idToken signatures and expiration from Firebase Auth (for method #2)
* **Promise-based** calls to google.script with automatic retries:
    `await server.run('myServerFn', arg1, arg2);`
    `const loc = await server.getLocation();`
* **separate html/js/css/gs**. Contains npm scripts to bundle, push, use `.env`/`.envLocal` and publish with "clasp".

### Script Properties
The script´s crypto implementation automatically downloads and updates the Firebase Certificates needed to verify signatures, and stores it in Script Properties.
- FIREBASE_CERTS_JSON: holds the cert.
- FIREBASE_CERTS_UNTIL: holds its expiration.

### Sample Pages

* **Page 1** (method #2):

  * Initialization notification
  * Custom analytics events
  * URL parameter changes without refresh
  * Login / Logout

* **Page 2** (method #2):

  * Progressive load notifications
  * Title updates
  * Custom analytics events

* **Page 3** (method #1):

  * Frontend lives in the parent, as a regular frontend, which calls a .gs server function.
    
### Key Files

* [`util.js`](google-apps-script/src/js/util.js): Client-side utilities
* [`util.gs`](google-apps-script/src/gs/util.gs): Server-side utilities, including the list of your public .gs function for method #1, in `PUBLIC_FUNCTIONS`.
* [`page1.html`, `page1.js`](google-apps-script/src/html/page1.html): Sample Page 1 (method #2)
* [`page2.html`, `page2.js`](google-apps-script/src/html/page2.html): Sample Page 2 (method #2)
* [`bridge.html`, `bridge.js`](website/src/html/page3.html): Sample Page 3 (method #1)

## Deploy Apps Script:
  * Deploy as Web App (Execute: Me, Access: Anyone)
  * Use standard GCP project for centralized logs ([instructions](https://developers.google.com/apps-script/guides/cloud-platform-projects#standard)) using the same gcp project for this and the firebase project.
     
## Customization
* create and configure .env.local files both in website/src and google-apps-script/src base on their respective .env files. 
* Search for `CUSTOMIZE:` comments in the repo for key spots to extend to your needs.

## Messaging Protocol

The iframe and parent page communicate via `postMessage` events. The following
messages are emitted by the Google Apps Script frontend and processed by
`website/src/js/common.js`, letting you provide futher processing if needed.

| Action | From → To | Description | Sample data Payload |
| ------ | --------- | -------------- | -------------- |
| `serverRequest` `serverResponse` | → parent → iframe → parent | Send and Respond to a server request from the frontend (method #1) | `{"data": { "response": response } or error: error }` |
| `siteInited` | iframe → parent | Tells the parent that the iframe can be displayed, with or without stopping the progress animation | `{"data": { "dontStopProgress": false } }` |
| `siteFullyLoaded` | iframe → parent | used only when siteInited was sent with dontStopProgress:true. It tells the parent to stop the progress animation |  |
| `titleChange` | iframe → parent | change the title of the website | `{"data": { "title": "new title" } }` |
| `logs` | iframe → parent | send a logs batch to the parent (which then sends it to GCP logging) | `{"data": { "logs": [ { "message": "..." } ] } }` |
| `analyticsEvent` | iframe → parent | send an analytics event | `"data": { "name": "customEvent" } }` |
| `urlParamChange` | iframe → parent | change a url param of the main website | `{data": { "refresh": false, "urlParams": { "lang": "en" } } }` |
| `validateDomain` | parent → iframe → parent  | received by the iframe. If the domain is correct, it enables the iframe, otherwise it remains hidden to prevent clickjacking | |

### Messaes highlight
- `validateDomain`: The parent page validates the domain after receiving `siteInited`, responding with `validateDomain`, then enabling the GAS.
- `serverResponse`: Responds to the backend API call requests.
- The other messages are for controlling the iframe load and implementing features for the GAS frontend in method #2.

## License

This project is released under the [MIT License](LICENSE).
