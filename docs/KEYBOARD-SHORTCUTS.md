# Shared Chrome and Firefox shortcuts

Research date: 2026-10-31. Chrome compatibility follow-up: 2026-11-01.

## Decision

Use the same default pair in both browser manifests (Ctrl becomes Command on macOS):

| Action | Keys to press | Manifest value |
| --- | --- | --- |
| Open Spotlight | Ctrl + Shift + . | `Ctrl+Shift+Period` |
| Toggle the prompt library sidebar | Ctrl + Shift + , | `Ctrl+Shift+Comma` |

The neighboring punctuation keys form a consistent pair on Polish programmers' and US layouts. Neither combination appears in Mozilla's published [Firefox shortcuts](https://support.mozilla.org/en-US/kb/keyboard-shortcuts-perform-firefox-tasks-quickly) or [DevTools shortcuts](https://firefox-source-docs.mozilla.org/devtools-user/keyboard_shortcuts/index.html). This is a lower-conflict choice based on those references, not a guarantee against every application, keyboard layout or extension.

Mozilla supports the `linux` override and the named `Comma` and `Period` keys in [extension commands](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands). Each combination uses the supported two modifiers plus one key. Chrome also supports these named keys with Ctrl + Shift; its [commands reference](https://developer.chrome.com/docs/extensions/reference/api/commands) explicitly forbids Ctrl + Alt because of AltGr conflicts. Both manifests therefore share the same two defaults instead of carrying separate per-platform combinations. Google’s [Chrome shortcut list](https://support.google.com/chrome/answer/157179?hl=en) does not list either pair; this does not establish freedom from all OS or third-party bindings.

## Why these keys

Chrome previously suggested Ctrl + Shift + U for Spotlight and Ctrl + Shift + Y for the library. The shared pair also removes the Linux Unicode-entry issue from the Chrome default.

- The previous sidebar default, Ctrl + Alt + P, is Firefox's PDF presentation shortcut. Several familiar Ctrl + Shift + letter combinations are already used for browser features or DevTools. See the [Firefox shortcut list](https://support.mozilla.org/en-US/kb/keyboard-shortcuts-perform-firefox-tasks-quickly).
- Ctrl + Shift + U is unsuitable as a Linux fallback because GTK uses it to begin Unicode character entry. [GTK documentation](https://docs.gtk.org/gtk4/class.IMContextSimple.html) describes that input sequence.
- Alt + Shift + letter combinations overlap Firefox's HTML access keys. [MDN's accesskey documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/accesskey) lists that modifier on Linux.
- Avoiding Alt also avoids relying on its interaction with third-level character input. Avoiding Super and Space avoids several common desktop/input-source shortcuts; [GNOME's shortcut reference](https://help.gnome.org/gnome-help/shell-keyboard-shortcuts.html) documents its desktop conventions.

The local GNOME/Wayland window-manager, Shell, Mutter, media-key, custom-shortcut and IBus assignments were read without changing them. No Ctrl + Shift + comma/period assignment was found in those settings. This does not cover every GNOME extension or independently configured application.

## Existing installations and custom assignments

Keep command names stable and do not force assignments with `commands.update()`. Firefox loads manifest defaults, then applies persisted command overrides; this is visible in [ExtensionShortcuts.loadCommands()](https://searchfox.org/firefox-main/source/toolkit/components/extensions/ExtensionShortcuts.sys.mjs). User-selected shortcuts therefore remain authoritative.

To use the pair immediately in an already installed version, open `chrome://extensions/shortcuts` in Chrome, or `about:addons` → gear menu → **Manage Extension Shortcuts** in Firefox. Find **Souffleur** and press the desired combination in each command's field. The same manager can resolve conflicts with another extension. Mozilla documents this workflow in [Manage extension shortcuts in Firefox](https://support.mozilla.org/en-US/kb/manage-extension-shortcuts-firefox).

Souffleur reads the actual assignment through `commands.getAll()`. Firefox's implementation returns the stored command string, so a manifest-defined value can be `Ctrl+Shift+Period`, rather than a literal dot; tests should model that API result. The [Firefox source](https://searchfox.org/firefox-main/source/toolkit/components/extensions/ExtensionShortcuts.sys.mjs) passes named keys through [ShortcutUtils](https://searchfox.org/firefox-main/source/toolkit/modules/ShortcutUtils.sys.mjs) to `VK_PERIOD` and `VK_COMMA`.

The real Chrome extension smoke test also checks `commands.getAll()` in a fresh profile: both named commands must have a non-empty registered shortcut, and the panel must show a readable punctuation key for Spotlight rather than the internal `Period` token. This checks native registration; the clipboard scenario still opens Spotlight through extension messaging rather than proving OS keyboard delivery.

## Verification limits

The review covered official documentation and the installed Firefox application resources (`omni.ja`), including its [native browser keyset](https://searchfox.org/firefox-main/source/browser/base/content/browser-sets.inc.xhtml) and extension shortcut parsing. No matching native Linux browser reservation was found. No user browser profile or installed-extension configuration was inspected. Static checks and the project's UI harness do not prove native shortcut delivery through a desktop compositor; an isolated native Firefox smoke test or a user check remains necessary to confirm delivery on a particular machine. Web applications can also have their own shortcuts.
