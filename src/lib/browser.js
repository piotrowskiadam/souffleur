// Both supported minimum versions expose promise-based WebExtension APIs.
export const browserApi = globalThis.browser ?? globalThis.chrome;
export const isFirefox = Boolean(browserApi.sidebarAction);
