# Google Apps Script Guidelines

This project bundles the Apps Script web app that the `website/` project embeds inside an iframe. The Apps Script bundle exposes
two integration modes described in the repo readme:

* **Method #2 (iframe HTMLService)** – `doGet` renders `src/html/page1.html` or `page2.html` and drives the iframe protocol used by
  `website/src/js/common.js` to manage analytics, URL mutations, loading states, and login prompts.
* **Method #1 (bridge)** – When the `bridge=1` query parameter is present, `doGet` serves `src/html/bridge.html` and the companion
  `src/js/bridge.js`. The bridge mirrors the `google.script` client API for the website MPA/SPA defined in `website/` so page-level
  code can call Apps Script functions while running outside GAS.

## Project structure
- `src/gs/` contains server-side `.gs` code. `_util.gs` wires up routing (`doGet`), structured logging helpers, and the
  `PUBLIC_FUNCTIONS` whitelist that the bridge can invoke. `page1.gs`, `page2.gs`, and `page3.gs` demonstrate page-specific logic,
  while `rsasign.gs` hosts the Firebase Auth signature verification utilities and certificate cache.
- `src/html/` provides the HTML entry points. Files pull in client bundles with `<script inline>` / `<link inline>` tags so that the
  build step can inline assets for HTMLService.
- `src/js/` holds browser-side scripts. `util.js` bootstraps the iframe messaging contract (logging, analytics, URL mutations,
  authentication prompts). `page*.js` are demo flows for Method #2 pages. `bridge.js` listens for `serverRequest` messages from the
  parent window and calls `google.script.run.processServerRequest` to service Method #1 requests.
- `src/css/` stores styles that are inlined during the build. Reference them from HTML using `<link inline>` to have
  `inline-source` flatten them into the output bundle.
- `build/scripts/` drive the custom bundling pipeline:
  * `build-html.js` runs `posthtml-include` to resolve partials, rewrites JS paths to the `.inline-cache/` staging folder, and runs
    `inline-source` to inline CSS/JS.
  * `build-js.js` copies JS into `src/.inline-cache/`, loads environment variables from `src/.env` and `src/.env.local`, and replaces
    `__VAR__` placeholders.
  * `build-gs.js` (server code) mirrors the placeholder replacement for `.gs` files.
  * `checks-prod.js` ensures `.env.local` is empty before production deploys so prod builds do not pick up local overrides.
- `appsscript.json` defines the manifest that `clasp` pushes.

## Integration with `website/`
- The iframe protocol shared between both projects uses `postMessage` events. When you introduce new actions in `util.js` or
  `bridge.js`, update the handler switch in `website/src/js/common.js` and the `components/js/gscriptrun` helpers to keep the
  message contract in sync.
- Logging from Apps Script pages flows through `util.js` → parent window → `website/functions/api/logs.js`, which writes to Google
  Cloud Logging. Avoid bypassing the helpers (`log_`, `warn_`, `error_`, `captureConsole`) so logs continue to reach Firebase.
- Authentication utilities (`getUser`, `logoutUser`, `verifyFirebaseIdToken_`) rely on the website’s Firebase configuration. Keep
  the `.env` values aligned between `google-apps-script/src/.env` and `website/src/.env` (`URL_WEBSITE`, `ALLOW_ANY_EMBEDDING`,
  Firebase IDs) to ensure both sides validate the same origins.
- Method #1 bridge requests are issued by `website/src/components/js/gscriptrun`. Every callable server function must appear in
  `_util.gs` under `PUBLIC_FUNCTIONS`, and helpers should end with `_` so they cannot be invoked remotely.

## Environment configuration
- All placeholders come from environment variables stored in `src/.env` and optionally overridden by `src/.env.local`.
- Key variables:
  * `URL_WEBSITE` – canonical parent origin. Must match the origin enforced in `website/src/.env` so iframe validation and
    bridge responses work.
  * `ALLOW_ANY_EMBEDDING` – `true` during local development (enables `*` as the `postMessage` target). Leave `false` for prod to
    block other domains from embedding the iframe.
  * `IS_PRODUCTION` – toggles verbose bridge logging and should mirror the website build so error paths stay consistent.
  * `FIREBASE_PROJECT_ID` – used by server-side logging/auth helpers. The value should match the Firebase project used by the
    website and the optional `util-org-sig/` tooling.
- `npm run checks-prod` verifies that `.env.local` does not override prod builds. Run it before publishing.

## Development workflow
1. Install dependencies with `npm install`. The tooling assumes `@google/clasp` is already installed globally.
2. Authenticate clasp via `npm run login` before the first push.
3. Use `npm run build` for iterative development—this cleans `dist/`, copies the manifest, inlines assets, and executes
   `clasp push --force`.
4. Use `npm run deploy` for production: it runs `build`, then `pub-prod` (`clasp deploy -i YOUR_GAS_DEPLOYMENT_ID -d Prod`). Update
   the deployment ID in `package.json` before running it.
5. Supporting scripts such as `npm run clean`, `npm run copy-files`, and `npm run build-html` are exposed individually for debugging
   the bundler when needed.

## Coding standards
- Use **2 spaces** for indentation in `.gs`, `.js`, and `.html` files. Prefer double quotes for strings and terminate statements
  with semicolons.
- Document public functions with comments describing arguments and side effects.
- Keep the iframe message names documented in `readme.md` accurate; update both the Apps Script and website implementations when
  you add or rename events.
- Only expose server functions via the `PUBLIC_FUNCTIONS` whitelist in `_util.gs`. Names ending with `_` are treated as private
  helpers.

No automated tests exist for this package. Run the build before committing significant changes.
