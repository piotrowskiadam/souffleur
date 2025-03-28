# Souffleur Add-on Documentation (v4.5)

## Table of Contents

- [Souffleur Add-on Documentation (v4.5)](#souffleur-add-on-documentation-v45)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [What's New in v4.5](#whats-new-in-v45)
  - [What's New in v4.0](#whats-new-in-v40)
  - [Design and Styling](#design-and-styling)
  - [File Structure](#file-structure)
  - [Component Breakdown](#component-breakdown)
    - [manifest.json](#manifestjson)
    - [background.js](#backgroundjs)
    - [content.js](#contentjs)
    - [sidebar.html and sidebar.js](#sidebarhtml-and-sidebarjs)
  - [Data Flow](#data-flow)
  - [User Functionalities](#user-functionalities)
  - [Prompt Data Structure](#prompt-data-structure)
    - [Fields](#fields)
    - [Example](#example)
  - [Developer Guide](#developer-guide)
  - [Known Issues and Limitations](#known-issues-and-limitations)
  - [Future Development](#future-development)
  - [Code Examples](#code-examples)
  - [FAQ](#faq)

## Overview

Souffleur is a browser extension designed to enhance the user experience when working with Large Language Models (LLMs) and other text-based applications. It provides functionality to manage and quickly access prompts through a MacOS Spotlight-like interface.

Key Features:

- Prompt management (add, edit, delete) through the sidebar
- Quick access to prompts via a spotlight-style overlay (Alt+P)
- Copy prompts to clipboard with a single keystroke
- Import and export functionality for prompts
- Works on any website (chatbot agnostic)

## What's New in v4.5

Version 4.5 introduces important usability improvements:

1. **Improved Spotlight Behavior**: The spotlight overlay now disappears immediately after selecting a prompt, while still showing the "Copied to clipboard!" message
2. **Enhanced Focus Management**: Focus now automatically returns to the previously active element after closing the spotlight overlay
3. **Smoother User Experience**: Overall improved transitions between states for a more polished feel

## What's New in v4.0

Version 4.0 introduced several major changes:

1. **MacOS Spotlight-like Interface**: Replaced the input field autocomplete with a spotlight-style overlay in the middle of the viewport, activated with Alt+P
2. **Chatbot Agnostic**: Now works on any website, not just specific LLM platforms
3. **Clipboard Integration**: Selected prompts are copied to clipboard instead of being inserted into input fields
4. **Improved UI**: Enhanced sidebar and spotlight interface with smoother animations and better usability
5. **Keyboard Navigation**: Improved keyboard navigation in the spotlight interface

## Design and Styling

Souffleur's design is inspired by the following:

- **MacOS Spotlight**: The overlay interface is inspired by MacOS Spotlight, providing a familiar and intuitive experience
- **Mozilla's Photon Design System**: We follow Photon's principles for a clean, modern UI that aligns with Firefox's design language
- **Inter Font**: We use the Inter font family for its excellent readability and modern aesthetic
- **Dracula Theme**: Our default color scheme is inspired by the popular Dracula theme, providing a dark mode experience that's easy on the eyes

These design choices ensure a consistent, user-friendly interface that integrates well with the browser environment while providing a unique identity for Souffleur.

## File Structure

The add-on consists of the following main files:

- `manifest.json`: Configuration file for the extension
- `background.js`: Handles background processes, storage management, and keyboard shortcuts
- `content.js`: Implements the spotlight overlay and clipboard functionality
- `sidebar.html`: Defines the structure of the sidebar
- `sidebar.css`: Styles the sidebar interface
- `sidebar.js`: Manages the sidebar's functionality and user interactions
- `README.md`: Basic documentation and usage instructions

## Component Breakdown

### manifest.json

This file defines the extension's properties, permissions, and scripts to be executed. Key changes in v4.0:

- Added `clipboardWrite` permission for clipboard access
- Changed content script matches to `<all_urls>` to work on any website
- Added a new command `toggle_spotlight` with Alt+P shortcut

### background.js

Key responsibilities:

- Initializes the local storage with default prompts if none exist
- Listens for messages from the content script
- Retrieves prompts from storage when requested
- Handles keyboard shortcuts for toggling the sidebar and spotlight
- Provides a fallback method for copying to clipboard

Main functions:

- Storage initialization
- Message handling for `getPrompts` and `copyToClipboard` actions
- Command handling for keyboard shortcuts

### content.js

Key responsibilities:

- Implements the spotlight overlay interface
- Manages prompt filtering and selection
- Handles keyboard navigation in the spotlight
- Copies selected prompts to clipboard

Main functions:

- `createSpotlightOverlay()`: Creates the spotlight overlay interface
- `showSpotlight()` / `hideSpotlight()`: Controls the visibility of the spotlight
- `filterPrompts()`: Filters prompts based on user input
- `copyToClipboard()`: Copies the selected prompt to clipboard

### sidebar.html and sidebar.js

Key responsibilities:

- Provides interface for managing prompts (add, edit, delete)
- Handles import and export of prompts
- Manages user interactions within the sidebar

Main functions:

- `loadPrompts()`: Loads prompts from storage and renders them
- `renderPrompts()`: Creates HTML elements for each prompt
- `attachPromptListeners()`: Adds event listeners to prompt buttons
- Import/Export functionality

## Data Flow

1. Prompts are stored in `browser.storage.local`
2. `background.js` initializes and manages the stored prompts
3. `sidebar.js` reads and writes prompts to storage, allowing user management
4. `content.js` retrieves prompts from storage for the spotlight functionality
5. User interactions in the content script (spotlight) and sidebar update the stored prompts

## User Functionalities

- Add new prompts via the sidebar
- Edit and delete existing prompts
- Import and export prompts (JSON format)
- Open the spotlight overlay with Alt+P
- Search for prompts in the spotlight
- Navigate through results with arrow keys
- Copy selected prompt to clipboard with Enter

## Prompt Data Structure

The prompts used in this add-on are stored in a JSON format. Each prompt is represented as an object within an array. The structure of the JSON file is as follows:

```json
[
  {
    "title": "Prompt Title",
    "text": "Prompt Text"
  },
  // More prompts...
]
```

### Fields

- `title`: A string containing the title or short description of the prompt. This is used for quick identification in the sidebar and spotlight results.
- `text`: A string containing the full text of the prompt. This is the content that will be copied to clipboard when the prompt is selected.

### Example

```json
[
  {
    "title": "Summarize Article",
    "text": "Please provide a concise summary of the following article, highlighting the main points and key takeaways."
  },
  {
    "title": "Code Review",
    "text": "Please review the following code for potential bugs, performance issues, and adherence to best practices. Suggest improvements where appropriate."
  }
]
```

## Developer Guide

To set up the development environment:

1. Clone the repository
2. Load the extension in Firefox:
   - Navigate to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file
3. Make changes to the code
4. Reload the extension in `about:debugging` to see changes

Testing:

- Use the browser console to debug and check for errors
- Test the spotlight overlay on various websites
- Ensure clipboard functionality works correctly
- Test keyboard shortcuts and navigation

## Known Issues and Limitations

- Clipboard access may require permission prompts on some websites
- The Alt+P shortcut may conflict with some application shortcuts, but is less likely to conflict with common browser functions
- Performance may degrade with a very large number of stored prompts

## Future Development

- Support for prompt categories and tags
- Customizable keyboard shortcuts
- Sync functionality across devices
- Custom themes and styling options
- Rich text formatting for prompts

## Code Examples

Spotlight activation in content.js:

```javascript
function toggleSpotlight() {
  if (isSpotlightVisible) {
    hideSpotlight();
  } else {
    showSpotlight();
  }
}

// Listen for messages from the background script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleSpotlight") {
    toggleSpotlight();
  }
  return Promise.resolve({ success: true });
});
```

## FAQ

Q: How do I access my prompts?
A: Press Alt+P to open the spotlight overlay, then search for and select a prompt.

Q: How are prompts stored?
A: Prompts are stored using `browser.storage.local`, ensuring persistence across browser sessions.

Q: Can I use Souffleur on any website?
A: Yes, Souffleur works on any website, not just specific LLM platforms.

Q: What happens after I select a prompt?
A: The prompt is copied to your clipboard, the spotlight overlay disappears immediately, and focus returns to where you were before opening the spotlight. A "Copied to clipboard!" message appears briefly to confirm the action.

Q: Will I lose my focus when using the spotlight?
A: No, in v4.5 and later, your focus automatically returns to where it was before opening the spotlight overlay.

Q: How do I customize the keyboard shortcuts?
A: Currently, keyboard shortcuts are fixed, but customization will be added in a future update.

Q: How can I contribute to the project?
A: Check our GitHub repository for contribution guidelines and open issues.