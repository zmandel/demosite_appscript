# Website Guidelines

This Vite project powers the Firebase-hosted companion site that embeds the Apps Script web app via an iframe bridge.

## Project layout
- `src/index.html`, `src/page{1-3}.html`, and `src/login.html` are Vite entry points defined in `vite.config.js`.
- `src/js/common.js` centralizes iframe messaging, Google Tag Manager loading, logging queue management, and translation helpers. Reuse the existing message types when extending parent/iframe communication.
- `src/js/page*.js` and `src/js/login.js` contain page-specific bootstrap logic that imports helpers from `common.js`.
- `src/components/js/` hosts Lit-based components (for example `authdialog.js`, `gscriptrun.js`) that import their HTML fragments via `?raw` and register custom elements.
- `src/components/html/` stores template fragments consumed by the Lit components.
- `src/css/` contains shared styles. Keep selectors descriptive; components import what they need explicitly.
- `static/` exposes assets copied verbatim by Vite. Anything referenced from HTML should live here or under `src/`.
- `functions/api/logs.js` defines the Cloud Function that relays console output to Cloud Logging. It relies on the `ALLOWED_HOST` environment variable (see `firebase.json`).

## Development workflow
1. Run `npm install` in `website/` and, separately, in `website/functions/` if you change the Cloud Function code.
2. Use `npm run dev` (or `npm run debug` for LAN/HTTPS) to serve the Vite app from `src/`. Output is written to `dist/` when you run `npm run build`.
3. Deploy Hosting + Functions with `npm run deploy` from `website/`. Use `npm run deployserver` if you only changed backend code.
4. Cloud Functions require **Node.js 22** (see `website/functions/package.json`). The front-end tooling works with modern Node (>=18).
5. Configure runtime secrets via `.env`/`.env.local` files placed in `website/src/`. Vite exposes them through `import.meta.env.VITE_*`—the keys referenced in `common.js` must be defined before building.

## Coding standards
- Use **2 spaces** for indentation in JavaScript, HTML, and CSS to match the existing files.
- Prefer double quotes for strings and terminate statements with semicolons.
- Keep translation dictionaries (`translations` objects in `common.js`, `authService.js`, `components/js/*.js`) in sync across supported languages when introducing new keys.
- When adding new iframe events, update the handler switch in `common.js` and mirror the contract on the Apps Script side (`google-apps-script/src/js/bridge.js`).
- Route all log output through the queuing helpers in `common.js` so the Firebase function can forward them consistently.

No automated tests exist for this project. Run the relevant build command(s) before submitting changes.
