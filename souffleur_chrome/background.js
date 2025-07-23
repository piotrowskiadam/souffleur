console.log("Service Worker starting...");

// Default prompts to initialize storage with on first install.
const INITIAL_PROMPTS = [
  { id: "1", title: "Greeting", text: "Hello, how are you?" },
  { id: "2", title: "Task Request", text: "Can you help me with a task?" },
];

/**
 * Initializes storage with default prompts if none exist.
 * Also sets up the Chrome side panel behavior on install/update.
 * @param {object} details - Information about the installation or update event.
 */
function handleInstallOrUpdate(details) {
  console.log("Extension installed or updated:", details.reason);

  // Initialize storage only on first install
  if (details.reason === "install") {
    console.log("Performing first-time storage initialization...");
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

  // Setup Chrome Side Panel Behavior (Run on install/update)
  // This allows the toolbar icon to open the side panel directly in Chrome.
  if (typeof chrome !== 'undefined' && chrome.sidePanel) {
    console.log("Setting up Chrome side panel behavior...");
    try {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .then(() => console.log("Successfully set side panel behavior for action click."))
        .catch((error) => console.error("Error setting side panel behavior (async):", error));
    } catch (error) {
      // Catch potential synchronous errors if the API structure is unexpected
      console.error("Synchronous error setting side panel behavior:", error);
    }
  } else {
    console.log("Chrome sidePanel API not detected. Skipping behavior setup.");
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
  console.log("Message received in service worker:", request);

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
 * Tries to toggle the Firefox sidebar or open the Chrome side panel.
 * @param {string} windowId - The ID of the window where the command was triggered.
 */
async function handleCommandToggle(windowId) {
  try {
    // Check if sidebarAction is available (Firefox specific API)
    if (typeof browser !== 'undefined' && browser.sidebarAction) {
      console.log("Toggling Firefox sidebar via command.");
      await browser.sidebarAction.toggle();
    }
    // Check if sidePanel is available (Chrome specific API)
    else if (typeof chrome !== 'undefined' && chrome.sidePanel) {
      console.log(`Attempting to open Chrome side panel via command for window: ${windowId}`);
      try {
        // Opening via command is considered a user gesture, so open() should work directly.
        if (windowId) {
          await chrome.sidePanel.open({ windowId });
          console.log(`Successfully called chrome.sidePanel.open for window: ${windowId}`);
        } else {
          // Fallback if windowId isn't available (less likely for commands)
          console.warn("Command: No valid windowId provided for chrome.sidePanel.open. Attempting global open.");
          await chrome.sidePanel.open({});
          console.log("Successfully called global chrome.sidePanel.open.");
        }
      } catch (openError) {
         console.error("Error calling chrome.sidePanel.open:", openError);
      }
    } else {
      // Neither API is available
      console.error("Command: Neither sidebarAction nor sidePanel API is available.");
    }
  } catch (error) {
    // Catch errors in the outer try block (e.g., API availability checks failing)
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
    console.log("BACKGROUND: Handling toggle_sidebar command.");
    // Pass the windowId from the tab context to the command handler
    handleCommandToggle(tab.windowId);
  }

  if (command === "toggle_spotlight") {
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
             // Check for errors after sending, although less common with sendMessage promise
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

console.log("Service Worker setup complete. Listening for events.");