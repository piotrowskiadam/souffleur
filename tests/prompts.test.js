import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_IMPORT_BYTES, MAX_LIBRARY_BYTES, MAX_TEXT_LENGTH, byteLength, MAX_PROMPTS, MAX_TITLE_LENGTH, movePrompt, parseImport, searchPrompts, validatePrompts } from '../src/lib/prompts.js';

const a = { id: 'a', title: 'Résumé review', text: '  Review café code.\n\nKeep whitespace.  ' };
const b = { id: 'b', title: '説明', text: '🙂 مرحبا 世界' };

test('validation preserves literal HTML, Unicode, and meaningful whitespace', () => {
  const value = { ...a, title: '<img src=x onerror=alert(1)>', text: '</textarea><script>bad()</script>\n  ' };
  assert.deepEqual(validatePrompts([value]), [value]);
  assert.deepEqual(parseImport(JSON.stringify([a, b])), [a, b]);
});

test('legacy exports without IDs and duplicate IDs receive distinct IDs', () => {
  const result = parseImport(JSON.stringify([{ title: a.title, text: a.text }, a, a]));
  assert.equal(new Set(result.map(p => p.id)).size, 3);
  assert.equal(result[1].id, 'a');
});

test('an invalid import fails entirely instead of dropping entries', () => {
  for (const bad of [null, {}, [a, null], [a, { title: 'Bad', text: 42 }], [{ ...a, text: '  ' }], [{ ...a, title: '' }]]) {
    assert.throws(() => parseImport(JSON.stringify(bad)));
  }
  assert.throws(() => parseImport('{'), /not valid JSON/);
  assert.throws(() => validatePrompts([a, a]), /duplicate ID/);
});

test('import limits bound parsing, record count and title length', () => {
  assert.throws(() => parseImport(' '.repeat(MAX_IMPORT_BYTES + 1)), /smaller than 8 MB/);
  assert.throws(() => validatePrompts(Array(MAX_PROMPTS + 1).fill(a)), /up to 5000/);
  assert.throws(() => validatePrompts([{ ...a, title: 'a'.repeat(MAX_TITLE_LENGTH + 1) }]), /titles can have/);
});

test('search matches every word across title and text, ignores accents and preserves order', () => {
  assert.deepEqual(searchPrompts([a, b], 'review CAFE'), [a]);
  assert.deepEqual(searchPrompts([a, b], 'resume'), [a]);
  assert.deepEqual(searchPrompts([a, b], '世界 🙂'), [b]);
  assert.deepEqual(searchPrompts([a, b], '   '), [a, b]);
  assert.deepEqual(searchPrompts([a, b], 'missing review'), []);
});

test('reordering uses stable IDs and does not mutate its input', () => {
  const original = [a, b];
  assert.deepEqual(movePrompt(original, 'b', 'a'), [b, a]);
  assert.deepEqual(movePrompt(original, 'a', null), [b, a]);
  assert.deepEqual(original, [a, b]);
  assert.throws(() => movePrompt(original, 'missing', null), /removed/);
  assert.throws(() => movePrompt(original, 'a', 'missing'), /library changed/);
});


test('a formatted export near the library byte limit can be imported again', () => {
  const base = Array.from({ length: 4 }, (_, index) => ({ id: String(index), title: 'Large prompt', text: 'x'.repeat(MAX_TEXT_LENGTH - 1000) }));
  const last = { id: 'last', title: 'Last prompt', text: '' };
  last.text = 'y'.repeat(MAX_LIBRARY_BYTES - byteLength([...base, last]) - 8);
  const library = validatePrompts([...base, last]);
  const exported = JSON.stringify(library, null, 2);
  assert.ok(new TextEncoder().encode(exported).byteLength > MAX_LIBRARY_BYTES);
  assert.deepEqual(parseImport(exported), library);
});
