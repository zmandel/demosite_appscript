# Repository Overview

Demonstrates how to integrate Google Apps Script web apps with a regular website. It provides a sample Apps Script project alongside a Firebase (hosting, auth, functions) website that embeds and communicates with it.

## Subdirectories

- **`google-apps-script/`** - Contains the sample Google Apps Script project See google-apps-script/AGENTS.md.
- **`website/`** - Parent website and a backend function in website/functions. The site manages iframe communication, login (firebase auth), analytics (GTM), logging (Google Cloud Logging in frontend and backend). See website/AGENTS.md.
- **`util-org-sig/`** - Crypto utilities for the org/sig feature

Each subdirectory's AGENTS file provides specific coding style and workflow guidance. No automated tests are defined for this repository.
