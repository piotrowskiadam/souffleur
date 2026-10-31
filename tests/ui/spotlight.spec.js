import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { spotlight, examplePrompts } from './harness.js';

test('first result is selected, Enter copies and restores chat focus', async ({ page }) => {
  await spotlight(page);
  await expect(page.getByRole('option')).toHaveCount(3);
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('combobox').press('Enter');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#chat')).toBeFocused();
  expect(await page.evaluate(() => window.__test.clipboard())).toBe(examplePrompts[0].text);
  await expect(page.getByText('Prompt copied. Ready to paste.')).toBeVisible();
});

test('query typed during loading is preserved; arrows and Escape work', async ({ page }) => {
  await spotlight(page, { delay: 250 });
  await page.getByRole('combobox').fill('clarity');
  await expect(page.getByRole('option')).toHaveCount(1);
  await expect(page.getByRole('option')).toContainText('Improve this text');
  await page.getByRole('combobox').fill('');
  await expect(page.getByRole('option')).toHaveCount(3);
  await page.getByRole('combobox').press('ArrowUp');
  await expect(page.getByRole('option').last()).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('combobox').press('Escape');
  await expect(page.locator('#chat')).toBeFocused();
});

test('clipboard failure leaves Spotlight open with actionable error', async ({ page }) => {
  await spotlight(page);
  await expect(page.getByRole('option')).toHaveCount(3);
  await page.evaluate(() => { window.__test.clipboardFails = true; });
  await page.getByRole('combobox').press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Could not copy');
  await expect(page.getByRole('combobox')).toBeFocused();
  await expect(page.getByText('Prompt copied. Ready to paste.')).toBeHidden();
});

test('closing while loading cannot reopen or steal focus', async ({ page }) => {
  await spotlight(page, { delay: 200 });
  await page.getByRole('combobox').press('Escape');
  await expect(page.locator('#chat')).toBeFocused();
  await page.waitForTimeout(500);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#chat')).toBeFocused();
  await page.evaluate(() => window.__toggle());
  await expect(page.getByRole('option')).toHaveCount(3);
});

test('native dialog contains focus; screen-reader semantics pass axe', async ({ page }) => {
  await spotlight(page);
  await expect(page.getByRole('option')).toHaveCount(3);
  await page.getByRole('combobox').press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Close Spotlight' })).toBeFocused();
  await page.getByRole('button', { name: 'Close Spotlight' }).press('Tab');
  await expect(page.getByRole('combobox')).toBeFocused();
  expect((await new AxeBuilder({ page }).include('#souffleur-spotlight-root').analyze()).violations).toEqual([]);
});

test('empty library gives an action; narrow short viewports keep search and footer visible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 });
  await spotlight(page, { prompts: [] });
  await expect(page.getByText(/Your library is empty/)).toBeVisible();
  await expect(page.getByRole('combobox')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Close Spotlight' })).toBeInViewport();
  expect(await page.getByRole('dialog').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
});

test('large libraries render in pages and keyboard navigation reaches the last result', async ({ page }) => {
  const prompts = Array.from({ length: 150 }, (_, i) => ({ id: `p${i}`, title: `Prompt ${i}`, text: `Body ${i}` }));
  await spotlight(page, { prompts });
  await expect(page.getByRole('option')).toHaveCount(100);
  await page.getByRole('combobox').press('ArrowUp');
  await expect(page.getByRole('option')).toHaveCount(150);
  await expect(page.getByRole('option').last()).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('combobox').press('Enter');
  expect(await page.evaluate(() => window.__test.clipboard())).toBe('Body 149');
});


test('host page root font size cannot shrink Spotlight typography', async ({ page }) => {
  await spotlight(page);
  await page.evaluate(() => { document.documentElement.style.fontSize = '10px'; });
  expect(await page.getByRole('combobox').evaluate(node => getComputedStyle(node).fontSize)).toBe('18px');
});
