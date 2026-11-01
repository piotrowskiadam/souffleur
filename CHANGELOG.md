# Changelog

## Unreleased

- Use the same Ctrl+Shift+Period (Spotlight) and Ctrl+Shift+Comma (library) defaults in Chrome and Firefox; macOS maps Ctrl to Command. Avoid Chrome’s Ctrl+Alt restriction, Linux Unicode input on Ctrl+Shift+U, and the previous Firefox Ctrl+Alt+P PDF presentation conflict. Preserve user-assigned shortcuts and document manual reassignment for existing installs.

## 4.8.0 — 2026-10-31

- Move the library from a single quota-limited sync item to versioned local storage. Migrate existing data once; preserve empty libraries and the original recovery copy.
- Preserve the library revision shown in import review so replacement cannot overwrite a later save from another panel. Exercise the Firefox build and `browser` namespace in Firefox UI tests.
- Serialize background-owned mutations and detect conflicting edits across panels. Failed writes keep saved data and editor drafts intact.
- Render prompt titles and bodies as literal text; remove HTML interpolation and prompt-content debug logging.
- Add library search, explicit Save/Cancel, keyboard reorder, undo delete, import review/merge, and replacement recovery export.
- Refine the existing dark UI with shared tokens, local system fonts, readable secondary text, labels, focus states, empty/error/loading feedback, and narrow-panel layouts.
- Improve Spotlight with selected-first-result behavior, a native modal top layer, complete keyboard focus handling, loading-race protection, and successful-copy-only dismissal.
- Remove unused permissions; declare Firefox’s no-data-collection behavior. Minimum supported versions: Chrome 116, desktop Firefox 142.
- Clean builds, version checks, regression/UI/axe tests, real Chrome extension smoke test, packaging and CI gates before store deployment.
- Replace stale split-directory documentation with the shared architecture, migration/privacy details, design reference and audit report.
