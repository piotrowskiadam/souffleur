# Souffleur

Souffleur is a desktop Chrome/Firefox extension that keeps reusable AI prompts close to the user’s current conversation. Its central interaction is a Spotlight-inspired keyboard overlay: search, choose, copy, then continue typing where you were.

## Product constraints

- One shared source tree with browser-specific Manifest V3 adapters.
- A native side panel/sidebar manages the library; Spotlight retrieves and copies prompts.
- Fast keyboard access and reliable clipboard/focus behavior are the primary success criteria.
- The UI remains in English and retains its existing dark palette with purple/cyan accents.
- Prompt content is literal user data, including code, markup, placeholders and Unicode.
- The user explicitly selected local storage plus JSON import/export for 4.8.0. Preserve existing data during migration; do not silently reintroduce cloud sync.
- No account, analytics, model API integration, or external UI font service.
- Exported JSON is the portable interchange/backup format. Uninstallation must not be described as safe without a separate backup.

## Typical flow

Save a prompt with placeholders in the library → open Spotlight from a regular webpage → search by title/body → copy with Enter → paste into any chatbot or text field. The extension does not automatically submit prompts or call an LLM.

## Maintenance priorities

Preserve user data and export compatibility, keep browser-specific code at the API boundary, test both UI engines and the actual Chrome extension transport, and keep the product small. Add dependencies only when their maintenance benefit outweighs their cost.
