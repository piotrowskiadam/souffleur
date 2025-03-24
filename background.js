console.log("Background script loading...");

// Initialize prompts in storage if not already present
browser.storage.local
  .get("prompts")
  .then((result) => {
    console.log("Checking for existing prompts in storage");
    if (!result.prompts) {
      console.log("No prompts found, initializing with default prompts");
      const initialPrompts = [
        { id: "1", title: "Greeting", text: "Hello, how are you?" },
        {
          id: "2",
          title: "Task Request",
          text: "Can you help me with a task?",
        },
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

// Listen for messages from the content script
browser.runtime.onMessage.addListener((request, sender) => {
  console.log("Message received in background script:", request);
  
  if (request.action === "getPrompts") {
    return browser.storage.local
      .get("prompts")
      .then((result) => {
        console.log("Sending prompts to content script:", result.prompts);
        return { prompts: result.prompts || [] };
      })
      .catch((error) => {
        console.error("Error retrieving prompts:", error);
        return { prompts: [], error: error.message };
      });
  }
  
  if (request.action === "copyToClipboard") {
    // This is a fallback method if the content script can't copy directly
    // Create a temporary textarea element to copy text
    const textarea = document.createElement("textarea");
    textarea.value = request.text;
    document.body.appendChild(textarea);
    textarea.select();
    
    let success = false;
    try {
      success = document.execCommand("copy");
    } catch (err) {
      console.error("Unable to copy to clipboard", err);
    }
    
    document.body.removeChild(textarea);
    return Promise.resolve({ success });
  }
});

function toggleSidebar() {
  browser.sidebarAction.toggle();
}

// Listen for clicks on the addon icon
browser.browserAction.onClicked.addListener(toggleSidebar);

// Add command listener for keyboard shortcuts
browser.commands.onCommand.addListener((command) => {
  if (command === "_execute_sidebar_action") {
    toggleSidebar();
  }
  
  if (command === "toggle_spotlight") {
    // Send message to content script to toggle spotlight
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]) {
        browser.tabs.sendMessage(tabs[0].id, { action: "toggleSpotlight" });
      }
    });
  }
});

console.log("Background script setup complete");