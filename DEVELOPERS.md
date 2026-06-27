# Developer Guide

This document outlines the setup, build automation, and deployment instructions for developers and AI agents working on Souffleur.

---

## 🛠️ Prerequisites

*   **Node.js**: Version 18 or newer (v22+ recommended).
*   **npm**: Version 9 or newer (v11+ recommended).

---

## 🚀 Getting Started

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/piotrowskiadam/souffleur.git
    cd souffleur
    ```

2.  **Install Dependencies**:
    Install [esbuild](https://esbuild.github.io/), which is used to compile and bundle the Javascript assets:
    ```bash
    npm install
    ```

3.  **Build the Extensions**:
    Compile the single-source codebase into platform-specific bundles:
    ```bash
    npm run build
    ```
    This generates the build output inside the `dist/` directory:
    *   `dist/chrome/`: Fully bundled extension for Google Chrome.
    *   `dist/firefox/`: Fully bundled extension for Mozilla Firefox.

---

## 💻 Running Locally

### Loading in Google Chrome
1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** using the toggle in the top-right corner.
3.  Click **Load unpacked** in the top-left corner.
4.  Select the `dist/chrome/` folder.

### Loading in Mozilla Firefox
1.  Open Firefox and navigate to `about:debugging`.
2.  Click **This Firefox** on the left menu.
3.  Click **Load Temporary Add-on...**.
4.  Navigate to `dist/firefox/` and select the `manifest.json` file.

---

## 📂 Codebase Directory Structure

```
├── .github/workflows/
│   └── deploy.yml              # CI/CD store release deployment pipeline
├── dist/                       # Build output target folder (gitignored)
│   ├── chrome/                 # Bundle for Google Chrome (unpacked)
│   └── firefox/                # Bundle for Mozilla Firefox (unpacked)
├── src/                        # Single source of truth (Source files)
│   ├── background.js           # Unified background/service-worker script
│   ├── content.js              # Content script with Shadow DOM style isolation
│   ├── icons/                  # Global icon assets (PNGs)
│   └── sidebar/
│       ├── sidebar.css         # Sidebar UI stylesheet
│       ├── sidebar.html        # Sidebar panel layout HTML
│       └── sidebar.js          # Sidebar script (handles sync storage)
├── build.js                    # Node.js builder script running esbuild compiler
├── manifest.chrome.json        # Manifest template for Chrome
├── manifest.firefox.json       # Manifest template for Firefox
├── package.json                # Root package configuration and scripts
├── LICENSE                     # Project license file
├── ARCHITECTURE.md             # Sequence diagrams and message definitions
└── README.md                   # Project overview and introduction
```

---

## 📦 Publishing & CI/CD Releases

Automated publishing is set up via GitHub Actions. Whenever a new release is **published** on GitHub, it automatically packages and pushes updates to the stores.

Ensure the following secrets are configured in **Settings > Secrets and variables > Actions**:

*   `CHROME_EXTENSION_ID`: Google Chrome Web Store extension ID.
*   `CHROME_CLIENT_ID`: Google OAuth API Client ID.
*   `CHROME_CLIENT_SECRET`: Google OAuth API Client Secret.
*   `CHROME_REFRESH_TOKEN`: Google OAuth API Refresh Token.
*   `MOZILLA_JWT_ISSUER`: Mozilla Developer Hub JWT Issuer.
*   `MOZILLA_JWT_SECRET`: Mozilla Developer Hub JWT Secret.
