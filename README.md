<p align="center">
  <img src="src/icons/icon128.png" alt="Souffleur Logo" width="128" height="128" />
</p>

<h1 align="center">Souffleur</h1>

---

<p align="center">
  <b>A Spotlight-like prompt manager for LLMs. Access, organize, and copy your AI prompts instantly, browser-wide.</b>
</p>

<p align="center">
  <a href="https://addons.mozilla.org/en-US/firefox/addon/souffleur/">
    <img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Get the Add-on for Firefox" height="50">
  </a>
  &nbsp;&nbsp;
  <a href="https://chromewebstore.google.com/detail/souffleur/jpencajlhojahjjokfkjbjnchdbacpfn">
    <img src="https://developer.chrome.com/static/docs/webstore/branding/image/HRs9MPufa1J1h5glNhut.png" alt="Get it on Chrome Web Store" height="50">
  </a>
  &nbsp;&nbsp;
  <a href="https://ko-fi.com/B5Z022ZL32">
    <img src="https://storage.ko-fi.com/cdn/brandasset/v2/support_me_on_kofi_blue.png" alt="Support me on Ko-fi" height="36">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Chrome%20%7C%20Firefox-blue?style=flat-square&logo=googlechrome&logoColor=white" alt="Platform" />
  <img src="https://img.shields.io/badge/Manifest-V3-orange?style=flat-square" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/Language-JavaScript-yellow?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License MIT" />
</p>

Souffleur is a lightweight, keyboard-centric browser extension designed for developers, researchers, and AI power users. It streamlines prompt management by bringing a fast, Spotlight-style interface directly to any web page, ensuring your flow is never interrupted.

## Why Souffleur?

Most prompt managers are clunky, require navigating away from your chat window, or force you to copy-paste between multiple tabs. **Souffleur is different:**

- **Spotlight at your Fingertips**: Press `Ctrl+Alt+1` (Firefox) or `Ctrl+Shift+U` (Chrome) to open a macOS-style search overlay instantly. Search and select prompts entirely from your keyboard.
- **Chatbot Agnostic**: Works seamlessly across ChatGPT, Claude, Gemini, local LLM interfaces, or any text field on the web.
- **Side Panel Organization**: Manage, edit, and organize your prompts in a clean, native sidebar (Firefox) or side panel (Chrome) that stays open alongside your workspace.
- **Zero-Friction Clipboard Integration**: Select a prompt, and it's instantly copied to your clipboard while the overlay closes automatically, letting you paste and continue your flow.

## Core Features

- **macOS Spotlight-like Overlay**: Access your entire prompt library instantly from anywhere on the web.
- **Side Panel & Sidebar Integration**: Add, edit, delete, and reorder prompts via the Chrome Side Panel or Firefox Sidebar.
- **Clipboard Sync**: Instantly copy selected prompts to your clipboard for easy pasting into any LLM textbox.
- **Import & Export**: Effortlessly backup and sync your prompts using simple JSON files.
- **Focus Preservation**: Focus returns automatically to your active text field after copying a prompt.
- **Privacy First**: Everything is stored locally on your device. No analytics, tracking, or cloud syncing.

## 📦 Versions & Implementation

Due to architectural differences in Manifest V3 implementations between Firefox and Google Chrome (specifically regarding background service workers and side panel APIs), the codebase is organized into two dedicated subdirectories:

- **[souffleur_chrome](file:///home/adampiotrowski/Desktop/Projekty%20programistyczne/souffleur/souffleur_chrome)**: Built for Google Chrome. Uses Manifest V3 background service workers and the native `sidePanel` API.
- **[souffleur_firefox](file:///home/adampiotrowski/Desktop/Projekty%20programistyczne/souffleur/souffleur_firefox)**: Built for Mozilla Firefox. Uses Manifest V3 compatible background scripts and the native `sidebarAction` API.

Please refer to the `README.md` within each folder for specific installation instructions and configuration options:
- [Chrome Installation Guide](file:///home/adampiotrowski/Desktop/Projekty%20programistyczne/souffleur/souffleur_chrome/README.md)
- [Firefox Installation Guide](file:///home/adampiotrowski/Desktop/Projekty%20programistyczne/souffleur/souffleur_firefox/README.md)

## Contributing

Contributions are welcome! If you'd like to improve Souffleur, please fork the repository and submit a pull request targetting the appropriate subdirectory. Feel free to open an issue to discuss major changes beforehand.

## License

This project is licensed under the MIT License. See the respective subdirectory `LICENSE` files for detailed terms.