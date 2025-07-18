# Google Apps Script Guidelines

This folder contains sample Apps Script files that interact with the website located under `../website`.

## Notes on Google Apps Script Webapps

- ".gs" files are server-side javascript with a special function "doGet" as the endpoint entry point.
- Apps Script has a special template syntax which we augment here to separate HTML from JS using our "include_('html-file')" server function called from inside the HTML template.
- the apps script (server or client) cannot be simulated, it can only be deployed in Google Drive.

## File Organization

- `back-*` files contain server-side Apps Script (`.gs`) code.
- `front-*` files contain inline JavaScript snippets included by the HTML pages.
- `html-*` files are the HTML templates served by the script.
- `front-util.html` provides common client-side utilities for logging and communication with the parent website.

## Coding Style

- Use **4 spaces** for indentation for both `.gs` and `.html` files.
- Use semicolons and keep line length under 120 characters.
- Keep function and variable names in **camelCase**.
- Include descriptive comments for new functions and parameters.

## Development Notes

- Deploy the Apps Script as a **Web App** (Execute as: Me, Access: Anyone). This allows the sample website to load it inside an iframe.
- When adding new pages, follow the `page1` and `page2` pattern: create matching `html-*` templates and optional `back-*` logic and update the routing.
- Logging helpers (`log_`, `warn_`, `error_`) send messages to the website for centralized collection. Ensure any new code uses these helpers for consistency.
- Note that when g_allowAnyEmbedding is false in (`front-util.html`) it securely enforces that the domain embedding the script iframe is the expected one by rejecting messages from other domains. the custom "validateDomain" message enables the script content.
No automated tests are defined for this directory.
