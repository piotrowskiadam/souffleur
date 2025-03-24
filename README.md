# Souffleur

![Souffleur Logo](icons/icon128.png)

A Firefox extension for managing and quickly accessing prompts for Large Language Models with a MacOS Spotlight-like interface.

## Features

- **MacOS Spotlight-like Interface**: Press Alt+P to open a spotlight-style overlay in the middle of the viewport
- **Chatbot Agnostic**: Works on any website, not just specific LLM platforms
- **Clipboard Integration**: Selected prompts are copied to clipboard instead of being inserted into input fields
- **Prompt Management**: Add, edit, delete, and reorder prompts through the sidebar
- **Import/Export**: Import and export your prompts as JSON files

## Installation

### From Mozilla Add-ons

Install Souffleur directly from the [Mozilla Add-ons website](https://addons.mozilla.org/en-US/firefox/addon/souffleur/).

### Manual Installation (Development)

1. Download the latest release or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the extension directory

## How to Use

1. **Add Prompts**: Open the sidebar (click the extension icon or press Ctrl+Shift+L) and add your prompts
2. **Access Prompts**: Press Alt+P to open the spotlight overlay, search for a prompt, and press Enter to copy it to clipboard
3. **Manage Prompts**: Use the sidebar to edit, delete, or reorder your prompts
4. **Import/Export**: Use the buttons at the bottom of the sidebar to import or export your prompts as JSON

## Keyboard Shortcuts

- `Ctrl+Shift+L`: Toggle the sidebar
- `Alt+P`: Open the spotlight overlay

## Development

### Prerequisites

- Firefox Browser
- Node.js and npm
- Basic knowledge of HTML, CSS, and JavaScript

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/piotrowskiadam/souffleur.git
   cd souffleur
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```
   This will open Firefox with the extension loaded.


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
