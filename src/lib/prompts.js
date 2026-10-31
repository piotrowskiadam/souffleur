export const SCHEMA_VERSION = 1;
export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
export const MAX_LIBRARY_BYTES = 4 * 1024 * 1024;
export const MAX_PROMPTS = 5000;
export const MAX_TITLE_LENGTH = 1000;
export const MAX_TEXT_LENGTH = 1024 * 1024;

export const INITIAL_PROMPTS = [
  {
    id: 'tutorial-welcome',
    title: 'Welcome to Souffleur',
    text: 'Keep the prompts you use again and again in Souffleur. Open the library from the toolbar to add or edit a prompt. Use the Spotlight keyboard shortcut shown in the library to search from a webpage, then press Enter to copy. Your prompts stay on this device. Export a JSON backup to keep a separate copy or move them to another browser.',
  },
  {
    id: 'example-code-review',
    title: 'Code review',
    text: 'Act as a senior software engineer. Review the following code for correctness, security vulnerabilities, and performance problems. Prioritize actionable findings and suggest concrete improvements:\n\n[insert your code here]',
  },
];

export function byteLength(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

/** Validate the whole file before changing anything. Never silently drop entries. */
export function validatePrompts(value, { repairIds = false, createId = () => crypto.randomUUID() } = {}) {
  if (!Array.isArray(value)) throw new Error('Expected a JSON array of prompts.');
  if (value.length > MAX_PROMPTS) throw new Error(`A library can contain up to ${MAX_PROMPTS} prompts.`);
  const ids = new Set();
  const prompts = value.map((prompt, index) => {
    const location = `Prompt ${index + 1}`;
    if (!prompt || typeof prompt.title !== 'string' || typeof prompt.text !== 'string') {
      throw new Error(`${location} needs a title and text, both strings.`);
    }
    if (!prompt.title.trim() || !prompt.text.trim()) throw new Error(`${location} has an empty title or text.`);
    if (prompt.title.length > MAX_TITLE_LENGTH) throw new Error(`${location}: titles can have up to ${MAX_TITLE_LENGTH} characters.`);
    if (prompt.text.length > MAX_TEXT_LENGTH) throw new Error(`${location}: text can have up to ${MAX_TEXT_LENGTH} characters.`);
    let id = prompt.id;
    if (typeof id !== 'string' || !id || id.length > 200 || ids.has(id)) {
      if (!repairIds) throw new Error(`${location} has a missing or duplicate ID.`);
      id = createId();
      while (ids.has(id)) id = createId();
    }
    ids.add(id);
    return { id, title: prompt.title, text: prompt.text };
  });
  if (byteLength(prompts) > MAX_LIBRARY_BYTES) throw new Error('The library is larger than 4 MB. Export it and split it into smaller libraries.');
  return prompts;
}

export function parseImport(text) {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) throw new Error('Choose a JSON file smaller than 8 MB.');
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('This file is not valid JSON. Choose a Souffleur JSON export.'); }
  return validatePrompts(value, { repairIds: true });
}

function normalize(text) {
  return text.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
}

/** Every search word must occur in the title or body; library order stays stable. */
export function searchPrompts(prompts, query) {
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  if (!words.length) return prompts;
  return prompts.filter(({ title, text }) => {
    const haystack = normalize(`${title}\n${text}`);
    return words.every(word => haystack.includes(word));
  });
}

export function movePrompt(prompts, id, beforeId) {
  const current = prompts.find(prompt => prompt.id === id);
  if (!current) throw new Error('This prompt was removed in another panel.');
  if (id === beforeId) return prompts;
  const next = prompts.filter(prompt => prompt.id !== id);
  const index = beforeId === null ? next.length : next.findIndex(prompt => prompt.id === beforeId);
  if (index < 0) throw new Error('The library changed. Try moving the prompt again.');
  next.splice(index, 0, current);
  return next;
}
