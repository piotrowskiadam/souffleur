export const examplePrompts = [
  { id: 'review', title: 'Code review', text: 'Act as a senior software engineer. Review this code for correctness, security, and performance.\n\n[insert your code here]' },
  { id: 'writing', title: 'Improve this text', text: 'Edit the following text for clarity and precision. Preserve the original meaning and tone.\n\n[your text]' },
  { id: 'explain', title: 'Explain a concept', text: 'Explain [concept] with a concrete example, then describe the common mistakes.' },
];

/** Exercise the real bundled background and UI with only browser APIs replaced. */
export async function installApi(page, { prompts = examplePrompts, delay = 0 } = {}) {
  await page.addInitScript(({ seed, delay }) => {
    const handlers = [];
    const changes = [];
    const values = {};
    let clipboard = '';
    window.__test = { failWrites: false, failReads: false, clipboardFails: false, clipboard: () => clipboard, values };
    const noEvent = { addListener() {} };
    const api = {
      runtime: {
        id: 'souffleur-test',
        getURL: path => `${location.origin}/dist/chrome/${path}`,
        onInstalled: noEvent,
        onMessage: { addListener: handler => handlers.push(handler) },
        sendMessage: message => new Promise((resolve, reject) => {
          const sender = { id: 'souffleur-test', url: location.href };
          for (const handler of handlers) {
            if (handler(message, sender, value => resolve(value)) === true) return;
          }
          reject(new Error('No background listener'));
        }),
      },
      storage: {
        sync: { get: async () => ({ prompts: seed }) },
        local: {
          setAccessLevel: async () => {},
          get: async () => {
            if (delay) await new Promise(resolve => setTimeout(resolve, delay));
            if (window.__test.failReads) throw new Error('Could not read local storage.');
            return structuredClone(values);
          },
          set: async update => {
            if (window.__test.failWrites) throw new Error('Storage quota exceeded. Export a backup and free some space.');
            const diff = {};
            for (const [key, value] of Object.entries(update)) diff[key] = { oldValue: values[key], newValue: structuredClone(value) };
            Object.assign(values, structuredClone(update));
            for (const listener of changes) listener(diff, 'local');
          },
        },
        onChanged: { addListener: listener => changes.push(listener) },
      },
      commands: { onCommand: noEvent, getAll: async () => [{ name: 'toggle_spotlight', shortcut: 'Ctrl+Shift+U' }] },
      sidePanel: { setPanelBehavior: async () => {} },
    };
    window.chrome = api;
    window.__toggle = () => {
      for (const handler of handlers) handler({ action: 'toggleSpotlight' }, { id: api.runtime.id }, () => {});
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => {
      if (window.__test.clipboardFails) throw new Error('Clipboard blocked');
      clipboard = text;
    } } });
    document.execCommand = () => false;
  }, { seed: prompts, delay });
}

export async function panel(page, options) {
  await installApi(page, options);
  // Delay the entry script until the actual bundled background has been installed.
  await page.route('**/sidebar/sidebar.js', route => route.fulfill({ body: '', contentType: 'text/javascript' }));
  await page.goto('/dist/chrome/sidebar/sidebar.html');
  await page.addScriptTag({ url: '/dist/chrome/background.js' });
  await page.addScriptTag({ content: await (await page.request.get('/dist/chrome/sidebar/sidebar.js')).text() });
  await page.locator('#add-prompt-btn').waitFor();
}

export async function spotlight(page, options) {
  await installApi(page, options);
  await page.goto('/tests/fixture.html');
  await page.addScriptTag({ url: '/dist/chrome/background.js' });
  await page.addScriptTag({ url: '/dist/chrome/content.js' });
  await page.locator('#chat').focus();
  await page.evaluate(() => window.__toggle());
  await page.getByRole('combobox', { name: 'Search prompts' }).waitFor();
}
