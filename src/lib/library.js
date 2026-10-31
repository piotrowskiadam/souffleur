import { INITIAL_PROMPTS, SCHEMA_VERSION, movePrompt, validatePrompts } from './prompts.js';

export const LIBRARY_KEY = 'library';

/** One owner (the background context), one queue. Failed writes never become state. */
export function createLibrary(storage) {
  let queue = Promise.resolve();
  function serialized(task) {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  }

  async function read() {
    const local = await storage.local.get(LIBRARY_KEY);
    if (local.library !== undefined) {
      const library = local.library;
      if (library?.schemaVersion !== SCHEMA_VERSION || !Number.isSafeInteger(library.revision) || library.revision < 0) {
        throw new Error('This library uses an unsupported format. Update Souffleur before editing it.');
      }
      return { ...library, prompts: validatePrompts(library.prompts) };
    }
    // An empty legacy array is intentional. Keep the original sync key as recovery.
    const legacy = await storage.sync.get('prompts');
    const prompts = validatePrompts(legacy.prompts === undefined ? INITIAL_PROMPTS : legacy.prompts, { repairIds: true });
    const library = { schemaVersion: SCHEMA_VERSION, revision: 0, prompts };
    await storage.local.set({ library });
    return library;
  }

  return {
    get: () => serialized(read),
    mutate: operation => serialized(async () => {
      const current = await read();
      let prompts = current.prompts;
      const index = prompts.findIndex(prompt => prompt.id === operation.id);
      if (['update', 'delete'].includes(operation.type)) {
        if (index < 0) throw new Error('This prompt was removed in another panel. Your draft is still here.');
        const expected = operation.expected;
        if (!expected || prompts[index].title !== expected.title || prompts[index].text !== expected.text) {
          throw new Error('This prompt changed in another panel. Copy your draft, then reopen the prompt to edit the latest version.');
        }
      }
      switch (operation.type) {
        case 'create': {
          const [prompt] = validatePrompts([operation.prompt]);
          if (prompts.some(item => item.id === prompt.id)) throw new Error('This prompt already exists.');
          prompts = operation.beforeId === undefined
            ? [prompt, ...prompts]
            : movePrompt([...prompts, prompt], prompt.id, operation.beforeId);
          break;
        }
        case 'update':
          prompts = prompts.map(prompt => prompt.id === operation.id ? { ...operation.prompt, id: operation.id } : prompt);
          break;
        case 'delete':
          prompts = prompts.filter(prompt => prompt.id !== operation.id);
          break;
        case 'move':
          prompts = movePrompt(prompts, operation.id, operation.beforeId);
          break;
        case 'import': {
          const imported = validatePrompts(operation.prompts, { repairIds: true });
          if (operation.mode === 'replace') {
            if (operation.expectedRevision !== current.revision) throw new Error('The library changed in another panel. Review it before replacing it.');
            prompts = imported;
          } else if (operation.mode === 'merge') {
            const signatures = new Set(prompts.map(prompt => JSON.stringify([prompt.title, prompt.text])));
            const additions = imported.filter(prompt => {
              const key = JSON.stringify([prompt.title, prompt.text]);
              if (signatures.has(key)) return false;
              signatures.add(key);
              return true;
            }).map(prompt => ({ ...prompt, id: crypto.randomUUID() }));
            prompts = [...prompts, ...additions];
          } else throw new Error('Choose whether to add or replace imported prompts.');
          break;
        }
        default: throw new Error('Unknown library operation.');
      }
      const library = { schemaVersion: SCHEMA_VERSION, revision: current.revision + 1, prompts: validatePrompts(prompts) };
      // Replacement and its recovery copy commit together or both fail.
      const update = { library };
      if (operation.type === 'import' && operation.mode === 'replace') update.libraryBackup = current;
      await storage.local.set(update);
      return library;
    }),
  };
}
