# Google Apps Script Guidelines

This project contains the Apps Script web app that runs inside the iframe embedded by the website.

## Project structure
- `src/gs/` hosts server-side `.gs` GAS server files (using javascript). `_util.gs` wires routing, logging, and the `doGet` handler.
- `src/html/` contains HTML included by `doGet`.
- `src/js/` stores browser-side scripts injected into the HTML output. `bridge.js` handles the calls to GAS backend functions, which it receives as a message from the parent frontend. `page*.js` are for the demo pages.
- `src/css/` holds stylesheets that are inlined during the build.
- `build/scripts/*.js` orchestrate bundling: copying sources, loading environment variables from `src/.env` or `src/.env.local`, replacing `__PLACEHOLDER__` tokens, and composing final HTML.
- `appsscript.json` defines the Apps Script manifest.

## Development workflow
1. Run `npm install` in `google-apps-script/` to get the build utilities.
2. Populate `src/.env` with the deployment values (`URL_WEBSITE`, `FIREBASE_PROJECT_ID`, `ALLOW_ANY_EMBEDDING`, `IS_PRODUCTION`).
3. `npm run build` cleans `dist/`, copies manifests, inlines CSS/JS/HTML, and executes `clasp push --force`.
4. `npm run deploy` performs the build and then runs `clasp deploy`. Configure `YOUR_GAS_DEPLOYMENT_ID` first in `package.json`.
5. `npm run checks-prod` performs the consistency checks used before a production deploy, to ensure that .env.local is empty or commented-out.

## Coding standards
- Use **2 spaces** for indentation in `.gs`, `.js`, and `.html` files. Prefer double quotes for strings.
- Document public functions with comments describing arguments and side effects.
- Only expose server functions via the `PUBLIC_FUNCTIONS` whitelist in `_util.gs`. Names ending with `_` are treated as private helpers.

No automated tests exist for this package. Run the build before committing significant changes.
