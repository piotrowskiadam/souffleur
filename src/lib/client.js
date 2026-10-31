import { browserApi } from './browser.js';

export async function request(action, payload = {}) {
  let response;
  try { response = await browserApi.runtime.sendMessage({ action, ...payload }); }
  catch { throw new Error('Souffleur could not connect. Reload this page after updating the extension and try again.'); }
  if (!response || response.error) throw new Error(response?.error || 'Souffleur did not respond. Close and reopen the panel to try again.');
  return response;
}
