# Google Apps Script Website Integration Framework

Framework for integrating Google Apps Script web apps into a standard website, solving the following issues:
1. Allows to be served under a custom domain (similar to Google Sites, but with much greater control).
2. Webapp works when the user is signed into multiple accounts (existing solutions for this can bypass this issue, but not together with the next point).
3. Webapp works when the user is on a google workspace account (which normally causes a redirect that breaks the webapp).
4. Smooth page transitions as scripts load, avoiding flashing white screens.
5. The same website page can load different versions of the script, or different scripts entirely by passing "organization" and "signature" parameters allowing only authorized scripts to load in a highly secure way.
6. It loads and handles Google Analytics using GTM from the website, which receives events from the apps scripts.
7. Works well on Mobile and Desktop.

It also includes sample Apps Script pages showcasing different interaction patterns with this framework.

## Demo minimal website
regular website: https://fir-apps-script.firebaseapp.com/
website modified by a different "org": https://fir-apps-script.firebaseapp.com/?org=AKfycbyJVIXQETRfIbzEC6OALffWAO533GAMJunm2Trc_8KlPR-YI4MPxWZbypvZ83Eqg9kw&sig=JrqbfLZmsf8WlWz5outYUryPRoiINocCTKErUb79Ww8fKcLKYZO4jOyjCWR9h0HbTwsFQn4Wnuu-auBwRBFYNw

## A production-level website using the framework
To view the apps script related pages you need to fill the form in the main page, and then follow the instructions from there:
https://tutorforme.org

## Directory Structure

-   **`website/`**: Contains the Firebase-hosted website that acts as the parent container for the Apps Script iframes. It includes the core framework logic for embedding, communication, and analytics. This website can be published on any host, not just firebase hosting.
-   **`google apps script/`**: Contains the Google Apps Script project with sample web app pages (Page 1 and Page 2) that are designed to be embedded into the website.

## Website Framework (`website/`)

The `website/` directory implements the framework to embed and route Google Apps Script web apps.

### Key Features

*   **Embedding Apps Script Web Apps**: Seamlessly embeds Apps Script web apps using iframes ([`public/page1.html`](website/public/page1.html), [`public/page2.html`](website/public/page2.html)).
*   **Custom Domain Support**: Leverages Firebase Hosting to serve the Apps Script content under your own domain.
*   **Dynamic Script Loading**: Allows loading different Apps Script deployments by specifying an `org` parameter in the URL. The default script is defined by `g_orgDefault` in [`public/js/common.js`](website/public/js/common.js) which is just your apps script deployment id.
*   **Signature Verification**: For security, when a custom `org` (Apps Script deployment ID) is provided via URL parameters, its signature (`sig` parameter) is verified against a public key ([`g_publicKeyJwk`](website/public/js/common.js) and [`verifyScript`](website/public/js/common.js) function in [`public/js/common.js`](website/public/js/common.js)).
*   **Parent-Iframe Communication**: A robust message-passing system (see `window.addEventListener("message", ...)` in [`public/js/common.js`](website/public/js/common.js)) enables:
    *   **URL Parameter Changes**: The iframe can request the parent page to update its URL parameters, with or without a page refresh (action: `urlParamChange`).
    *   **Analytics Events**: The iframe can send analytics events to the parent, which can then be processed by GTM (action: `analyticsEvent`).
    *   **Logging**: The iframe can send log messages to the parent, which are then forwarded to a server-side logging endpoint (action: `logs`, handled by [`functions/api/logs.js`](website/functions/api/logs.js)).
    *   **Page Title Changes**: The iframe can request the parent page to change its title (action: `titleChange`).
    *   **Load State Notifications**: The iframe notifies the parent about its initialization (`siteInited`) and full load (`siteFullyLoaded`) states.
*   **Google Tag Manager (GTM) Integration**: Supports GTM for analytics with optional custom dimensions.
*   **Centralized Error Logging**: Logs from the iframe can be sent to a Firebase Cloud Function ([`functions/api/logs.js`](website/functions/api/logs.js)) for centralized storage and analysis (e.g., in Google Cloud Logging). The sample firebase cloud function logs received batch logs into Google Cloud Logging. From there you can further add rules to alert you by email, Google Chat etc. Note that because the backend apps script can also send its logs to GCP, this provides a way to get a single place for frontend and backend logs.
*   **Loading Indicators**: Provides user feedback while the iframe content is loading.

### Setup & Configuration

*   Review and update placeholder values and "REVIEW" comments in [`public/js/common.js`](website/public/js/common.js), particularly for:
    *   `g_orgDefault`: Your default Apps Script deployment ID.
    *   `g_endpointPutLogs`: Your server endpoint for logs.
    *   `g_publicKeyJwk`: Your public key for signature verification.
    *   `g_idGTM`: Your Google Tag Manager ID.
    *   `g_paramsClean`: Allowed URL parameters.
    *   `g_dimensionsGTM`: Custom GTM dimensions.
*   Set your website's domain in `g_host` within [`functions/api/logs.js`](website/functions/api/logs.js).

### Key Files

*   [`public/js/common.js`](website/public/js/common.js): Core client-side logic for the framework.
*   [`public/index.html`](website/public/index.html): Landing page to navigate to the sample pages.
*   [`public/page1.html`](website/public/page1.html), [`public/page2.html`](website/public/page2.html): Host pages for the iframes.
*   [`functions/api/logs.js`](website/functions/api/logs.js): Firebase Function for receiving logs from the client.
*   [`firebase.json`](website/firebase.json): Firebase hosting and functions configuration.

## Google Apps Script Samples (`google apps script/`)

The `google apps script/` emonstrate how an Apps Script web app can interact with the parent website framework.

### Key Features

*   **Client-side Utilities (`front-util.html`)**:
    *   **Enhanced Logging**: Overrides `console.*` methods, `window.onerror`, and `unhandledrejection` to capture logs with call stacks. These logs are queued and sent to the parent website via `postSiteMessage`.
    *   **Communication with Parent Website**: Provides functions like `postSiteMessage` to send various types of messages (logs, analytics, custom events, load status) to the hosting website. `analytics(eventName)` is a helper for sending analytics.
    *   **Initialization**: `initializeSession` determines if the script is running in an iframe and `postSiteInited` notifies the parent when the Apps Script page is initially ready.
*   **Server-side Utilities (`back-util.gs`)**:
    *   **Routing**: A simple `doGet(e)` function routes requests to `html-page1.html` or `html-page2.html` based on the `page` URL parameter.
    *   **Templating**: The `include_(filename)` function allows embedding content from other HTML files within the main HTML templates (e.g., including `front-util.html`).
    *   **Structured Logging**: Provides `error_`, `warn_`, and `log_` functions for server-side structured logging to Google Cloud Logging, including call stack information.

### Sample Pages

*   **Page 1 (`html-page1.html`, `front-page1.html`)**:
    *   Demonstrates basic initialization by calling `postSiteInited()` after the DOM is loaded.
    *   Shows how to send a custom analytics event (`analytics("customEvent1")`) upon a button click.
    *   Illustrates how to request the parent website to change a URL parameter (`lang`) without a full page refresh using `postSiteMessage("urlParamChange", ...)`.
*   **Page 2 (`html-page2.html`, `front-page2.html`)**:
    *   Showcases a more complex loading scenario involving external libraries (Three.js, GSAP) and a simulated backend call.
    *   Uses a two-stage loading notification:
        1.  `postSiteInited({ dontStopProgress: true })` is called early to let the parent know the iframe is initialized but still loading resources.
        2.  `postSiteMessage("siteFullyLoaded")` is called after all asynchronous operations complete, signaling the parent to hide any extended loading indicators.
    *   Integrates with Three.js and GSAP to render a simple 3D animated scene.
    *   Demonstrates changing the parent website's page title via `postSiteMessage("titleChange", ...)`.
    *   Sends another custom analytics event (`analytics("customEvent2")`).

### Key Files

*   [`front-util.html`](google%20apps%20script/front-util.html): Common client-side JavaScript utilities for all Apps Script frontend pages.
*   [`back-util.gs`](google%20apps%20script/back-util.gs): Common server-side Google Apps Script utilities, including routing and logging.
*   [`html-page1.html`](google%20apps%20script/html-page1.html) & [`front-page1.html`](google%20apps%20script/front-page1.html): HTML and client-side script for Sample Page 1.
*   [`html-page2.html`](google%20apps%20script/html-page2.html) & [`front-page2.html`](google%20apps%20script/front-page2.html): HTML and client-side script for Sample Page 2.
*   [`back-page1.gs`](google%20apps%20script/back-page1.gs), [`back-page2.gs`](google%20apps%20script/back-page2.gs): Placeholder for page-specific backend Apps Script functions.

## Getting Started

1.  **Website Deployment**:
    *   Configure Firebase CLI with your project.
    *   Deploy the website using `firebase deploy --only hosting` and functions using `firebase deploy --only functions` (or use the `npm run deploy` scripts in `website/package.json`).
2.  **Google Apps Script Deployment**:
    *   Create a new Google Apps Script project or use an existing one.
    *   Copy the files from the `google apps script/` directory into your Apps Script project, or make a copy of the provided Sample Google Spreadsheet.
    *   Deploy the Apps Script project as a Web App.
        *   Execute as: `Me`
        *   Who has access: `Anyone, even anonymous`.
    *   Note the deployment ID. This will be used as the `org` parameter.
    *   Modify the Apps Script configuration so it uses a "Standard" Cloud Project. so that server logs go into GCP Cloud Logs. Use the same GCP project that Firebase uses. See https://developers.google.com/apps-script/guides/cloud-platform-projects#standard
3.  **Configuration**:
    *   Update `g_orgDefault` in [`website/public/js/common.js`](website/public/js/common.js) with your Apps Script deployment ID.
    *   If you plan to use multiple Apps Script deployments dynamically, generate corresponding public/private key pairs for signature verification and update `g_publicKeyJwk` in [`website/public/js/common.js`](website/public/js/common.js).
    *   Update other placeholder values as needed (GTM ID, API endpoints, etc.).

## Customization

*   Look for `REVIEW:` comments in the codebase, especially in [`website/public/js/common.js`](website/public/js/common.js) and [`google apps script/front-util.html`](google%20apps%20script/front-util.html), for areas that require customization for your specific needs.
*   Adapt the HTML, CSS, and JavaScript in both the `website/` and `google apps script/` directories to build your application.
