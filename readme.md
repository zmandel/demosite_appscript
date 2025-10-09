# Google Apps Script Website Integration Framework

Integrates Google Apps Script webapps into a standard website, addressing the following issues and features:

1. **Custom Domain Serving**: Serves apps under a custom domain, providing more control than Google Sites.
2. **Secure domain serving**: Only allows your specific domain to embed the apps script iframes.
3. **Multi-account Compatibility**: Ensures functionality even when users are signed into multiple Google accounts.
4. **Google Workspace Compatibility**: Handles redirects typically problematic when users are under a Google Workspace account profile.
5. **Smooth Transitions**: Avoids flashing screens by smoothly transitioning page loads on a MPA webapp.
6. **Dynamic Multiple Script version Loading**: Securely loads different script versions (could be on the same or a different Google Workspace or Google Account) under the same website routes by passing parameters for different "organizations" you can create using the "org/sig" feature.
7. **Analytics Integration**: Manages Google Analytics through GTM, receiving events from embedded Apps Scripts.
8. **Responsive Design**: Ensures compatibility on both mobile and desktop devices.
9. **Logs to GCP Logging**: Sends logging events to the parent website.
10. **Change the browser header colorscheme** to match the script webapp.
11. **Fullscreen support**
12. **Firebase auth** without limitations, including the new Google Signing, popup and redirect mode.
13. **A simple bundling system** for apps script, which allows for organizing files as html,js, css and bundle into inlined html files to improve performance.
14. **Easy installation and customization**: just "npm install" in both for the website and apps script directories, customize .env files and "npm deploy". The website uses vite and the apps script uses a custom npm bundling script and "clasp" to deploy from the command-line.

**Bonus**: The project is prepared for software agents, with detailed "agents.md" files in key areas of the repository, both for the website and the apps script.

Sample Apps Script pages illustrate various interaction patterns.

## Firebase Auth
The auth implementation can actually be used independent of apps script. Its a lit component in English & Spanish with bundling support (thus much smaller than the official FirebaseUI).
An Apps Script can define a page as requiring authentication before loading, or can login on-demand after load. The framework handles all the UI, signin methods, Firebase connections, popups, redirects etc without needing to reload the Apps Script.
It also adds the missing Crypto support in .gs, to validate the firebase idTokens.

## Demos
Shows a simple website with two pages, each one being a different apps script page. "Page 1" follows the simplest flow, where the page loading animation stops as soon as the script page loads. "Page 2" shows a more complex flow where the page partially loads while the loading animation (from the parent website) continues. It then loads the rest of the page and stops the loading animation.

NOTE: The demo websites do not have a public login. You can try login features on the production website.
* **Demo Website**: [fir-apps-script.firebaseapp.com](https://fir-apps-script.firebaseapp.com/)
* **Using the "org/sig" with sample URL parameters**: [fir-apps-script.firebaseapp.com/?org=xxx&sig=yyy](https://fir-apps-script.firebaseapp.com/?org=XXXX&sig=YYYY)

## Production Website using this framework

* Visit [Tutor For Me](https://tutorforme.org)
* To view a page with optional login: Do a demo lesson
* to view a page with forced login: View "My lessons"

## Directory Structure

* **`website/`**: Parent website (Firebase or other hosts) managing Apps Script embedding, communication, and analytics.
* **`google-apps-script/`**: Google Apps Script project with embedded page samples.
* **`util-org-sig/`**: Crypto utility functions for the "org/sig" feature. See `util-org-sig/readme.md` for key generation and signing instructions.

## Website Framework (`website/`)

### Key Features
* **Embedding**: Embeds Apps Script web apps using iframes ([`page1.html`](website/src/page1.html), [`page2.html`](website/src/page2.html)).
* **Custom Domain**: Uses Firebase Hosting for domain management and authentication (UI, login with Google, login with email, script helpers to validate auth id tokens)
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
* **Server-side Routing and Logging**: Routes requests and logs server-side events.
* **Crypto support** to securely validate idToken signatures and expiration.

Contains npm scripts to bundle, push and publish the script.

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
