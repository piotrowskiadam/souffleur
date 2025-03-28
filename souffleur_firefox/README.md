# Souffleur

![Souffleur Logo](icons/icon128.png)

A Firefox extension for managing and quickly accessing prompts for Large Language Models with a MacOS Spotlight-like interface.

## Features

- **MacOS Spotlight-like Interface**: Press Alt+P to open a spotlight-style overlay in the middle of the viewport
- **Chatbot Agnostic**: Works on any website, not just specific LLM platforms
- **Clipboard Integration**: Selected prompts are copied to clipboard instead of being inserted into input fields
- **Prompt Management**: Add, edit, delete, and reorder prompts through the Firefox Sidebar
- **Import/Export**: Import and export your prompts as JSON files
- **Improved UX (v4.7)**: Spotlight overlay closes instantly upon prompt selection, with a brief "Prompt Copied!" feedback message shown. Focus returns to the previously active element.
- **Manifest V3**: Updated core using Manifest V3 with Firefox-compatible APIs.

## Installation

### From Mozilla Add-ons

<a href="https://addons.mozilla.org/en-US/firefox/addon/souffleur/"><img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Get the Add-on for Firefox" width="250"></a>

(Or install directly from the [Mozilla Add-ons website](https://addons.mozilla.org/en-US/firefox/addon/souffleur/).)

### Manual Installation (Development)

1. Download the latest release or clone this repository's `souffleur_firefox` directory.
2. Open Firefox and navigate to `about:debugging`.
3. Click "This Firefox".
4. Click "Load Temporary Add-on...".
5. Select the `manifest.json` file from the `souffleur_firefox` directory.

## How to Use

1. **Add Prompts**: Open the Sidebar (click the extension icon or press Ctrl+Shift+L) and add your prompts.
2. **Access Prompts**: Press Alt+P to open the spotlight overlay, search for a prompt, and press Enter to copy it to clipboard.
3. **Manage Prompts**: Use the Sidebar to edit, delete, or reorder your prompts.
4. **Import/Export**: Use the buttons at the bottom of the Sidebar to import or export your prompts as JSON.

## Keyboard Shortcuts

- `Ctrl+Alt+P`: Toggle the Sidebar
- `Alt+P`: Open the spotlight overlay

*(You can customize these shortcuts by navigating to `about:addons`, clicking the gear icon ⚙️, and selecting "Manage Extension Shortcuts".)*

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by MacOS Spotlight
- Uses the Dracula color theme
- Uses the Inter font family
