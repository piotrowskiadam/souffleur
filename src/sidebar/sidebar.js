import { browserApi } from '../lib/browser.js';
import { request } from '../lib/client.js';
import { copyText } from '../lib/clipboard.js';
import { MAX_IMPORT_BYTES, parseImport, searchPrompts } from '../lib/prompts.js';

const $ = id => document.getElementById(id);
const PAGE_SIZE = 50;
let prompts = [];
let revision = -1;
let ready = false;
let busy = false;
let visibleCount = PAGE_SIZE;
let editing = null;
let undo = null;
let pendingImport = null;
let draggedId = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, className, action, accessibleLabel = label) {
  const node = element('button', className, label);
  node.type = 'button';
  node.setAttribute('aria-label', accessibleLabel);
  node.addEventListener('click', action);
  return node;
}

function feedback(message, { error = false, canUndo = false } = {}) {
  $('feedback').hidden = false;
  $('feedback').dataset.error = String(error);
  $('status-message').textContent = message;
  $('undo-delete').hidden = !canUndo;
}

function updateControls() {
  for (const id of ['add-prompt-btn', 'import-prompts', 'export-prompts']) $(id).disabled = busy || !ready;
  for (const node of $('prompt-list').querySelectorAll('button')) node.disabled = busy || node.dataset.boundary === 'true';
  $('library-search').disabled = !ready;
  $('save-prompt').disabled = busy;
  $('cancel-edit').disabled = busy;
  $('prompt-editor').setAttribute('aria-busy', String(busy));
}

function applyState(state) {
  if (state.revision < revision) return;
  prompts = state.prompts;
  revision = state.revision;
  ready = true;
  $('load-error').hidden = true;
  $('prompt-list').setAttribute('aria-busy', 'false');
  renderPrompts();
  updateControls();
}

async function loadPrompts() {
  $('retry-load').disabled = true;
  try { applyState(await request('getPrompts')); }
  catch (error) {
    $('load-error').hidden = false;
    $('load-error-text').textContent = error.message;
    $('prompt-count').textContent = 'Your library could not be loaded.';
    $('prompt-list').setAttribute('aria-busy', 'false');
  } finally { $('retry-load').disabled = false; }
}

async function mutate(operation) {
  if (busy) throw new Error('A save is already in progress. Try again when it finishes.');
  busy = true;
  updateControls();
  try {
    const state = await request('mutateLibrary', { operation });
    applyState(state);
    return state;
  } finally {
    busy = false;
    updateControls();
  }
}

function focusPrompt(id, selector = '.edit-btn') {
  const row = [...$('prompt-list').children].find(node => node.dataset.id === id);
  (row?.querySelector(selector) ?? $('add-prompt-btn')).focus({ preventScroll: true });
}

function renderPrompts() {
  const focused = document.activeElement;
  const focusedId = focused?.closest('.prompt-item')?.dataset.id;
  const action = focused?.dataset.action;
  const filtered = searchPrompts(prompts, $('library-search').value);
  const query = $('library-search').value.trim();
  const shown = filtered.slice(0, visibleCount);
  $('prompt-count').textContent = query
    ? `${filtered.length} of ${prompts.length} prompts match`
    : `${prompts.length} prompt${prompts.length === 1 ? '' : 's'} · saved on this device`;
  $('show-more').hidden = shown.length >= filtered.length;
  const fragment = document.createDocumentFragment();
  if (!filtered.length) {
    const empty = element('li', 'empty-state');
    empty.setAttribute('role', 'listitem');
    empty.append(element('h3', '', query ? 'No matching prompts' : 'Make room for your next idea.'), element('p', '', query ? 'Try another word, or clear your search to see the library.' : 'Save a prompt you use often, then find it instantly from Spotlight.'));
    empty.append(query ? button('Clear search', '', () => { $('library-search').value = ''; renderPrompts(); $('library-search').focus(); }) : button('Create your first prompt', 'primary', () => openEditor()));
    fragment.append(empty);
  }
  for (const prompt of shown) {
    const index = prompts.findIndex(item => item.id === prompt.id);
    const row = element('li', 'prompt-item');
    row.dataset.id = prompt.id;
    row.setAttribute('role', 'listitem');
    const title = element('h3', '', prompt.title);
    title.dir = 'auto';
    const preview = element('p', 'prompt-preview', prompt.text.slice(0, 300));
    preview.dir = 'auto';
    const actions = element('div', 'prompt-buttons');
    const copy = button('Copy', 'copy-btn', async () => {
      copy.disabled = true;
      try { await copyText(prompt.text); feedback(`Copied “${prompt.title}”.`); }
      catch (error) { feedback(error.message, { error: true }); }
      finally { copy.disabled = false; }
    }, `Copy ${prompt.title}`);
    const edit = button('Edit', 'edit-btn', () => openEditor(prompt), `Edit ${prompt.title}`);
    edit.dataset.action = 'edit';
    const more = element('details', 'more-actions');
    const summary = element('summary', '', 'More');
    summary.setAttribute('aria-label', `More actions for ${prompt.title}`);
    const menu = element('div', 'action-menu');
    const up = button('Move up', '', () => reorder(prompt.id, prompts[index - 1]?.id), `Move ${prompt.title} up`);
    up.dataset.boundary = String(index === 0);
    up.disabled = index === 0 || busy;
    const down = button('Move down', '', () => reorder(prompt.id, prompts[index + 2]?.id ?? null), `Move ${prompt.title} down`);
    down.dataset.boundary = String(index === prompts.length - 1);
    down.disabled = index === prompts.length - 1 || busy;
    menu.append(up, down, button('Delete prompt', 'delete-btn', () => deletePrompt(prompt), `Delete ${prompt.title}`));
    more.append(summary, menu);
    more.addEventListener('toggle', () => {
      if (more.open) for (const other of $('prompt-list').querySelectorAll('details')) if (other !== more) other.open = false;
    });
    actions.append(copy, edit, more);
    row.append(title, preview, actions);
    row.addEventListener('keydown', event => {
      if (event.key === 'Escape' && more.open) { more.open = false; summary.focus(); event.stopPropagation(); }
    });
    // Pointer users can drag the title; move actions give keyboard users parity.
    title.draggable = !query && !busy;
    title.title = query ? '' : 'Drag to reorder, or use More → Move up / Move down';
    title.addEventListener('dragstart', event => {
      if (busy) { event.preventDefault(); return; }
      draggedId = prompt.id;
      event.dataTransfer.setData('text/plain', prompt.id);
      event.dataTransfer.effectAllowed = 'move';
      row.classList.add('dragging');
    });
    title.addEventListener('dragend', clearDrag);
    fragment.append(row);
  }
  $('prompt-list').replaceChildren(fragment);
  if (focusedId && action === 'edit') focusPrompt(focusedId);
}

function draftChanged() {
  if ($('prompt-editor').hidden) return false;
  return $('prompt-title').value !== (editing?.title ?? '') || $('prompt-text').value !== (editing?.text ?? '');
}

function openEditor(prompt = null) {
  if (busy || (! $('prompt-editor').hidden && draftChanged() && !confirm('Discard the current draft and open another prompt?'))) return;
  editing = prompt ? { ...prompt } : null;
  $('editor-heading').textContent = prompt ? 'Edit prompt' : 'New prompt';
  $('prompt-title').value = prompt?.title ?? '';
  $('prompt-text').value = prompt?.text ?? '';
  $('editor-error').textContent = '';
  $('prompt-editor').hidden = false;
  $('prompt-title').focus();
}

function closeEditor() {
  const id = editing?.id;
  $('prompt-editor').hidden = true;
  $('prompt-title').value = '';
  $('prompt-text').value = '';
  editing = null;
  if (id) focusPrompt(id); else $('add-prompt-btn').focus();
}

async function savePrompt(event) {
  event.preventDefault();
  if (busy) return;
  const title = $('prompt-title').value.trim();
  // Whitespace can be meaningful in a reusable prompt. Only validate its presence.
  const text = $('prompt-text').value;
  if (!title || !text.trim()) { $('editor-error').textContent = 'Enter a title and some prompt text.'; return; }
  const prompt = { id: editing?.id ?? crypto.randomUUID(), title, text };
  const operation = editing ? { type: 'update', id: editing.id, expected: editing, prompt } : { type: 'create', prompt };
  $('editor-error').textContent = '';
  $('save-prompt').textContent = 'Saving…';
  try {
    await mutate(operation);
    closeEditor();
    feedback('Prompt saved. Ready in Spotlight.');
  } catch (error) { $('editor-error').textContent = error.message; }
  finally { $('save-prompt').textContent = 'Save prompt'; }
}

async function deletePrompt(prompt) {
  if (busy) return;
  const index = prompts.findIndex(item => item.id === prompt.id);
  const beforeId = prompts[index + 1]?.id ?? null;
  try {
    await mutate({ type: 'delete', id: prompt.id, expected: prompt });
    undo = { prompt, beforeId };
    feedback(`Deleted “${prompt.title}”.`, { canUndo: true });
    $('undo-delete').focus();
  } catch (error) { feedback(error.message, { error: true }); }
}

async function reorder(id, beforeId) {
  if (busy || beforeId === undefined) return;
  try { await mutate({ type: 'move', id, beforeId }); focusPrompt(id); feedback('Prompt order updated.'); }
  catch (error) { renderPrompts(); feedback(error.message, { error: true }); }
}

function clearDrag() {
  draggedId = null;
  for (const item of $('prompt-list').children) item.classList.remove('dragging', 'drop-target');
}

function exportJson(data, name = 'souffleur_prompts') {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = element('a');
  link.href = url;
  link.download = `${name}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function prepareImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > MAX_IMPORT_BYTES) throw new Error('Choose a JSON file smaller than 8 MB.');
    // Replacement must use the library revision the user actually reviewed.
    pendingImport = { prompts: parseImport(await file.text()), revision };
    const count = pendingImport.prompts.length;
    $('import-description').textContent = `${count} prompt${count === 1 ? '' : 's'} ready from “${file.name}”. Your library has ${prompts.length}.`;
    document.querySelector('[name="import-mode"][value="merge"]').checked = true;
    $('import-error').textContent = '';
    $('import-dialog').showModal();
  } catch (error) { feedback(error.message, { error: true }); }
  finally { event.target.value = ''; }
}

async function confirmImport() {
  if (!pendingImport || busy) return;
  const mode = document.querySelector('[name="import-mode"]:checked').value;
  const count = prompts.length;
  $('confirm-import').disabled = true;
  $('cancel-import').disabled = true;
  $('confirm-import').textContent = 'Importing…';
  try {
    const state = await mutate({ type: 'import', mode, prompts: pendingImport.prompts, expectedRevision: pendingImport.revision });
    pendingImport = null;
    $('import-dialog').close();
    $('recover-backup').hidden = mode !== 'replace' && $('recover-backup').hidden;
    $('library-search').value = '';
    visibleCount = PAGE_SIZE;
    renderPrompts();
    feedback(mode === 'merge' ? `Added ${state.prompts.length - count} prompts. Exact duplicates were skipped.` : 'Library replaced. A pre-import backup is available under Shortcuts & storage.');
  } catch (error) { $('import-error').textContent = error.message; }
  finally {
    $('confirm-import').disabled = false;
    $('cancel-import').disabled = false;
    $('confirm-import').textContent = 'Import prompts';
  }
}

$('add-prompt-btn').addEventListener('click', () => openEditor());
$('cancel-edit').addEventListener('click', closeEditor);
$('prompt-editor').addEventListener('submit', savePrompt);
$('prompt-editor').addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); $('prompt-editor').requestSubmit(); }
  if (event.key === 'Escape' && !busy) { event.preventDefault(); closeEditor(); }
});
$('library-search').addEventListener('input', () => { visibleCount = PAGE_SIZE; renderPrompts(); });
$('show-more').addEventListener('click', () => {
  visibleCount += PAGE_SIZE;
  renderPrompts();
  const firstNew = $('prompt-list').children[visibleCount - PAGE_SIZE];
  firstNew?.querySelector('button')?.focus();
});
$('retry-load').addEventListener('click', loadPrompts);
$('import-prompts').addEventListener('click', () => {
  if (draftChanged()) { feedback('Save or cancel your draft before importing.', { error: true }); return; }
  $('import-file').click();
});
$('import-file').addEventListener('change', prepareImport);
$('confirm-import').addEventListener('click', confirmImport);
$('import-dialog').addEventListener('cancel', event => { if (busy) event.preventDefault(); });
$('import-dialog').addEventListener('close', () => { pendingImport = null; });
$('export-prompts').addEventListener('click', () => { exportJson(prompts); feedback('JSON export started. Keep the file somewhere safe.'); });
$('recover-backup').addEventListener('click', async () => {
  try {
    const { libraryBackup } = await browserApi.storage.local.get('libraryBackup');
    if (!libraryBackup) throw new Error('No pre-import backup is available.');
    exportJson(libraryBackup.prompts, 'souffleur_recovery');
    feedback('Recovery export started. Import it to restore the previous library.');
  } catch (error) { feedback(error.message, { error: true }); }
});
$('dismiss-feedback').addEventListener('click', () => { $('feedback').hidden = true; undo = null; });
$('undo-delete').addEventListener('click', async () => {
  if (!undo || busy) return;
  const { prompt, beforeId } = undo;
  try {
    await mutate({ type: 'create', prompt, beforeId: prompts.some(item => item.id === beforeId) ? beforeId : null });
    undo = null;
    feedback('Prompt restored.');
    focusPrompt(prompt.id);
  } catch (error) { feedback(error.message, { error: true, canUndo: true }); }
});
$('prompt-list').addEventListener('dragover', event => {
  if (!draggedId || busy || $('library-search').value.trim()) return;
  const row = event.target.closest('.prompt-item');
  if (!row || row.dataset.id === draggedId) return;
  event.preventDefault();
  for (const item of $('prompt-list').children) item.classList.toggle('drop-target', item === row);
});
$('prompt-list').addEventListener('drop', event => {
  if (!draggedId || busy) return;
  const row = event.target.closest('.prompt-item');
  if (!row) return;
  event.preventDefault();
  const after = event.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2;
  const index = prompts.findIndex(prompt => prompt.id === row.dataset.id);
  const beforeId = after ? prompts[index + 1]?.id ?? null : row.dataset.id;
  const id = draggedId;
  clearDrag();
  reorder(id, beforeId);
});
window.addEventListener('beforeunload', event => { if (draftChanged()) { event.preventDefault(); event.returnValue = ''; } });
browserApi.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.library?.newValue) applyState(changes.library.newValue);
  if (area === 'local' && changes.libraryBackup) $('recover-backup').hidden = !changes.libraryBackup.newValue;
});
browserApi.commands.getAll().then(commands => {
  const shortcut = commands.find(command => command.name === 'toggle_spotlight')?.shortcut;
  $('spotlight-shortcut').textContent = shortcut || 'Set a shortcut';
}).catch(() => { $('spotlight-shortcut').textContent = 'Browser shortcut'; });
browserApi.storage.local.get('libraryBackup').then(result => { $('recover-backup').hidden = !result.libraryBackup; }).catch(() => {});
loadPrompts();
