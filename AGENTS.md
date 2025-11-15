# Repository Guidelines

This monorepo provides the code and demonstrates how a website can use Google Apps Script without any of the existing limitations of an Apps Script webapp. The website deployment script is made for Firebase hosting, but you can modify `package.json` use any hosting.

## Projects
- `website/` – Vite-based front end that hosts the GAS plus helpers. See `website/AGENTS.md` for authoring conventions.
- `website/functions` (optional) – Firebase Cloud Functions that proxy frontend logging to GCP logging.
- `google-apps-script/` – Source, build scripts, and deployment helpers for the Apps Script project. See `google-apps-script/AGENTS.md`.
- `util-org-sig/` (optional) – Helper scripts described in `util-org-sig/readme.md` for creating ECDSA keys used by both projects.

## Local setup
1. Install dependencies for each project you touch (`npm install` in `website/`, `website/functions/`, or `google-apps-script/`).
2. The Firebase Cloud Functions expect **Node.js 22**. Vite builds the front end with your local Node version (>=18 is recommended).

## .env configurations
- The `.env` files are configured once and generally not modified. `.env.local` is used to overwrite values in `.env`, only for development builds.

## Build & validation commands
- Website static build: `npm run build` inside `website/`.
- Firebase functions deployment: `npm run deploy` from `website/functions/`. For local emulation, use `npm run serve`.
- Apps Script bundle & push: `npm run build` inside `google-apps-script/` (runs the HTML/JS inliner and `clasp push`). Use `npm run deploy` to build and deploy.
- No automated tests are defined; please run the relevant build steps above before submitting changes.

## Coding standards
- JavaScript (both front end and Apps Script) uses **2 spaces** for indentation, ES modules, and double quotes. Match the surrounding style when editing files.
- Prefer descriptive comments for exported/public functions so that the integration points stay discoverable.
- Use `console.warn` and `console.error` to alert the developers of unusual situations, failed assertions and errors. Those alerts are logged and sent to the development team automatically.

Refer to the `AGENTS.md` file in the subdirectory you are modifying for more specific conventions.
