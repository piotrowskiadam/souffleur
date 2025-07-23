// Note: This script runs as a non-persistent background script in Firefox MV3,
// even though declared as "scripts" in manifest.json.
console.log("Background Script starting (Firefox)...");

// Default prompts to initialize storage with on first install.
const INITIAL_PROMPTS = [
  { id: "1", title: "Greeting", text: "Hello, how are you?" },
  { id: "2", title: "Task Request", text: "Can you help me with a task?" },
];

/**
 * Initializes storage with default prompts if none exist.
 * @param {object} details - Information about the installation or update event.
 */
function handleInstallOrUpdate(details) {
  console.log("Extension installed or updated:", details.reason);

  // Initialize storage only on first install
  if (details.reason === "install") {
    console.log("Performing first-time storage initialization...");
    // Use chrome.storage, which Firefox supports via the 'browser' namespace internally
    // or directly if using polyfill/browser namespace. Sticking to chrome.* for consistency.
    console.log("Checking for existing prompts in storage...");
    chrome.storage.local.get("prompts")
      .then((result) => {
        console.log("Storage get result:", result);
        if (!result.prompts || result.prompts.length === 0) {
          console.log("No prompts found or empty array, initializing with default prompts:", INITIAL_PROMPTS);
          return chrome.storage.local.set({ prompts: INITIAL_PROMPTS });
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

  // No side panel setup needed for Firefox
}

/**
 * Handles incoming messages from content scripts or other extension pages.
 * @param {object} request - The message payload.
 * @param {object} sender - Information about the message sender.
 * @param {function} sendResponse - Callback function to send a response asynchronously.
 * @returns {boolean|undefined} Returns true if sendResponse will be called asynchronously.
 */
function handleMessage(request, sender, sendResponse) {
  console.log("Message received in background script:", request);

  if (request.action === "getPrompts") {
    console.log("Handling getPrompts request...");
    chrome.storage.local.get("prompts")
      .then((result) => {
        console.log("Successfully retrieved prompts from storage:", result.prompts);
        sendResponse({ prompts: result.prompts || [] }); // Use sendResponse callback
      })
      .catch((error) => {
        console.error("Error retrieving prompts:", error);
        sendResponse({ prompts: [], error: error.message }); // Use sendResponse callback on error
      });
    // Return true to indicate an asynchronous response will be sent.
    return true;
  }

  // Handle other potential message types here if needed

  // If no async response is needed for this message type, return false or undefined implicitly.
}

/**
 * Handles keyboard shortcut commands.
 * Primarily toggles the Firefox sidebar.
 * @param {string} windowId - The ID of the window where the command was triggered (passed by listener, but not used directly for sidebarAction).
 */
async function handleCommandToggle(windowId) { // windowId might not be needed here but kept for consistency
  try {
    // Check specifically for Firefox's sidebarAction API
    if (typeof browser !== 'undefined' && browser.sidebarAction) {
      console.log("Toggling Firefox sidebar via command.");
      await browser.sidebarAction.toggle();
    }
    // No else if for chrome.sidePanel needed in the Firefox version
    else {
      console.error("Command: browser.sidebarAction API is not available.");
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

  // Note: In Firefox manifest, the command to toggle sidebar is "_execute_sidebar_action"
  // which directly triggers the sidebar without firing this listener for that specific command.
  // However, if we used a custom name like "toggle_sidebar" (as currently in manifest), this handler would run.
  // Keeping the check here for consistency, though it might not be strictly necessary if
  // relying on the reserved "_execute_sidebar_action" name in manifest.
  // UPDATE: Manifest uses "toggle_sidebar" (Ctrl+Alt+P), so this handler IS needed.
  if (command === "toggle_sidebar") {
    console.log("BACKGROUND: Handling toggle_sidebar command.");
    // Pass the windowId from the tab context to the command handler
    handleCommandToggle(tab.windowId);
  }

  // Handle the spotlight toggle command
  if (command === "toggle_spotlight") { // Shortcut is Alt+P in Firefox manifest
    console.log("BACKGROUND: Handling toggle_spotlight command.");
    // Send message to content script in the active tab to toggle spotlight
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      console.log("BACKGROUND: Found active tab:", tabs[0]?.id);
      if (tabs[0] && tabs[0].id) {
        const tabId = tabs[0].id;
        console.log(`BACKGROUND: Sending toggleSpotlight to tab ${tabId}`);
        chrome.tabs.sendMessage(tabId, { action: "toggleSpotlight" })
          .then(() => {
             console.log(`BACKGROUND: Successfully sent toggleSpotlight to tab ${tabId}`);
             if (chrome.runtime.lastError) {
                console.error(`BACKGROUND: Error reported after sending toggleSpotlight: ${chrome.runtime.lastError.message}`);
             }
          })
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

// Explicitly handle action click for Firefox to ensure sidebar toggles
// Use 'browser.action' as Firefox might prefer it over 'chrome.action' here
if (typeof browser !== 'undefined' && browser.action && browser.sidebarAction) {
  browser.action.onClicked.addListener((tab) => {
    console.log("Firefox action icon clicked. Toggling sidebar.");
    try {
      // Use the specific Firefox API to toggle the sidebar
      browser.sidebarAction.toggle();
    } catch (error) {
      console.error("Error toggling sidebar on action click:", error);
    }
  });
} else {
  // Log if we couldn't set up the listener (e.g., if APIs aren't available)
  console.warn("Could not set up browser.action.onClicked listener for Firefox sidebar.");
}

console.log("Background script setup complete (Firefox). Listening for events.");