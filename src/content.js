import { browserApi } from './lib/browser.js';
import { request } from './lib/client.js';
import { copyText } from './lib/clipboard.js';
import { searchPrompts } from './lib/prompts.js';
import theme from './theme.css';
import styles from './spotlight.css';

const RESULT_PAGE_SIZE = 100;
let host;
let shadow;
let dialog;
let input;
let results;
let heading;
let status;
let emptyMessage;
let retry;
let more;
let toast;
let toastTimer;
let prompts = [];
let matches = [];
let selectedIndex = -1;
let visibleCount = RESULT_PAGE_SIZE;
let previousFocus;
let generation = 0;
let copying = false;
let loaded = false;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function deepActiveElement() {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

function createOverlay() {
  host = node('div');
  host.id = 'souffleur-spotlight-root';
  // Reset inherited host-page layout. The native dialog uses the browser top layer.
  host.style.cssText = 'all:initial;position:fixed!important;width:0!important;height:0!important;z-index:2147483647!important;';
  shadow = host.attachShadow({ mode: 'open' });
  const style = node('style');
  style.textContent = `${theme}\n${styles}`;
  dialog = node('dialog', 'spotlight');
  dialog.setAttribute('aria-label', 'Souffleur prompt Spotlight');
  const searchRow = node('div', 'search-row');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: '22', height: '22', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.75', 'aria-hidden': 'true', class: 'search-icon' })) svg.setAttribute(key, value);
  const circle = document.createElementNS(svg.namespaceURI, 'circle');
  for (const [key, value] of Object.entries({ cx: '10.5', cy: '10.5', r: '6.5' })) circle.setAttribute(key, value);
  const line = document.createElementNS(svg.namespaceURI, 'path');
  line.setAttribute('d', 'm16 16 4.5 4.5');
  svg.append(circle, line);
  input = node('input', 'spotlight-input');
  input.type = 'search';
  input.placeholder = 'Search your prompts…';
  input.setAttribute('aria-label', 'Search prompts');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-controls', 'souffleur-results');
  input.autocomplete = 'off';
  input.spellcheck = false;
  const close = node('button', 'close-button', 'Close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close Spotlight');
  close.addEventListener('click', hideSpotlight);
  searchRow.append(svg, input, close);
  heading = node('div', 'results-heading', 'Loading your prompts…');
  heading.setAttribute('role', 'status');
  results = node('div', 'spotlight-results');
  results.id = 'souffleur-results';
  results.setAttribute('role', 'listbox');
  results.setAttribute('aria-label', 'Matching prompts');
  more = node('button', 'more-button', 'Show more prompts');
  more.type = 'button';
  more.hidden = true;
  more.addEventListener('click', () => { visibleCount += RESULT_PAGE_SIZE; renderResults(false); input.focus(); });
  emptyMessage = node('div', 'spotlight-message');
  emptyMessage.hidden = true;
  status = node('div', 'spotlight-status');
  status.setAttribute('role', 'alert');
  retry = node('button', 'retry-button', 'Try loading again');
  retry.type = 'button';
  retry.hidden = true;
  retry.addEventListener('click', () => loadPrompts(generation));
  const footer = node('footer', 'spotlight-footer');
  footer.append(node('span', 'spotlight-brand', 'Souffleur'));
  for (const [key, label] of [['↑ ↓', ' choose'], ['Enter', ' copy'], ['Esc', ' close']]) {
    const hint = node('span');
    hint.append(node('kbd', '', key), document.createTextNode(label));
    footer.append(hint);
  }
  dialog.append(searchRow, heading, results, emptyMessage, more, status, retry, footer);
  toast = node('div', 'toast');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.hidden = true;
  shadow.append(style, dialog, toast);
  (document.body ?? document.documentElement).append(host);

  input.addEventListener('input', () => { visibleCount = RESULT_PAGE_SIZE; renderResults(); });
  input.addEventListener('keydown', event => {
    if (event.isComposing || copying) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!matches.length) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const next = (selectedIndex + direction + matches.length) % matches.length;
      if (next >= visibleCount) { visibleCount = Math.ceil((next + 1) / RESULT_PAGE_SIZE) * RESULT_PAGE_SIZE; renderResults(false); }
      selectIndex(next, true);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (matches[selectedIndex]) selectPrompt(matches[selectedIndex]);
    }
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('input, button')].filter(control => !control.disabled && control.getClientRects().length);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && shadow.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && shadow.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); hideSpotlight(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) hideSpotlight();
  });
  // Bubble-phase host handlers cannot intercept typing inside our shadow tree.
  for (const event of ['keydown', 'keyup', 'keypress']) dialog.addEventListener(event, e => e.stopPropagation());
}

function hideSpotlight() {
  generation += 1;
  if (!dialog?.open) return;
  dialog.close();
  prompts = [];
  matches = [];
  loaded = false;
  results.replaceChildren();
  input.value = '';
  input.removeAttribute('aria-activedescendant');
  input.setAttribute('aria-expanded', 'false');
  const target = previousFocus;
  previousFocus = null;
  if (target?.isConnected) target.focus({ preventScroll: true });
}

async function loadPrompts(token) {
  loaded = false;
  retry.hidden = true;
  status.textContent = '';
  results.setAttribute('aria-busy', 'true');
  heading.textContent = 'Loading your prompts…';
  try {
    const response = await request('getPrompts');
    if (token !== generation || !dialog.open) return;
    prompts = response.prompts;
    loaded = true;
    // Use the current query, including anything typed before the response arrived.
    renderResults();
  } catch (error) {
    if (token !== generation || !dialog.open) return;
    heading.textContent = 'Your library could not be loaded';
    results.replaceChildren();
    status.textContent = error.message;
    retry.hidden = false;
  } finally {
    if (token === generation) results.setAttribute('aria-busy', 'false');
  }
}

function showSpotlight() {
  if (!host?.isConnected) createOverlay();
  if (dialog.open) return;
  previousFocus = deepActiveElement();
  prompts = [];
  matches = [];
  selectedIndex = -1;
  visibleCount = RESULT_PAGE_SIZE;
  copying = false;
  loaded = false;
  input.value = '';
  input.removeAttribute('aria-activedescendant');
  input.setAttribute('aria-expanded', 'true');
  results.replaceChildren();
  emptyMessage.hidden = true;
  more.hidden = true;
  toast.hidden = true;
  dialog.showModal();
  input.focus({ preventScroll: true });
  loadPrompts(++generation);
}

function renderResults(resetSelection = true) {
  if (!loaded) return;
  matches = searchPrompts(prompts, input.value);
  const shown = matches.slice(0, visibleCount);
  const query = input.value.trim();
  heading.textContent = query ? `${matches.length} matching prompt${matches.length === 1 ? '' : 's'}` : `Your library · ${prompts.length} prompt${prompts.length === 1 ? '' : 's'}`;
  more.hidden = shown.length >= matches.length;
  const fragment = document.createDocumentFragment();
  emptyMessage.hidden = shown.length > 0;
  emptyMessage.textContent = prompts.length
    ? 'No matching prompts.\nTry another word or clear your search.'
    : 'Your library is empty.\nOpen Souffleur from the browser toolbar to add or import your first prompt.';
  status.textContent = '';
  for (const [index, prompt] of shown.entries()) {
    const item = node('div', 'result-item');
    item.id = `souffleur-option-${index}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', 'false');
    const title = node('div', 'result-title', prompt.title);
    title.dir = 'auto';
    const preview = node('div', 'result-preview', prompt.text.slice(0, 200).replace(/\s+/g, ' '));
    preview.dir = 'auto';
    item.append(title, preview);
    item.addEventListener('click', () => selectPrompt(prompt));
    item.addEventListener('pointermove', () => selectIndex(index));
    fragment.append(item);
  }
  results.replaceChildren(fragment);
  if (resetSelection) results.scrollTop = 0;
  selectIndex(matches.length ? resetSelection ? 0 : Math.max(0, selectedIndex) : -1);
}

function selectIndex(index, scroll = false) {
  const previous = results.children[selectedIndex];
  previous?.classList.remove('selected');
  previous?.setAttribute('aria-selected', 'false');
  selectedIndex = index;
  const current = results.children[index];
  if (!current) { input.removeAttribute('aria-activedescendant'); return; }
  current.classList.add('selected');
  current.setAttribute('aria-selected', 'true');
  input.setAttribute('aria-activedescendant', current.id);
  if (scroll) current.scrollIntoView({ block: 'nearest', behavior: 'instant' });
}

async function selectPrompt(prompt) {
  if (copying || !dialog.open) return;
  const token = generation;
  copying = true;
  status.textContent = '';
  try {
    await copyText(prompt.text, dialog);
    if (token !== generation || !dialog.open) return;
    hideSpotlight();
    toast.textContent = 'Prompt copied. Ready to paste.';
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  } catch (error) {
    if (token === generation && dialog.open) { status.textContent = error.message; input.focus(); }
  } finally { if (token === generation) copying = false; }
}

// Create no DOM and load no prompt data until the user requests Spotlight.
browserApi.runtime.onMessage.addListener((message, sender) => {
  if (sender.id !== browserApi.runtime.id || message?.action !== 'toggleSpotlight') return;
  if (dialog?.open) hideSpotlight(); else showSpotlight();
});
