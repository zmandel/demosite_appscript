# Google Apps Script Website Integration Framework 

This framework integrates Google Apps Script web apps into a standard website, addressing the following issues which currently no other solution can solve all at the same time:

1. **Custom Domain Serving**: Serves apps under a custom domain, providing more control than Google Sites.
2. **Multi-account Compatibility**: Ensures functionality even when users are signed into multiple Google accounts.
3. **Google Workspace Compatibility**: Handles redirects typically problematic when users are under a Google Workspace account profile.
4. **Smooth Transitions**: Avoids flashing screens by smoothly transitioning page loads on a MPA webapp.
5. **Dynamic Multiple Script version Loading**: Securely loads different script versions by passing authorized parameters (`org`and `sig` parameters).
6. **Analytics Integration**: Manages Google Analytics through GTM, receiving events from embedded Apps Scripts.
7. **Responsive Design**: Ensures compatibility on both mobile and desktop devices.
8. **Logs to GCP Logging**: Sends logging events to the parent website.

Sample Apps Script pages illustrate various interaction patterns.

## Demo Websites

* **Regular Website**: [fir-apps-script.firebaseapp.com](https://fir-apps-script.firebaseapp.com/)
* **Modified by different "org"**: [Custom Org URL](https://fir-apps-script.firebaseapp.com/?org=AKfycbyJVIXQETRfIbzEC6OALffWAO533GAMJunm2Trc_8KlPR-YI4MPxWZbypvZ83Eqg9kw&sig=JrqbfLZmsf8WlWz5outYUryPRoiINocCTKErUb79Ww8fKcLKYZO4jOyjCWR9h0HbTwsFQn4Wnuu-auBwRBFYNw)

## Production-level Website

To view Apps Script pages:

* Visit [Tutor For Me](https://tutorforme.org)
* Follow instructions after submitting the form on the homepage.

## Directory Structure

* **`website/`**: Parent website (Firebase or other hosts) managing Apps Script embedding, communication, and analytics.
* **`google-apps-script/`**: Google Apps Script project with embedded page samples.

## Website Framework (`website/`)

### Key Features

* **Embedding**: Embeds Apps Script web apps using iframes ([`page1.html`](website/public/page1.html), [`page2.html`](website/public/page2.html)).
* **Custom Domain**: Uses Firebase Hosting for domain management.
* **Dynamic Loading**: Load scripts dynamically using `org` URL parameter.
* **Security**: Validates scripts via URL `org` and `sig` parameter using public key signature verification. See [`util-org-sig/crypto.js`](util-org-sig/crypto.js) for instructions to create your own public/private key pairs to sign your various script deployment ids.

* **Parent-Iframe Communication**:

  * URL parameter changes
  * Analytics event tracking
  * Centralized logging
  * Page title updates
  * Load state notifications
* **Analytics**: Integrated Google Tag Manager (GTM).
* **Centralized Logging**: Logs iframe error events via Firebase Cloud Functions to Google Cloud Logging.
* **Backend**: Uses Firebase cloud functions under [`functions`](website/functions) which implements the "api/logs/putLogs" endpoint to send frontend logs to GCP logging. It can be easily extended to add more API endppoints.
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

  
Use the github subdirectory or copy from https://docs.google.com/spreadsheets/d/1TRgGo93TzPihDpCXb7G3_eI6uc0jsQLJch0cgE1aHKs/copy

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
   * Use standard GCP project for centralized logs ([instructions](https://developers.google.com/apps-script/guides/cloud-platform-projects#standard))

3. **Configuration**:

   * Update `g_orgDefault` and keys in [`common.js`](website/public/js/common.js).

## Customization

* Review `REVIEW:` comments in key files (`common.js`, `front-util.html`) to customize as needed.
