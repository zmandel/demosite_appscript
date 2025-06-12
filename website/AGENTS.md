# Website Guidelines

This directory contains the website that embeds the Apps Script web app via iframes and handles analytics, logging and custom domain configuration.

## Key Locations

- `public/` contains the static files served by Firebase Hosting. `public/js/common.js` drives the iframe integration logic.
- `functions/` holds Firebase Cloud Functions (see `api/logs.js`) used for centralized logging.
- `/util-org-sig/crypto.js` contains helper code to generate signing keys.

## Coding Style

- Use **4 spaces** for indentation in JavaScript and JSON files.
- Use semicolons and ES6 module syntax.
- Keep variable and function names in **camelCase**.
- Document major functions with comments explaining their purpose and parameters.

## Development

1. Run `npm install` inside `functions/` before deploying Cloud Functions.
2. Use `npm run deploy` from the `website` folder to deploy the Hosting site and `npm run deployserver` to deploy functions.
3. Update configuration placeholders in `public/js/common.js` and `functions/api/logs.js` when setting up your own domain and keys.
4. Firebase Hosting expects Node **22** for the Cloud Functions runtime.

No automated tests are provided for this project.
