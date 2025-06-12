# Repository Overview

This repository demonstrates how to integrate Google Apps Script web apps with a regular website. It provides a sample Apps Script project alongside a Firebase-based site that embeds and communicates with that script.

## Subdirectories

- **`google-apps-script/`** - Contains the sample Google Apps Script project. It includes server-side `.gs` files, client utilities, and HTML templates used when embedding the script. Guidelines for this folder are documented in [`google-apps-script/AGENTS.md`](google-apps-script/AGENTS.md).
- **`website/`** - Holds the companion website that hosts static files and Firebase Cloud Functions. The site manages iframe communication, analytics, logging, and deployment via Firebase. See [`website/AGENTS.md`](website/AGENTS.md) for development notes.

Each subdirectory's AGENTS file provides specific coding style and workflow guidance. No automated tests are defined for this repository.
