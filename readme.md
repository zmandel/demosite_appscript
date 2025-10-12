# Google Apps Script Website Integration Framework

Integrates Google Apps Script webapps into a standard website, addressing the following issues and features:

1. **Firebase auth** without limitations, including the new Google Sign-in by fedCM,with automatic popup and redirect mode fallback.
2. **A simple bundling system** for apps script, which allows for organizing files as html,js, css and bundle into inlined html files to improve performance.
3. **Custom Domain Serving**: Serves apps under a custom domain, providing more control than Google Sites.
4. **Secure domain serving**: Only allows your specific domain to embed the apps script iframes.
5. **Multi-account Compatibility**: Ensures functionality even when users are signed into multiple Google accounts.
6. **Google Workspace Compatibility**: Handles redirects typically problematic when users are under a Google Workspace account profile.
7. **Dynamic Multiple Script version Loading**: Securely loads different script versions (could be on the same or a different Google Workspace or Google Account) under the same website routes by passing parameters for different "organizations" you can create using the "org/sig" feature.
8. **Analytics Integration**: Manages Google Analytics through GTM, receiving events from embedded Apps Scripts.
9. **Smooth Transitions**: Avoids flashing screens by smoothly transitioning page loads on a MPA webapp.
10. **Responsive Design**: Ensures compatibility on both mobile and desktop devices.
11. **Logs to GCP Logging**: Sends logging events to the parent website.
12. **Change the browser header colorscheme** to match the script webapp.
13. **Fullscreen support**
14. **Easy installation and customization**: just "npm install" in both the website and apps script directories, customize .env.local files and "npm deploy". The website uses vite and the apps script uses a custom npm bundling script and "clasp" to deploy from the command-line.

**Bonus**: The project is prepared for software agents, with detailed "agents.md" files in key areas of the repository, both for the website and the apps script.

Sample Apps Script pages illustrate various interaction patterns.

## Firebase Auth
I implemented this because I couldnt find a good firebase UI that could be a) bundable (generates much smaller code) and b) handled all possible cases in the auth flow.
It can actually be used independent of apps script. Its a lit component with:
- English & Spanish translations.
- Bundling support (the official FirebaseUI can´t bundle).
- "Google" signing and "Email & Password" signin with verified email flow.
- Extends Firebase Auth with Google FedCM Signing, the newest method with the least user friction.
- Handles failures by automatically retrying with three different methods for Google Signin:
  1. FedCM
  2. Popup method
  3. Redirect method, but without leaving the page!

**On the redirect method**: If the first two methods failed, it automatically opens a new [login](website/src/login.html) page which handles the login, and uses a new Firebase sync mechanism "indexedDBLocalPersistence" and the BroadcastChannel API to communicate with the original "opener" (where user was trying to log-in) and thus finish its login flow. All this is done without ever needing to refresh the Apps Script webapp, which gets the user object and idToken automatically through secure messaging.

On the Apps Script side:
- Adds the missing Crypto support in .gs, to securely validate a firebase idToken.
- It can define a page as requiring authentication before loading, or can login on-demand after load. 

## Demos
Shows a simple website with two pages, each one being a different apps script page. "Page 1" follows the simplest flow, where the page loading animation stops as soon as the script page loads. "Page 2" shows a more complex flow where the page partially loads while the loading animation (from the parent website) continues. It then loads the rest of the page and stops the loading animation.

NOTE: The demo websites do not have a public login. You can try login features on the production website.
* **Demo Website**: [fir-apps-script.firebaseapp.com](https://fir-apps-script.firebaseapp.com/)
* **Using the "org/sig" with sample URL parameters**: [fir-apps-script.firebaseapp.com/?org=xxx&sig=yyy](https://fir-apps-script.firebaseapp.com/?org=XXXX&sig=YYYY)

## Production Website using this framework 
* Visit [Tutor For Me](https://tutorforme.org)
* To view a page with optional login: Do a demo lesson. You can view the page without login, then use the login feature while staying on the page.
* to view a page with forced login: View "My lessons"

## Directory Structure

* **`website/`**: Parent website (Firebase or other hosts) managing Apps Script embedding, communication, and analytics.
* **`google-apps-script/`**: Google Apps Script project with embedded page samples.
* **`util-org-sig/`**: Crypto utility functions for the "org/sig" feature. See `util-org-sig/readme.md` for key generation and signing instructions.

## Website Framework (`website/`)

### Key Features
* **Embedding**: Embeds Apps Script web apps using iframes ([`page1.html`](website/src/page1.html), [`page2.html`](website/src/page2.html)).
* **Custom Domain**: Uses Firebase Hosting for domain management and authentication (UI, login with Google, login with email, script helpers to validate auth id tokens)
* **Firebase Auth**
* **Dynamic Loading**: Load scripts dynamically using the `org` URL parameter.
* **Security**: Validates scripts via URL `org` and `sig` parameters using public key signature verification. See [`util-org-sig/readme.md`](util-org-sig/readme.md) for instructions to create your own public/private key pairs.

* **Parent-Iframe Communication**:

  * login tokens (idToken)
  * URL parameter changes
  * Analytics event tracking
  * Centralized logging
  * Page title updates
  * Load state notifications
* **Analytics**: Integrated Google Tag Manager (GTM).
* **Centralized Logging**: Logs iframe error events via Firebase Cloud Functions to Google Cloud Logging.
* **Backend**: Uses Firebase cloud functions under [`functions`](website/functions), it implements the "api/logs/putLogs" endpoint to send frontend logs to GCP logging. It can be easily extended to add more API endpoints.

### Setup & Configuration
clone, then inside website/src and google-apps-script/src, create and fill your .env.local file based on .env.
- install "clasp" in google-apps-script/ : npm install @google/clasp -g
- [create or clone a GAS](https://developers.google.com/apps-script/guides/clasp#create_a_new_project) with clasp.
- "npm install" at website/ and at google-apps-script/

To use cloud logging for the frontend, use the firebase function in website/functions/api/logs.js. For improved security set the `ALLOWED_HOST` environment variable to the same domain.

### Key Files

* [`common.js`](website/src/js/common.js): Core logic
* [`index.html`](website/src/index.html): Landing page
* [`page1.html`, `page2.html`](website/src/page1.html): Iframe hosts
* [`logs.js`](website/functions/api/logs.js): Server-side logging
* [`firebase.json`](website/firebase.json): Hosting config

## Google Apps Script folder (`google-apps-script/`)

### Key Features

* **Enhanced Logging**: Captures frontend logs and sends to parent.
* **Iframe Communication**: Manages message passing (analytics, events, load states).
* **Logging**: logs server-side events.
* **Crypto support** to securely validate idToken signatures and expiration from Firebase Auth.

Supports separate html/js/css/gs. Contains npm scripts to bundle, push and publish (with "clasp") the script.

### Script Properties
The script´s crypto implementation automatically downloads and updates the Firebase Certificates needed to verify signatures, and stores it in Script Properties.
- FIREBASE_CERTS_JSON: holds the cert.
- FIREBASE_CERTS_UNTIL: holds its expiration.

### Sample Pages

* **Page 1**:

  * Initialization notification
  * Custom analytics events
  * URL parameter changes without refresh
  * Login / Logout

* **Page 2**:

  * Progressive load notifications
  * Title updates
  * Custom analytics events

### Key Files

* [`util.js`](google-apps-script/src/js/util.js): Client-side utilities
* [`util.gs`](google-apps-script/src/gs/util.gs): Server-side utilities
* [`page1.html`, `page1.js`](google-apps-script/src/html/page1.html): Sample Page 1
* [`page2.html`, `page2.js`](google-apps-script/src/html/page2.html): Sample Page 2

## Deploy Apps Script:
  * Deploy as Web App (Execute: Me, Access: Anyone)
  * Use standard GCP project for centralized logs ([instructions](https://developers.google.com/apps-script/guides/cloud-platform-projects#standard)) using the same gcp project for this and the firebase project.
     
## Customization
* create and configure .env.local files both in website/src and google-apps-script/src base on their respective .env files. 
* Search for `CUSTOMIZE:` comments in the repo for key spots you would want to extend to your needs.

## Messaging Protocol

The iframe and parent page communicate via `postMessage` events. The following
messages are emitted by the Google Apps Script frontend and processed by
`website/src/js/common.js` unless otherwise noted.

| Action | From → To | Description | Sample Payload |
| ------ | --------- | -------------- | -------------- |
| `siteInited` | iframe → parent | Tells the parent that the iframe can be displayed, with or without stopping the progress animation | `{ "type": "FROM_IFRAME", "action": "siteInited", "data": { "dontStopProgress": false } }` |
| `siteFullyLoaded` | iframe → parent | used only when siteInited was sent with dontStopProgress:true. It tells the parent to stop the progress animation | `{ "type": "FROM_IFRAME", "action": "siteFullyLoaded" }` |
| `titleChange` | iframe → parent | change the title of the website | `{ "type": "FROM_IFRAME", "action": "titleChange", "data": { "title": "new title" } }` |
| `logs` | iframe → parent | send a logs batch to the parent (which then sends it to GCP logging) | `{ "type": "FROM_IFRAME", "action": "logs", "data": { "logs": [ { "message": "..." } ] } }` |
| `analyticsEvent` | iframe → parent | send an analytics event | `{ "type": "FROM_IFRAME", "action": "analyticsEvent", "data": { "name": "customEvent" } }` |
| `urlParamChange` | iframe → parent | change a url param of the main website | `{ "type": "FROM_IFRAME", "action": "urlParamChange", "data": { "refresh": false, "urlParams": { "lang": "en" } } }` |
| `validateDomain` | parent → iframe | received by the iframe. If the domain is correct, it enables the iframe, otherwise it remains hidden to prevent clickjacking | `{ "type": "validateDomain" }` |

The parent page validates the domain of the embedding site using the
`validateDomain` message. After receiving `siteInited`, the parent responds with
`validateDomain` so the iframe can reveal its content. Other messages notify the
parent about analytics events, logging data, page title changes and URL
parameter updates.

## License

This project is released under the [MIT License](LICENSE).
