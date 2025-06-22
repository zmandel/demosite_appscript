# Google Apps Script Website Integration Framework

Integrates Google Apps Script webapps into a standard website, addressing the following issues:

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

**Bonus**: The project is prepared for (and partially built by) software agents, with detailed "agents.md" files in key areas of the repository.

Sample Apps Script pages illustrate various interaction patterns.

## Demos
Shows a simple website with two pages, each one being a different apps script page. "Page 1" follows the simplest flow, where the page loading animation stops as soon as the script page loads. "Page 2" shows a more complex flow where the page partially loads while the loading animation (from the parent website) continues. It then loads the rest of the page and stops the loading animation.

* **Demo Website**: [fir-apps-script.firebaseapp.com](https://fir-apps-script.firebaseapp.com/)
* **Using the "org/sig" feature, modified by URL parameters**: [fir-apps-script.firebaseapp.com/?org=xxx&sig=yyy](https://fir-apps-script.firebaseapp.com/?org=AKfycbyJVIXQETRfIbzEC6OALffWAO533GAMJunm2Trc_8KlPR-YI4MPxWZbypvZ83Eqg9kw&sig=JrqbfLZmsf8WlWz5outYUryPRoiINocCTKErUb79Ww8fKcLKYZO4jOyjCWR9h0HbTwsFQn4Wnuu-auBwRBFYNw)

## Production Website using this framework

* Visit [Tutor For Me](https://tutorforme.org)
* Follow instructions after submitting the form on the homepage. You will then be given access to the website sections that use two apps script webapps.

## Directory Structure

* **`website/`**: Parent website (Firebase or other hosts) managing Apps Script embedding, communication, and analytics.
* **`google-apps-script/`**: Google Apps Script project with embedded page samples.
* **`util-org-sig/`**: Crypto utility functions for the "org/sig" feature. See `util-org-sig/readme.md` for key generation and signing instructions.

## tl;dr
Copy repo. Search for `CUSTOMIZE:` comments to modify with your data. then deploy.

## Website Framework (`website/`)

### Key Features

* **Embedding**: Embeds Apps Script web apps using iframes ([`page1.html`](website/public/page1.html), [`page2.html`](website/public/page2.html)).
* **Custom Domain**: Uses Firebase Hosting for domain management.
* **Dynamic Loading**: Load scripts dynamically using `org` URL parameter.
* **Security**: Validates scripts via URL `org` and `sig` parameters using public key signature verification. See [`util-org-sig/readme.md`](util-org-sig/readme.md) for instructions to create your own public/private key pairs to sign your various script deployment ids.

* **Parent-Iframe Communication**:

  * URL parameter changes
  * Analytics event tracking
  * Centralized logging
  * Page title updates
  * Load state notifications
* **Analytics**: Integrated Google Tag Manager (GTM).
* **Centralized Logging**: Logs iframe error events via Firebase Cloud Functions to Google Cloud Logging.
* **Backend**: Uses Firebase cloud functions under [`functions`](website/functions) which implements the "api/logs/putLogs" endpoint to send frontend logs to GCP logging. It can be easily extended to add more API endpoints.

### Setup & Configuration

Update placeholders in [`common.js`](website/public/js/common.js):

* Default deployment ID (`g_orgDefault`)
* Logs endpoint (`g_endpointPutLogs`)
* Public key (`g_publicKeyJwk`)
* GTM ID (`g_idGTM`)
* URL parameter sanitization (`g_paramsClean`)
* GTM dimensions (`g_dimensionsGTM`)

Update domain settings (`g_host`) in [`logs.js`](website/functions/api/logs.js).
Set the `ALLOWED_HOST` environment variable to the same domain when deploying functions so requests can be validated.

### Key Files

* [`common.js`](website/public/js/common.js): Core logic
* [`index.html`](website/public/index.html): Landing page
* [`page1.html`, `page2.html`](website/public/page1.html): Iframe hosts
* [`logs.js`](website/functions/api/logs.js): Server-side logging
* [`firebase.json`](website/firebase.json): Hosting config

## Google Apps Script Samples (`google-apps-script/`)

### Key Features

* **Enhanced Logging**: Captures frontend logs and sends to parent.
* **Iframe Communication**: Manages message passing (analytics, events, load states).
* **Server-side Routing and Logging**: Routes requests and logs server-side events.

Use the github subdirectory or copy from <https://docs.google.com/spreadsheets/d/1TRgGo93TzPihDpCXb7G3_eI6uc0jsQLJch0cgE1aHKs/copy>

### Sample Pages

* **Page 1**:

  * Initialization notification
  * Custom analytics events
  * URL parameter changes without refresh

* **Page 2**:

  * Complex resource loading (Three.js, GSAP)
  * Progressive load notifications
  * Title updates
  * Custom analytics events

### Key Files

* [`front-util.html`](google-apps-script/front-util.html): Client-side utilities
* [`back-util.gs`](google-apps-script/back-util.gs): Server-side utilities
* [`html-page1.html`, `front-page1.html`](google-apps-script/html-page1.html): Sample Page 1
* [`html-page2.html`, `front-page2.html`](google-apps-script/html-page2.html): Sample Page 2

## Getting Started

1. **Deploy Website**:

   ```sh
   cd website
   cd functions && npm install && cd ..
   firebase deploy --only hosting
   firebase deploy --only functions
   ```

   Cloud Functions require Node **22**, as specified in `functions/package.json`.

2. **Deploy Apps Script**:

   * Deploy as Web App (Execute: Me, Access: Anyone)
   * Use standard GCP project for centralized logs ([instructions](https://developers.google.com/apps-script/guides/cloud-platform-projects#standard)) using the same gcp project for this and the firebase project.

3. **Configuration**:

   * Update `g_orgDefault` and keys in [`common.js`](website/public/js/common.js).

## Customization

* Search for `CUSTOMIZE:` comments to customize as needed.

## Messaging Protocol

The iframe and parent page communicate via `postMessage` events. The following
messages are emitted by the Google Apps Script frontend and processed by
`website/public/js/common.js` unless otherwise noted.

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
