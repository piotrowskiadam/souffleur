import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { panel, examplePrompts } from './harness.js';

async function ready(page) { await expect(page.locator('#add-prompt-btn')).toBeEnabled(); }

test('search, create, edit, preserve whitespace, delete and undo', async ({ page }) => {
  await panel(page);
  await ready(page);
  await expect(page.getByRole('listitem')).toHaveCount(3);
  await page.getByRole('searchbox').fill('code SECURITY');
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button', { name: 'New prompt', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('My prompt');
  await page.getByLabel('Prompt', { exact: true }).fill('  Keep this whitespace\n\n');
  await page.getByLabel('Prompt', { exact: true }).press('Control+Enter');
  await expect(page.getByRole('heading', { name: 'My prompt', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit My prompt', exact: true }).click();
  await expect(page.getByLabel('Prompt', { exact: true })).toHaveValue('  Keep this whitespace\n\n');
  await page.getByLabel('Title', { exact: true }).fill('Edited prompt');
  await page.getByRole('button', { name: 'Save prompt', exact: true }).click();
  await page.getByLabel('More actions for Edited prompt').click();
  await page.getByRole('button', { name: 'Delete Edited prompt' }).click();
  await expect(page.getByRole('heading', { name: 'Edited prompt', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo delete' }).click();
  await expect(page.getByRole('heading', { name: 'Edited prompt', exact: true })).toBeVisible();
});

test('literal HTML stays inert in lists and edit fields', async ({ page }) => {
  const prompt = { id: 'xss', title: '<img src=x onerror="alert(1)">', text: '</textarea><img src=x onerror="alert(1)">\n& "quotes"' };
  await panel(page, { prompts: [prompt] });
  await ready(page);
  await expect(page.locator('#prompt-list img')).toHaveCount(0);
  await page.getByRole('button', { name: `Edit ${prompt.title}`, exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(prompt.title);
  await expect(page.getByLabel('Prompt', { exact: true })).toHaveValue(prompt.text);
  await expect(page.locator('#prompt-editor img')).toHaveCount(0);
});

test('failed save keeps draft and stored library, then retries', async ({ page }) => {
  await panel(page);
  await ready(page);
  await page.getByRole('button', { name: 'New prompt', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Unsaved');
  await page.getByLabel('Prompt', { exact: true }).fill('A draft worth keeping');
  await page.evaluate(() => { window.__test.failWrites = true; });
  await page.getByRole('button', { name: 'Save prompt', exact: true }).click();
  await expect(page.locator('#editor-error')).toContainText('quota');
  await expect(page.getByLabel('Prompt', { exact: true })).toHaveValue('A draft worth keeping');
  expect(await page.evaluate(() => window.__test.values.library.prompts.length)).toBe(3);
  await page.evaluate(() => { window.__test.failWrites = false; });
  await page.getByRole('button', { name: 'Save prompt', exact: true }).click();
  await expect(page.locator('#prompt-editor')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Unsaved', exact: true })).toBeVisible();
});

test('imports default to merge, replacement has a recovery export', async ({ page }) => {
  await panel(page);
  await ready(page);
  await page.locator('#import-file').setInputFiles({ name: 'prompts.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([{ title: 'Imported', text: 'New body' }, examplePrompts[0]])) });
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('[value="merge"]')).toBeChecked();
  await page.getByRole('button', { name: 'Import prompts', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(4);
  await page.locator('#import-file').setInputFiles({ name: 'empty.json', mimeType: 'application/json', buffer: Buffer.from('[]') });
  await page.locator('[value="replace"]').check();
  await page.getByRole('button', { name: 'Import prompts', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Make room for your next idea.' })).toBeVisible();
  expect(await page.evaluate(() => window.__test.values.libraryBackup.prompts.length)).toBe(4);
  await page.getByText('Shortcuts & storage', { exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export pre-import backup' }).click();
  expect((await download).suggestedFilename()).toMatch(/^souffleur_recovery/);
});

test('invalid import leaves the entire library intact', async ({ page }) => {
  await panel(page);
  await ready(page);
  await page.locator('#import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('[{"title":"Bad","text":false}]') });
  await expect(page.locator('#status-message')).toContainText('both strings');
  await expect(page.getByRole('listitem')).toHaveCount(3);
});

test('empty library does not reseed', async ({ page }) => {
  await panel(page, { prompts: [] });
  await ready(page);
  expect(await page.evaluate(() => window.__test.values.library.prompts)).toEqual([]);
  await expect(page.getByRole('button', { name: 'Create your first prompt' })).toBeVisible();
});

test('narrow layout, text expansion and core forms pass axe', async ({ page }) => {
  await page.setViewportSize({ width: 300, height: 760 });
  await panel(page, { prompts: [{ id: 'long', title: 'VeryLongUnbrokenTitle'.repeat(20), text: '説明 مرحبا 🙂 '.repeat(100) }] });
  await ready(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'New prompt', exact: true }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test('keyboard move actions persist order', async ({ page }) => {
  await panel(page);
  await ready(page);
  await page.getByLabel('More actions for Improve this text').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Move Improve this text up' }).press('Enter');
  await expect(page.getByRole('listitem').first()).toContainText('Improve this text');
  expect(await page.evaluate(() => window.__test.values.library.prompts[0].id)).toBe('writing');
});
