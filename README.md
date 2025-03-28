# Souffleur Browser Extension

![Souffleur Logo](souffleur_chrome/icons/icon128.png)

This repository contains the source code for the Souffleur browser extension, designed for managing and quickly accessing prompts for Large Language Models.

## Versions

Due to differences in Manifest V3 implementation between browsers (specifically regarding background scripts and side panel APIs), the code is maintained in separate directories:

-   **`souffleur_firefox/`**: Contains the version primarily tested and optimized for Firefox. It uses Manifest V3 but relies on background `scripts` for compatibility.
-   **`souffleur_chrome/`**: Contains the version primarily tested and optimized for Google Chrome. It uses Manifest V3 with a background `service_worker` and the `sidePanel` API.

Please refer to the `README.md` file within each respective directory for specific details about that version (features, installation, usage).

## Contributing

Contributions are welcome! Please target your pull requests to the appropriate subdirectory (`souffleur_firefox` or `souffleur_chrome`) or discuss broader changes first. See `CONTRIBUTING.md` within the subdirectories for more details.

## License

This project is licensed under the MIT License - see the `LICENSE` file within the subdirectories for details.