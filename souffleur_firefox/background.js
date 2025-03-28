console.log("Service Worker starting...");

// --- Initialization on Install ---
browser.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed or updated:", details.reason);
  if (details.reason === "install") {
    console.log("Performing first-time initialization...");
    // Initialize prompts in storage if not already present
    browser.storage.local.get("prompts")
      .then((result) => {
        console.log("Checking for existing prompts in storage");
        if (!result.prompts) {
          console.log("No prompts found, initializing with default prompts");
          const initialPrompts = [
            { id: "1", title: "Greeting", text: "Hello, how are you?" },
            { id: "2", title: "Task Request", text: "Can you help me with a task?" },
          ];
          return browser.storage.local.set({ prompts: initialPrompts });
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
});

// --- Message Handling ---
// Listen for messages from content scripts or popup/sidebar
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in service worker:", request);

  if (request.action === "getPrompts") {
    // Retrieve prompts from storage and send them back
    return browser.storage.local.get("prompts")
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

// --- Sidebar Toggle Function ---
function toggleSidebar() {
  // Check if sidebarAction is available (Firefox)
  if (browser.sidebarAction) {
    browser.sidebarAction.toggle();
  } else {
    // Placeholder for potential Chrome side panel logic later
    console.log("Sidebar action not available (maybe Chrome - side panel logic needed here).");
    // Example: chrome.sidePanel.open({ windowId: sender.tab.windowId }); // Needs context
  }
}

// --- Action (Toolbar Icon) Click ---
// Listen for clicks on the addon icon (renamed from browserAction)
browser.action.onClicked.addListener((tab) => {
  console.log("Action icon clicked.");
  toggleSidebar(); // Attempt to toggle sidebar/sidepanel
});

// --- Command Handling (Keyboard Shortcuts) ---
browser.commands.onCommand.addListener((command, tab) => {
  console.log("Command received:", command);
  if (command === "_execute_sidebar_action") {
    toggleSidebar();
  }

  if (command === "toggle_spotlight") {
    // Send message to content script in the active tab to toggle spotlight
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0] && tabs[0].id) {
        browser.tabs.sendMessage(tabs[0].id, { action: "toggleSpotlight" })
          .catch(error => console.error("Error sending toggleSpotlight message:", error)); // Add error handling
      } else {
        console.error("Could not find active tab to send message.");
      }
    }).catch(error => console.error("Error querying tabs:", error)); // Add error handling
  }
});

console.log("Service Worker setup complete. Listening for events.");