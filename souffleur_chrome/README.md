# Souffleur

![Souffleur Logo](icons/icon128.png)

A Chrome extension for managing and quickly accessing prompts for Large Language Models with a MacOS Spotlight-like interface. (Uses Manifest V3).

## Features

- **MacOS Spotlight-like Interface**: Press Alt+Shift+P to open a spotlight-style overlay in the middle of the viewport
- **Chatbot Agnostic**: Works on any website, not just specific LLM platforms
- **Clipboard Integration**: Selected prompts are copied to clipboard instead of being inserted into input fields
- **Prompt Management**: Add, edit, delete, and reorder prompts through the Chrome Side Panel
- **Import/Export**: Import and export your prompts as JSON files
- **Improved UX (v4.7)**: Spotlight overlay closes instantly upon prompt selection, with a brief "Prompt Copied!" feedback message shown. Focus returns to the previously active element.
- **Manifest V3 & Side Panel**: Updated core using Manifest V3 and Chrome's Side Panel API.

## Installation

### From Chrome Web Store

(Link to be added once published)

### Manual Installation (Development)

1. Download the latest release or clone this repository's `souffleur_chrome` directory.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable "Developer mode" (usually a toggle in the top right).
4. Click "Load unpacked".
5. Select the `souffleur_chrome` directory containing the `manifest.json` file.

## How to Use

1. **Add Prompts**: Open the Side Panel (click the extension icon or press Ctrl+Shift+L) and add your prompts.
2. **Access Prompts**: Press Alt+Shift+P to open the spotlight overlay, search for a prompt, and press Enter to copy it to clipboard.
3. **Manage Prompts**: Use the Side Panel to edit, delete, or reorder your prompts.
4. **Import/Export**: Use the buttons at the bottom of the Side Panel to import or export your prompts as JSON.

## Keyboard Shortcuts

- `Ctrl+Shift+L`: Toggle the Side Panel
- `Alt+Shift+P`: Open the spotlight overlay

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
