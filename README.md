<p align="center"><img src="src/icons/icon128.png" alt="Souffleur" width="96" height="96" /></p>
<h1 align="center">Souffleur</h1>
<p align="center">Your prompts, a shortcut away.</p>

A small, keyboard-first prompt library for desktop **Chrome and Firefox**. Save the prompts you reuse, find them in a Spotlight-style overlay, and copy them without leaving your conversation.

<p align="center">
  <a href="https://addons.mozilla.org/en-US/firefox/addon/souffleur/">
    <img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Get the Add-on for Firefox" height="50">
  </a>
  &nbsp;&nbsp;
  <a href="https://chromewebstore.google.com/detail/souffleur/jpencajlhojahjjokfkjbjnchdbacpfn">
    <img src="https://developer.chrome.com/static/docs/webstore/branding/image/HRs9MPufa1J1h5glNhut.png" alt="Get it on Chrome Web Store" height="50">
  </a>
</p>

<p align="center">
  <a href="https://ko-fi.com/B5Z022ZL32">
    <img src="https://storage.ko-fi.com/cdn/brandasset/v2/support_me_on_kofi_blue.png" alt="Support me on Ko-fi" height="36">
  </a>
</p>

## Use Souffleur

1. Click the extension icon to open your prompt library in the browser side panel.
2. Choose **New prompt**, add a title and prompt text, then **Save prompt**. Cancel or Esc leaves the library unchanged. Ctrl/⌘ + Enter saves while editing.
3. Open Spotlight on a regular webpage. Type words from the title or body, use ↑ / ↓, and press Enter to copy. The first result is ready to copy immediately.
4. Paste into your chat. Spotlight restores focus to the field you were using.

| Action | Chrome default | Firefox default |
| --- | --- | --- |
| Open Spotlight | Ctrl + Shift + U | Ctrl + Alt + 1 |
| Open library / toggle Firefox sidebar | Ctrl + Shift + Y | Ctrl + Alt + P |

The library displays the **actual assigned Spotlight shortcut**, including custom bindings. If a shortcut is unavailable or conflicts with the OS, assign it in `chrome://extensions/shortcuts` or Firefox’s Add-ons Manager → Manage Extension Shortcuts. macOS may display Command for Ctrl-based bindings.

Browser settings pages, extension stores, built-in PDF viewers, and other privileged pages may block Spotlight. Use the library there instead, or switch to a regular webpage. Reload an already-open webpage after an extension update.

## Organize and back up

- Search titles and full prompt text in either surface. Search ignores case and decomposable accents, and matches all entered words.
- Use **More → Move up / Move down**, or drag a prompt’s title when the library is unfiltered.
- Delete a prompt and choose **Undo delete** to restore it. Undo stays available until dismissed or replaced by another action; it is not a durable backup.
- **Export JSON** downloads the complete library, including prompts hidden by search.
- **Import JSON** validates the entire file before saving. The default adds prompts and skips exact title/text duplicates. You can choose to replace the library instead; **Shortcuts & storage → Export pre-import backup** retrieves the previous library. Only the most recent replacement backup is retained.

The interchange format remains compatible with older Souffleur exports:

```json
[
  {
    "id": "optional-stable-id",
    "title": "Code review",
    "text": "Review this code for correctness and security:\n\n[your code]"
  }
]
```

Missing or duplicate IDs are repaired during import. Text is preserved literally, including HTML, Unicode, and leading/trailing whitespace. A file must be at most 8 MiB (allowing formatted exports to round-trip); the resulting library must fit within 4 MiB of UTF-8 JSON, with at most 5,000 prompts. Titles allow 1,000 characters and each prompt body 1,048,576 characters. A rejected import leaves the library intact.

## Storage and privacy

As of **4.8.0**, the library is stored in `storage.local` on this device. There is no ongoing cloud synchronization, account, analytics, or remote font request. Export/import moves your library between browsers or devices. Uninstalling the extension or deleting its browser profile removes its local data: keep a separate JSON backup.

On the first use after upgrading from 4.7.x, Souffleur copies the old `storage.sync.prompts` array to local storage, including an intentionally empty library. The original synced copy is retained for recovery and is **no longer updated**; data already synced by your browser is not deleted from its sync service. See [migration and recovery](DEVELOPERS.md#migration-and-recovery).

The content script runs on eligible webpages so the shortcut can open Spotlight. It creates no overlay and fetches no library until you request it. Prompt previews become part of the page’s DOM while Spotlight is open; Shadow DOM isolates styles, **not confidential data from that page**. Avoid opening sensitive prompts on untrusted sites. Prompt text is never interpreted as HTML. Clipboard contents are shared with the operating system when you choose to copy.

## Build from source

Requires **Node.js 22.12+**, Chrome **116+**, or desktop Firefox **142+**.

```sh
npm ci
npm run check
npm run package
```

Load `dist/chrome/` with **Load unpacked** in `chrome://extensions`, or select `dist/firefox/manifest.json` in `about:debugging` → **This Firefox** → **Load Temporary Add-on**. Temporary Firefox installations disappear on restart. ZIPs are written to `artifacts/`; Firefox store distribution still requires Mozilla signing.

[Developer guide](DEVELOPERS.md) · [Architecture](ARCHITECTURE.md) · [Design system](DESIGN.md) · [Audit and verification](docs/AUDIT-2026-10-31.md) · [Changelog](CHANGELOG.md)

## Contributing

Both browsers use the same `src/` code. Change the appropriate manifest only for platform-specific behavior, add a regression test for data/interaction changes, and run the checks in the developer guide. Do not commit build output or prompt backups.

## License

[MIT](LICENSE).
