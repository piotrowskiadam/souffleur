import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

test('real Chrome extension migrates, edits, isolates storage and copies from a webpage', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'Firefox WebExtension packaging is checked with web-ext; UI runs on both engines.');
  const profile = await mkdtemp(join(tmpdir(), 'souffleur-extension-'));
  const extension = resolve('dist/chrome');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    // Real registration catches browser-reserved shortcuts that a UI mock cannot.
    const commands = await worker.evaluate(async () => (await chrome.commands.getAll())
      .filter(command => ['toggle_spotlight', 'toggle_sidebar'].includes(command.name)));
    expect(commands).toHaveLength(2);
    for (const command of commands) expect(command.shortcut, `Chrome did not register ${command.name}`).toBeTruthy();
    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${id}/sidebar/sidebar.html`);
    await expect(panel.locator('#add-prompt-btn')).toBeEnabled();
    await expect(panel.locator('#spotlight-shortcut')).toHaveText(/\.$/);
    await worker.evaluate(async () => {
      await chrome.storage.sync.set({ prompts: [{ id: 'legacy', title: 'Migrated legacy prompt', text: 'Legacy text\n  preserved' }] });
      await chrome.storage.local.remove('library');
    });
    await panel.reload();
    await expect(panel.getByRole('heading', { name: 'Migrated legacy prompt', exact: true })).toBeVisible();
    await panel.getByRole('button', { name: 'New prompt', exact: true }).click();
    await panel.getByLabel('Title', { exact: true }).fill('Actual extension prompt');
    await panel.getByLabel('Prompt', { exact: true }).fill('The real clipboard flow works.');
    await panel.getByRole('button', { name: 'Save prompt', exact: true }).click();
    await expect(panel.getByRole('heading', { name: 'Actual extension prompt', exact: true })).toBeVisible();
    const tab = await context.newPage();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4173' });
    await tab.goto('http://127.0.0.1:4173/tests/fixture.html');
    await tab.locator('#chat').focus();
    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleSpotlight' });
    });
    await expect(tab.getByRole('option')).toHaveCount(2);
    await tab.getByRole('combobox').press('Enter');
    await expect(tab.getByRole('dialog')).toBeHidden();
    await expect(tab.locator('#chat')).toBeFocused();
    expect(await tab.evaluate(() => navigator.clipboard.readText())).toBe('The real clipboard flow works.');
    await panel.reload();
    await expect(panel.getByRole('heading', { name: 'Actual extension prompt', exact: true })).toBeVisible();
    expect(await worker.evaluate(async () => (await chrome.storage.sync.get('prompts')).prompts[0].id)).toBe('legacy');
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
