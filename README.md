# Souffleur Browser Extension

![Souffleur Logo](souffleur_chrome/icons/icon128.png) 

This repository contains the source code for the Souffleur browser extension, designed for managing and quickly accessing prompts for Large Language Models.

<div>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/souffleur/" style="display:inline-block;vertical-align:middle;">
    <img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Get the Add-on for Firefox" width="250">
  </a>
  <a href="https://chromewebstore.google.com/detail/souffleur/jpencajlhojahjjokfkjbjnchdbacpfn" style="display:inline-block;vertical-align:middle;margin-left:16px;">
    <img src="https://developer.chrome.com/static/docs/webstore/branding/image/HRs9MPufa1J1h5glNhut.png" alt="Get it on Chrome Web Store" width="250" height="60">
  </a>
</div>

## ✨ Features

- **MacOS Spotlight-like Interface**: Press `Ctrl+Shift+U` to open a spotlight-style overlay.
- **Chatbot Agnostic**: Works on any website.
- **Clipboard Integration**: Selected prompts are copied directly to your clipboard.
- **Prompt Management**: Add, edit, delete, and reorder prompts through the Sidebar (Firefox) or Side Panel (Chrome).
- **Import/Export**: Easily import and export your prompts as JSON files.
- **Improved UX**: Spotlight overlay closes instantly upon prompt selection, with a brief "Prompt Copied!" feedback message shown. Focus returns to the previously active element.
- **Manifest V3**: Updated core using Manifest V3.

## 📦 Versions

Due to differences in Manifest V3 implementation between browsers (specifically regarding background scripts and side panel APIs), the code is maintained in separate directories:

-   **`souffleur_firefox/`**: Contains the version primarily tested and optimized for Firefox. It uses Manifest V3 but relies on background `scripts` for compatibility.
-   **`souffleur_chrome/`**: Contains the version primarily tested and optimized for Google Chrome. It uses Manifest V3 with a background `service_worker` and the `sidePanel` API.

Please refer to the `README.md` file within each respective directory for specific details about that version (features, installation, usage).

## Contributing

Contributions are welcome! Please target your pull requests to the appropriate subdirectory (`souffleur_firefox` or `souffleur_chrome`) or discuss broader changes first. See `CONTRIBUTING.md` within the subdirectories for more details.

## License

This project is licensed under the MIT License - see the `LICENSE` file within the subdirectories for details.