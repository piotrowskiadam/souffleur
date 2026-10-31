# Developer guide

## Setup

Use Node.js **22.12+** and npm. Both desktop browser variants are built from `src/`; do not maintain parallel copies of the application. There are no production dependencies or remote UI assets.

```sh
npm ci
npm run check
npx playwright install --with-deps chromium firefox
npm run test:ui
npm run package
```

`npm run check` runs Node regression tests, a clean esbuild build, and Mozilla’s `web-ext lint` with warnings treated as errors. `npm run test:ui` starts/stops its own localhost test server. On Linux it needs the usual Playwright browser libraries. `npm run package` rebuilds both targets before packaging them with Mozilla’s tooling; it never uploads them.

| Output | Use |
| --- | --- |
| `dist/chrome/` | Load unpacked in Chrome. Minimum version: 116. |
| `dist/firefox/` | Load `manifest.json` temporarily in Firefox. Minimum version: 142. |
| `artifacts/souffleur-chrome-<version>.zip` | Chrome store/upload package. |
| `artifacts/souffleur-firefox-<version>.zip` | Unsigned Firefox package for signing/review. |
| `playwright-report/`, `test-results/` | UI report and failure traces, ignored by Git. |

Firefox 142 is the minimum declared for consistent support of the manifest’s explicit no-data-collection metadata across Mozilla’s compatibility checks. Souffleur targets desktop browsers, not Firefox for Android. Keep minimum versions and esbuild targets consistent when revisiting compatibility.

## Test boundaries

- `tests/prompts.test.js`: validation, legacy imports, Unicode/literal HTML, bounded inputs, search, stable-ID moves.
- `tests/library.test.js`: migration, empty libraries, failure recovery, queued concurrent writes, edit conflicts, merge/replacement backups, schema protection, long prompts.
- `tests/background.test.js`: real bundled background in a VM, message authorization and both platform command adapters.
- `tests/manifests.test.js`: versions, permission budgets and platform declarations.
- `tests/ui/library.spec.js`: actual platform-specific panel and background bundles with browser APIs replaced (`chrome` for Chromium, `browser` for Firefox). Covers CRUD, failures, safe DOM rendering, import/export, stale replacement review after a concurrent save, narrow viewports, 200% text, axe.
- `tests/ui/spotlight.spec.js`: actual Chrome and Firefox content/background bundles on their corresponding engines and browser API namespaces. Covers loading races, copy failure, first selection, arrows, focus, empty states and large libraries. axe is scoped to the injected extension surface, since host-page accessibility is outside Souffleur’s control.
- `tests/ui/extension.spec.js`: a real Chrome extension in a fresh persistent Chromium profile, real service worker/storage/message transport/content script and system clipboard. Its Firefox project is deliberately skipped: Playwright Firefox does not provide equivalent extension loading. Firefox UI tests and Mozilla’s packaging validator cover separate boundaries; they do not claim a full signed Firefox installation test.

Node tests disable per-file process isolation to run consistently in development sandboxes; each repository/background test creates its own state. UI fixtures and the static server live only in `tests/` and must never ship in `dist/`. Do not use the test API replacement as production fallback behavior.

For a manual Firefox release check, temporarily load the build in the actual desktop browser, open its toolbar sidebar, create/edit/reorder a prompt, trigger Spotlight on an HTTP and HTTPS page, copy/paste, and verify focus restoration. Also check reassigned shortcuts, 200% browser zoom, reduced motion, and a screen reader. Automated axe checks do not establish full WCAG conformance.

## Migration and recovery

Version 4.8.0 initializes `storage.local.library` from `storage.sync.prompts` once, or from starter examples only if the legacy key is absent. An empty array stays empty. The legacy sync copy is retained unchanged; it may still exist in the browser vendor’s sync service.

Before changing schemas, keep the old reader/migration and test restarts and failed writes. Unknown schemas or invalid stored data must fail visibly rather than being reseeded. If a legacy library cannot be migrated, use the extension’s **background debugging console** to export its original JSON for repair:

```js
// Firefox: use browser instead of chrome if needed.
const old = await chrome.storage.sync.get('prompts');
console.log(JSON.stringify(old.prompts, null, 2));
```

This is an explicit troubleshooting step; application code does not log prompt content. Treat the output and any exported file as private. If local data is damaged, inspect/export `chrome.storage.local.get(['library', 'libraryBackup'])` before taking any recovery action. Never clear storage merely to resolve a UI failure.

Replacing the library through import stores one prior snapshot under `libraryBackup`. Export it using **Shortcuts & storage → Export pre-import backup** and import that file to restore it. Browser profile removal/uninstallation deletes local backups too.

If you explicitly want to remove the retained legacy synchronized copy **after verifying an independent export**, run `await chrome.storage.sync.remove('prompts')` in the background debugging console. Other devices still running 4.7.x can reintroduce/update their old synced library; upgrade them first. Removing that key does not erase the new local library.

## Security and maintenance

- Prompt data is untrusted: use `textContent` / form `.value`, never HTML interpolation.
- Keep all library mutations in the background-owned queue. Do not write a panel’s whole cached array back to storage.
- Content-script senders are read-only. Changes to message authorization require tests.
- Keep full prompt bodies out of DOM attributes, logs, and error telemetry. Shadow DOM isolates styles, not secrets.
- The 4 MiB library limit leaves headroom within browser local quotas for the replacement backup. UTF-8 JSON size is checked before every write.
- Maintain the plain-array JSON exchange format so old exports remain usable.
- Update manifests and `package.json` together; the build and tests reject mismatches.
- Browser APIs and clipboard fallbacks need compatibility checks when changing minimum versions.

Run `npm audit` when updating tools. At the audit date, npm reports upstream low/moderate findings in `web-ext`’s development-only validator dependencies; there is no patched compatible upstream tree for all of them. Do not apply npm’s suggested downgrade to an obsolete web-ext or force incompatible transitive major versions just to clear the report. `npm audit --omit=dev` checks the shipped dependency budget separately. These tools run on trusted repository/build files; none is bundled into the extension. Re-evaluate before the next toolchain upgrade.

## CI and store releases

`.github/workflows/ci.yml` validates every push/PR, runs both UI engines plus the real Chrome extension test, and uploads both ZIPs. Failure reports are retained for seven days. CI never publishes stores.

`.github/workflows/deploy.yml` repeats validation and UI tests, then operates on the downloaded validated packages in independent Chrome and Firefox jobs. Publishing a stable GitHub release tagged `v<package version>` (for example `v4.8.0`) submits both stores. The manual workflow defaults to **verify**, which checks authentication and listing access without uploading. Select **publish** explicitly to submit from `main`, and optionally select only one store.

See [Publishing](docs/PUBLISHING.md) for the one-time Google federation setup, existing AMO secrets, reviewer source packaging, and recovery steps. Store review remains required; pushing source code or making a prerelease does not update users' extensions.

Check store listing/privacy text when changing data behavior. Download CI packages for testing before publishing a release. Never commit credentials, local browser profiles, or user prompt exports.
