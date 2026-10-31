import { readFile } from 'node:fs/promises';

const manifests = {};
for (const target of ['chrome', 'firefox']) {
  manifests[target] = JSON.parse(await readFile(new URL(`../../manifest.${target}.json`, import.meta.url), 'utf8'));
}
const platform = { linux: 'linux', darwin: 'mac', win32: 'windows' }[process.platform];

export const examplePrompts = [
  { id: 'review', title: 'Code review', text: 'Act as a senior software engineer. Review this code for correctness, security, and performance.\n\n[insert your code here]' },
  { id: 'writing', title: 'Improve this text', text: 'Edit the following text for clarity and precision. Preserve the original meaning and tone.\n\n[your text]' },
  { id: 'explain', title: 'Explain a concept', text: 'Explain [concept] with a concrete example, then describe the common mistakes.' },
];

function targetFor(page) {
  return page.context().browser().browserType().name() === 'firefox' ? 'firefox' : 'chrome';
}

/** Exercise the real bundled background and UI with only browser APIs replaced. */
export async function installApi(page, { prompts = examplePrompts, delay = 0 } = {}) {
  const target = targetFor(page);
  const commands = Object.entries(manifests[target].commands).map(([name, command]) => ({
    name, shortcut: command.suggested_key?.[platform] ?? command.suggested_key?.default ?? '',
  }));
  await page.addInitScript(({ seed, delay, target, commands }) => {
    const handlers = [];
    const changes = [];
    const values = {};
    let clipboard = '';
    window.__test = { failWrites: false, failReads: false, clipboardFails: false, clipboard: () => clipboard, values };
    const noEvent = { addListener() {} };
    const api = {
      runtime: {
        id: 'souffleur-test',
        getURL: path => `${location.origin}/dist/${target}/${path}`,
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
      commands: { onCommand: noEvent, getAll: async () => commands },
    };
    if (target === 'firefox') {
      api.sidebarAction = { toggle: async () => {} };
      api.action = { onClicked: noEvent };
      window.browser = api;
    } else {
      api.sidePanel = { setPanelBehavior: async () => {} };
      window.chrome = api;
    }
    window.__toggle = () => {
      for (const handler of handlers) handler({ action: 'toggleSpotlight' }, { id: api.runtime.id }, () => {});
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => {
      if (window.__test.clipboardFails) throw new Error('Clipboard blocked');
      clipboard = text;
    } } });
    document.execCommand = () => false;
  }, { seed: prompts, delay, target, commands });
}

export async function panel(page, options) {
  const target = targetFor(page);
  await installApi(page, options);
  // Delay the entry script until the actual bundled background has been installed.
  await page.route('**/sidebar/sidebar.js', route => route.fulfill({ body: '', contentType: 'text/javascript' }));
  await page.goto(`/dist/${target}/sidebar/sidebar.html`);
  await page.addScriptTag({ url: `/dist/${target}/background.js` });
  await page.addScriptTag({ content: await (await page.request.get(`/dist/${target}/sidebar/sidebar.js`)).text() });
  await page.locator('#add-prompt-btn').waitFor();
}

export async function spotlight(page, options) {
  const target = targetFor(page);
  await installApi(page, options);
  await page.goto('/tests/fixture.html');
  await page.addScriptTag({ url: `/dist/${target}/background.js` });
  await page.addScriptTag({ url: `/dist/${target}/content.js` });
  await page.locator('#chat').focus();
  await page.evaluate(() => window.__toggle());
  await page.getByRole('combobox', { name: 'Search prompts' }).waitFor();
}
