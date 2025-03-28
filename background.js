console.log("Service Worker starting...");

// --- Initialization on Install ---
chrome.runtime.onInstalled.addListener((details) => { // Use chrome.runtime
  console.log("Extension installed or updated:", details.reason);
  if (details.reason === "install") {
    console.log("Performing first-time initialization...");
    // Initialize prompts in storage if not already present
    chrome.storage.local.get("prompts") // Use chrome.storage
      .then((result) => {
        console.log("Checking for existing prompts in storage");
        if (!result.prompts) {
          console.log("No prompts found, initializing with default prompts");
          const initialPrompts = [
            { id: "1", title: "Greeting", text: "Hello, how are you?" },
            { id: "2", title: "Task Request", text: "Can you help me with a task?" },
          ];
          return chrome.storage.local.set({ prompts: initialPrompts }); // Use chrome.storage
        } else {
          console.log("Existing prompts found in storage");
        }
      })
      .then(() => {
        console.log("Storage initialization complete");
      })
      .catch((error) => {
        console.error("Error during storage initialization:", error);
      });
  }

  // --- Setup Chrome Side Panel Behavior (Run on install/update) ---
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
});

// --- Message Handling ---
// Listen for messages from content scripts or popup/sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { // Use chrome.runtime
  console.log("Message received in service worker:", request);

  if (request.action === "getPrompts") {
    // Retrieve prompts from storage and send them back
    return chrome.storage.local.get("prompts") // Use chrome.storage
      .then((result) => {
        console.log("Sending prompts:", result.prompts);
        return { prompts: result.prompts || [] };
      })
      .catch((error) => {
        console.error("Error retrieving prompts:", error);
        // It's important to return a structured error or empty data
        return { prompts: [], error: error.message };
      });
  }

  // Note: The DOM-based copyToClipboard fallback has been removed as it's incompatible with Service Workers.
  // The content script should handle copying using navigator.clipboard.

  // Return true to indicate you wish to send a response asynchronously
  // This is important for listeners returning promises.
  return true;
});

// --- Command Handling Function (for Keyboard Shortcut) ---
// Tries to toggle Firefox sidebar or open Chrome side panel via command
async function handleCommandToggle(windowId) {
  try {
    // Check if sidebarAction is available (Firefox) - Keep browser check for Firefox specific API
    if (typeof browser !== 'undefined' && browser.sidebarAction) {
      console.log("Toggling Firefox sidebar via command.");
      await browser.sidebarAction.toggle();
    }
    // Check if sidePanel is available (Chrome) - use chrome namespace explicitly
    else if (typeof chrome !== 'undefined' && chrome.sidePanel) {
      console.log(`Attempting to open Chrome side panel via command for window: ${windowId}`);
      try {
        // Opening via command is a user gesture, so open() should work directly.
        if (windowId) {
          await chrome.sidePanel.open({ windowId });
          console.log(`Successfully called chrome.sidePanel.open for window: ${windowId}`);
        } else {
          console.warn("Command: No valid windowId provided for chrome.sidePanel.open. Attempting global open.");
          await chrome.sidePanel.open({});
          console.log("Successfully called global chrome.sidePanel.open.");
        }
      } catch (openError) {
         console.error("Error calling chrome.sidePanel.open:", openError);
      }
    } else {
      console.error("Command: Neither sidebarAction nor sidePanel API is available.");
    }
  } catch (error) {
    console.error("Error handling command toggle:", error);
  }
}


// --- Command Handling (Keyboard Shortcuts) ---
chrome.commands.onCommand.addListener((command, tab) => { // Use chrome.commands
  console.log(`BACKGROUND: Command received: ${command}`); // Enhanced log
  if (command === "_execute_sidebar_action") {
    console.log("BACKGROUND: Handling _execute_sidebar_action command."); // Added log
    // Pass the windowId from the tab context to the command handler
    handleCommandToggle(tab.windowId);
  }

  if (command === "toggle_spotlight") {
    console.log("BACKGROUND: Handling toggle_spotlight command."); // Added log
    // Send message to content script in the active tab to toggle spotlight
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => { // Use chrome.tabs
      console.log("BACKGROUND: Found active tab:", tabs[0]?.id); // Added log
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleSpotlight" }) // Use chrome.tabs
          .catch(error => console.error("Error sending toggleSpotlight message:", error)); // Add error handling
      } else {
        console.error("Could not find active tab to send message.");
      }
    }).catch(error => console.error("Error querying tabs:", error)); // Add error handling
  }
});

console.log("Service Worker setup complete. Listening for events.");