# Google Apps Script Guidelines

This folder contains sample Apps Script files that interact with the website located under `../website`.

## Notes on Google Apps Script Webapps

- ".gs" files are server-side javascript with a special function "doGet" as the endpoint entry point.


## Coding Style

- Use **4 spaces** for indentation for both `.gs` and `.html` files.
- Use semicolons and keep line length under 120 characters.
- Keep function and variable names in **camelCase**.
- Include descriptive comments for new functions and parameters.

## Development Notes
- Install by running "npm install" from the google-apps-script directory. 
- Bundle with "npm run build" from the google-apps-script directory.
- Configure "clasp" to easily push and deploy, then use "npm run deploy" from the google-apps-script directory.
- google-apps-script/build/build-html.js takes care of inlining css and js into the html files
- Deploy the Apps Script as a **Web App** (Execute as: Me, Access: Anyone) from "src/dist". 
- Logging helpers (`log_`, `warn_`, `error_`) send messages to the website for centralized collection. Ensure any new code uses these helpers for consistency.
- No automated tests are defined for this directory.
