console.log("Souffleur Background Service Worker starting...");

// Default prompts to initialize storage with on first install.
const INITIAL_PROMPTS = [
  { id: "1", title: "Greeting", text: "Hello, how are you?" },
  { id: "2", title: "Task Request", text: "Can you help me with a task?" },
];

const isFirefox = typeof browser !== 'undefined' && typeof browser.sidebarAction !== 'undefined';

/**
 * Initializes storage with default prompts if none exist.
 * Also sets up the Chrome side panel behavior on install/update.
 * @param {object} details - Information about the installation or update event.
 */
function handleInstallOrUpdate(details) {
  console.log("Extension installed or updated:", details.reason);

  if (details.reason === "install") {
    console.log("Performing first-time storage initialization...");
    chrome.storage.sync.get("prompts")
      .then((result) => {
        if (!result.prompts || result.prompts.length === 0) {
          console.log("No prompts found or empty array, initializing with default prompts:", INITIAL_PROMPTS);
          return chrome.storage.sync.set({ prompts: INITIAL_PROMPTS });
        } else {
          console.log("Existing prompts found in storage:", result.prompts);
        }
      })
      .then(() => {
        console.log("Storage initialization complete.");
      })
      .catch((error) => {
        console.error("Error during storage initialization:", error);
      });
  }

  // Setup Chrome Side Panel Behavior (Run on install/update)
  if (!isFirefox && typeof chrome !== 'undefined' && chrome.sidePanel) {
    console.log("Setting up Chrome side panel behavior...");
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .then(() => console.log("Successfully set side panel behavior for action click."))
      .catch((error) => console.error("Error setting side panel behavior:", error));
  }
}

/**
 * Handles incoming messages from content scripts or other extension pages.
 * @param {object} request - The message payload.
 * @param {object} sender - Information about the message sender.
 * @param {function} sendResponse - Callback function to send a response asynchronously.
 * @returns {boolean|undefined} Returns true if sendResponse will be called asynchronously.
 */
function handleMessage(request, sender, sendResponse) {
  console.log("Message received in background:", request);

  if (request.action === "getPrompts") {
    console.log("Handling getPrompts request from storage.sync...");
    chrome.storage.sync.get("prompts")
      .then((result) => {
        sendResponse({ prompts: result.prompts || [] });
      })
      .catch((error) => {
        console.error("Error retrieving prompts:", error);
        sendResponse({ prompts: [], error: error.message });
      });
    return true; // Keep message channel open for asynchronous response
  }
}

/**
 * Handles keyboard shortcut commands.
 * Tries to toggle the Firefox sidebar or open the Chrome side panel.
 * @param {string} windowId - The ID of the window where the command was triggered.
 */
async function handleCommandToggle(windowId) {
  try {
    if (isFirefox) {
      console.log("Toggling Firefox sidebar via command.");
      await browser.sidebarAction.toggle();
    } else if (typeof chrome !== 'undefined' && chrome.sidePanel) {
      console.log(`Attempting to open Chrome side panel via command for window: ${windowId}`);
      if (windowId) {
        await chrome.sidePanel.open({ windowId });
      } else {
        await chrome.sidePanel.open({});
      }
    }
  } catch (error) {
    console.error("Error handling command toggle:", error);
  }
}

/**
 * Handles keyboard shortcut commands defined in the manifest.
 * @param {string} command - The name of the command that was triggered.
 * @param {object} tab - Information about the tab where the command was triggered.
 */
function handleCommand(command, tab) {
  console.log(`BACKGROUND: Command received: ${command}`);

  if (command === "toggle_sidebar") {
    handleCommandToggle(tab.windowId);
  }

  if (command === "toggle_spotlight") {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0] && tabs[0].id) {
        const tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, { action: "toggleSpotlight" })
          .catch(error => console.error(`Error sending toggleSpotlight message to tab ${tabId}:`, error));
      } else {
        console.error("Could not find active tab to send message.");
      }
    }).catch(error => console.error("Error querying tabs:", error));
  }
}

// --- Register Listeners ---
chrome.runtime.onInstalled.addListener(handleInstallOrUpdate);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.commands.onCommand.addListener(handleCommand);

// Firefox-specific listener: Toggle sidebar when extension action toolbar button is clicked
if (isFirefox) {
  browser.action.onClicked.addListener(() => {
    browser.sidebarAction.toggle().catch((err) => console.error("Error toggling sidebar on action click:", err));
  });
}

console.log("Background script setup complete. Listening for events.");
