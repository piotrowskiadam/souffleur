# Changelog

All notable changes to the Souffleur project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.7.1] - 2025-03-29

### Fixed
- Resolved issue where prompt reordering in sidebar was not saving correctly.
- Fixed issue where spotlight overlay failed to appear or load prompts due to message passing errors after MV3 migration.
- Removed unnecessary/outdated GitHub workflow files from browser-specific directories.
- Updated default keyboard shortcuts.

## [4.7.0] - 2025-03-28

### Changed
- Migrated extension core to Manifest V3 for future compatibility, maintaining Firefox support.

### Fixed
- Resolved issue where prompts failed to load in the spotlight overlay after MV3 migration.
- Corrected sidebar layout issue where Import/Export buttons could be cut off.

## [4.6.0] - 2025-03-28

### Fixed
- Resolved issue where spotlight content (input and results) would not display after the first activation and prompt selection.
- Adjusted prompt selection feedback: Spotlight now closes instantly, and a brief "Prompt Copied!" message appears independently at the bottom of the screen.

## [4.5.0] - 2025-03-26

### Fixed
- Improved user experience by making the spotlight overlay disappear immediately after selecting a prompt, while keeping the "Copied to clipboard!" message visible
- Fixed focus management: focus now returns to the previously active element after closing the spotlight overlay
- Enhanced overall usability with smoother transitions between states

## [4.0.0] - 2025-03-24

### Added
- MacOS Spotlight-like interface for accessing prompts
- Keyboard shortcut (Alt+P) to open the spotlight overlay
- Clipboard integration for copying prompts
- Support for all websites (chatbot agnostic)
- Improved UI with smoother animations

### Changed
- Replaced input field autocomplete with a central overlay
- Updated documentation to reflect new functionality
- Improved error handling and stability
- Enhanced keyboard navigation in the spotlight interface

### Fixed
- Various bugs and edge cases in the previous version
- Improved performance with large numbers of prompts

## [3.0.0] - Previous Release

### Added
- Support for Gemini in addition to ChatGPT and Claude
- Improved prompt management in the sidebar
- Drag and drop functionality for reordering prompts

### Changed
- Enhanced UI with Dracula theme
- Improved autocomplete functionality
- Better error handling

## [2.0.0] - Earlier Release

### Added
- Support for Claude in addition to ChatGPT
- Import/export functionality for prompts
- Improved sidebar interface

### Changed
- Enhanced autocomplete functionality
- Better error handling

## [1.0.0] - Initial Release

### Added
- Initial release with support for ChatGPT
- Basic prompt management
- Sidebar interface
- Autocomplete functionality