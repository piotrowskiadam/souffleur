import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const { outputFiles } = await build({ entryPoints: ['src/background.js'], bundle: true, write: false, format: 'iife' });
const source = outputFiles[0].text;

function background(firefox = false) {
  let onMessage;
  let onCommand;
  let clicked;
  let panelOptions;
  let toggles = 0;
  const data = {};
  const api = {
    runtime: {
      id: 'test-id', getURL: path => `extension://test-id/${path}`,
      onMessage: { addListener: listener => { onMessage = listener; } },
      onInstalled: { addListener() {} },
    },
    storage: {
      sync: { get: async () => ({ prompts: [] }) },
      local: { get: async () => structuredClone(data), set: async update => Object.assign(data, structuredClone(update)), setAccessLevel: async () => {} },
    },
    commands: { onCommand: { addListener: listener => { onCommand = listener; } } },
    sidePanel: { setPanelBehavior: async () => {}, open: async options => { panelOptions = options; } },
    windows: { WINDOW_ID_CURRENT: -2 },
    action: { onClicked: { addListener: listener => { clicked = listener; } } },
  };
  if (firefox) api.sidebarAction = { toggle: async () => { toggles++; } };
  runInNewContext(source, { chrome: api, ...(firefox ? { browser: api } : {}), console, TextEncoder, crypto });
  return {
    data,
    handler: () => onMessage,
    send: (message, sender) => new Promise(resolve => onMessage(message, sender, resolve)),
    command: (...args) => onCommand(...args),
    click: () => clicked(),
    options: () => panelOptions,
    toggles: () => toggles,
  };
}

const panelSender = { id: 'test-id', url: 'extension://test-id/sidebar/sidebar.html' };
const prompt = { id: 'new', title: 'Private', text: 'Literal text' };

test('content scripts can read but cannot mutate; panel can mutate', async () => {
  const bg = background();
  const contentSender = { id: 'test-id', tab: { id: 1 }, url: 'https://example.org/' };
  assert.equal(bg.handler()({ action: 'mutateLibrary', operation: { type: 'create', prompt } }, contentSender, () => assert.fail('unauthorized response')), undefined);
  assert.equal((await bg.send({ action: 'getPrompts' }, contentSender)).prompts.length, 0);
  const result = await bg.send({ action: 'mutateLibrary', operation: { type: 'create', prompt } }, panelSender);
  assert.equal(result.prompts[0].id, 'new');
});

test('foreign senders and lookalike extension URLs are rejected', () => {
  const bg = background();
  for (const sender of [{ ...panelSender, id: 'foreign' }, { ...panelSender, url: `${panelSender.url}/evil` }, { ...panelSender, url: 'https://example.org/sidebar/sidebar.html' }]) {
    assert.equal(bg.handler()({ action: 'mutateLibrary', operation: { type: 'create', prompt } }, sender, () => assert.fail('unauthorized response')), undefined);
  }
});

test('Chrome side panel opens immediately with the command window context', () => {
  const bg = background();
  bg.command('toggle_sidebar', { windowId: 7 });
  assert.equal(bg.options().windowId, 7);
});

test('Firefox command and toolbar use sidebarAction', () => {
  const bg = background(true);
  bg.command('toggle_sidebar', { windowId: 7 });
  bg.click();
  assert.equal(bg.toggles(), 2);
  assert.equal(bg.options(), undefined);
});
