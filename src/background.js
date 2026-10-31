import { browserApi, isFirefox } from './lib/browser.js';
import { createLibrary } from './lib/library.js';

const library = createLibrary(browserApi.storage);
// Content scripts use messaging, rather than reading extension storage directly.
browserApi.storage.local.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' })
  .catch(error => console.error('Souffleur storage access:', error.message));

function configureSidePanel() {
  browserApi.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(error => console.error('Souffleur side panel:', error.message));
}

browserApi.runtime.onInstalled.addListener(() => {
  library.get().catch(error => console.error('Souffleur initialization:', error.message));
  configureSidePanel();
});
configureSidePanel();

browserApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== browserApi.runtime.id || !message || typeof message !== 'object') return;
  const panelUrl = browserApi.runtime.getURL('sidebar/sidebar.html');
  const fromPanel = sender.url?.split(/[?#]/)[0] === panelUrl;
  let task;
  if (message.action === 'getPrompts') task = library.get().then(state => ({ prompts: state.prompts, revision: state.revision }));
  // Only our extension page may mutate the library; content scripts are read-only.
  if (message.action === 'mutateLibrary' && fromPanel && message.operation) {
    task = library.mutate(message.operation).then(state => ({ prompts: state.prompts, revision: state.revision }));
  }
  if (!task) return;
  task.then(sendResponse, error => sendResponse({ error: error.message }));
  return true; // Compatible callback response for Chrome workers and Firefox backgrounds.
});

async function toggleSpotlight(tab) {
  const active = tab?.id ? tab : (await browserApi.tabs.query({ active: true, currentWindow: true }))[0];
  if (!active?.id) return;
  try {
    await browserApi.tabs.sendMessage(active.id, { action: 'toggleSpotlight' });
    await browserApi.action.setBadgeText({ text: '', tabId: active.id });
    await browserApi.action.setTitle({ title: 'Open Souffleur prompt library', tabId: active.id });
  } catch {
    await browserApi.action.setBadgeText({ text: '!', tabId: active.id });
    await browserApi.action.setTitle({ title: 'Spotlight is unavailable here. Open a regular webpage or reload it after an update.', tabId: active.id });
  }
}

browserApi.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle_spotlight') {
    toggleSpotlight(tab).catch(error => console.error('Souffleur Spotlight:', error.message));
  } else if (command === 'toggle_sidebar') {
    // Invoke directly in the command callback to retain the browser user gesture.
    const task = isFirefox
      ? browserApi.sidebarAction.toggle()
      : browserApi.sidePanel.open(tab?.windowId !== undefined ? { windowId: tab.windowId } : { windowId: browserApi.windows.WINDOW_ID_CURRENT });
    task.catch(error => console.error('Souffleur panel:', error.message));
  }
});

if (isFirefox) {
  browserApi.action.onClicked.addListener(() => {
    browserApi.sidebarAction.toggle().catch(error => console.error('Souffleur panel:', error.message));
  });
}
