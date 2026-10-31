/** The fallback is needed on HTTP pages where navigator.clipboard is unavailable. */
export async function copyText(text, container = document.body) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* Try the extension-permission fallback. */ }
  }
  const focused = container.getRootNode().activeElement ?? document.activeElement;
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('aria-label', 'Copy prompt');
  Object.assign(field.style, { position: 'fixed', inset: '0 auto auto 0', opacity: '0', pointerEvents: 'none' });
  container.append(field);
  try {
    field.focus();
    field.select();
    if (!document.execCommand('copy')) throw new Error('copy rejected');
  } catch {
    throw new Error('Could not copy. Check clipboard permissions and try again.');
  } finally {
    field.remove();
    if (focused?.isConnected) focused.focus({ preventScroll: true });
  }
}
