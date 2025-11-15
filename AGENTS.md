# Repository Guidelines

This monorepo demonstrates how a Firebase-hosted site exchanges data with an embedded Google Apps Script web app. The root directory only stores shared documentation and project-wide configuration; all source code lives under the `website/` and `google-apps-script/` folders.

## Directory map
- `website/` – Vite-based front end plus Firebase Cloud Functions that proxy logging. See `website/AGENTS.md` for authoring conventions.
- `google-apps-script/` – Source, build scripts, and deployment helpers for the Apps Script project. See `google-apps-script/AGENTS.md`.
- `util-org-sig/` – Helper scripts described in `util-org-sig/readme.md` for creating ECDSA keys used by both projects.

## Local setup
1. Install dependencies for each project you touch (`npm install` in `website/`, `website/functions/`, or `google-apps-script/`).
2. The Firebase Cloud Functions expect **Node.js 22**. Vite builds the front end with your local Node version (>=18 is recommended).
3. When working on the Apps Script bundle, copy the sample `.env` variables into `google-apps-script/src/.env` and adjust them before running build commands.

## Build & validation commands
- Website static build: `npm run build` inside `website/`.
- Firebase functions deployment: `npm run deploy` from `website/functions/`. For local emulation, use `npm run serve`.
- Apps Script bundle & push: `npm run build` inside `google-apps-script/` (runs the HTML/JS inliner and `clasp push`).
- No automated tests are defined; please run the relevant build steps above before submitting changes.

## Coding standards
- JavaScript (both front end and Apps Script) generally uses **2 spaces** for indentation, ES modules, and double quotes. Match the surrounding style when editing files.
- Prefer descriptive comments for exported/public functions so that the integration points stay discoverable.
- Keep logging consistent: use the helpers in each subproject (`log_`, `warn_`, `error_` on the Apps Script side and the logging queue in `website/src/js/common.js`).

Refer to the AGENTS file in the subdirectory you are modifying for more specific conventions.
