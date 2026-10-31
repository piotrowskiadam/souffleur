# Souffleur architecture

Souffleur is a Manifest V3 extension with one source tree and two build targets. There is no framework or runtime dependency. esbuild produces self-contained IIFEs for Chrome’s service worker, Firefox’s nonpersistent background script, the content script, and the library panel.

## Boundaries

| Module | Responsibility |
| --- | --- |
| `src/background.js` | Own storage, authorize messages, route browser commands and panel actions. |
| `src/lib/library.js` | Serialize reads/mutations, migrate legacy data, validate revisions, commit snapshots. Receives a storage adapter for testing. |
| `src/lib/prompts.js` | Pure validation, import parsing, search, and stable-ID reordering. No browser or DOM access. |
| `src/lib/browser.js` | Select the promise-based `browser` / `chrome` namespace. |
| `src/lib/client.js` | Normalize runtime responses and connection errors. |
| `src/lib/clipboard.js` | Await clipboard success, with a narrowly scoped legacy copy fallback for HTTP pages. |
| `src/content.js` + `src/spotlight.css` | Lazy Shadow DOM / modal dialog, combobox, search results, keyboard interaction, focus restoration. |
| `src/sidebar/` | Library search, editor, import review, export, reorder, delete/undo, user feedback. |
| `src/theme.css` | Shared dark palette, text roles and font tokens, copied to the panel and bundled as text for Spotlight. |

## Message contract

All messages are internal. The background rejects senders whose extension ID differs from `runtime.id`.

| Action | Sender | Payload | Response |
| --- | --- | --- | --- |
| `getPrompts` | Content script or library | `{ action: 'getPrompts' }` | `{ prompts, revision }` or `{ error }` |
| `mutateLibrary` | Exact extension URL `sidebar/sidebar.html` only | `{ action: 'mutateLibrary', operation }` | `{ prompts, revision }` or `{ error }` |
| `toggleSpotlight` | Background → content script | `{ action: 'toggleSpotlight' }` | No application response |

Mutation operations are `create`, `update`, `delete`, `move`, and `import`. They are validated by the repository before persistence. Updates/deletes carry the original `expected` title/text to detect changes made in another panel. Moves use `id` / `beforeId`, never DOM indices. Replacing an import also checks `expectedRevision`.

The message listener returns `true` and uses `sendResponse`; it does not depend on asynchronous listener-return semantics differing between browser versions. Do not add `externally_connectable` without revisiting this boundary.

## Data lifecycle

`storage.local.library` contains:

```json
{
  "schemaVersion": 1,
  "revision": 0,
  "prompts": [{ "id": "stable-id", "title": "Title", "text": "Literal text" }]
}
```

1. Read and validate the local snapshot. Unknown schemas stop with an error rather than being overwritten.
2. If absent, read legacy `storage.sync.prompts`. Preserve `[]`; only an absent key gets two starter examples. Invalid legacy data stops migration, retaining the original data.
3. Write the complete local snapshot. Subsequent reads prefer it, including after a worker restart.
4. Run all reads/mutations through one background-owned promise queue. A failed operation does not poison the queue. Read current data inside the queue, apply a stable-ID operation, validate, then await `storage.local.set`.
5. Increment the revision only in the committed snapshot. Panels apply `storage.onChanged` snapshots without destroying an open editor. Their in-flight replies cannot replace a newer revision.
6. On replacement import, write `libraryBackup` and `library` in one storage call. The 4 MiB library cap leaves quota headroom for one recovery snapshot. This is not a multi-key database transaction or a substitute for an exported backup.

The local API’s access level is restricted to trusted extension contexts where supported. Firefox versions without `setAccessLevel` still use the message boundary, but its content-script storage access is controlled by Firefox rather than this Chrome-specific API. Only the panel reads the pre-import backup directly. Legacy sync data is retained, never logged, and never updated by this version.

## UI lifecycle

Spotlight creates no DOM before the first request. A native `<dialog>` inside an extension-created shadow root enters the browser top layer. This avoids z-index competition with host dialogs. It contains an ARIA combobox/listbox, selected-first-result behavior, an explicit Tab cycle, and native modal inertness. Escape/outside click closes it. A generation token prevents slow reads or clipboard completions from mutating a later opening or stealing focus.

Only successful copy closes Spotlight and shows success feedback. On HTTP pages, `navigator.clipboard` may be unavailable: a temporary textarea inside the dialog attempts `execCommand('copy')`. That deprecated API is a feature-detected fallback, not the primary path. A failed copy keeps the prompt available and reports a retryable error. Closing clears library arrays, preview DOM and query; focus returns to the deepest previously active open-shadow element if it still exists.

Shadow DOM is a **style boundary, not a security boundary**. The host page can inspect preview nodes while open. Content never uses `innerHTML` or a prompt body in HTML attributes. Host capture-phase key handlers can still observe events before the dialog receives them; bubble propagation is stopped. Uncooperative webpages and privileged browser pages remain platform constraints.

The panel initially renders 50 matches and Spotlight 100. Show more loads another page; Spotlight’s arrow navigation expands the rendered range when necessary. Searching examines the full library, regardless of the rendered page. Neither view changes stored order during search.

## Browser adapters and permissions

Chrome uses `sidePanel` with `openPanelOnActionClick`; a command calls `sidePanel.open` directly to preserve the user gesture. Firefox uses `sidebarAction.toggle`. Both retrieve real command assignments through `commands.getAll`.

Both targets require `storage` and `clipboardWrite`; Chrome additionally needs `sidePanel`. Declarative content-script matches make the overlay available on eligible URLs. No separate `host_permissions`, `tabs`, `activeTab`, or `scripting` permission is needed for the implemented behavior. An unavailable content-script receiver sets a small toolbar badge and explanatory title rather than silently claiming success.

## Compatibility references

- [Chrome storage and access levels](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Chrome side panel and user gestures](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Mozilla: interacting with the clipboard](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard)
- [Mozilla: extension data collection declarations](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)

Browser APIs, manifest compatibility, and store policies should be checked again before changing supported minimum versions or publishing a new release.
