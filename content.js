let promptList = []; // Store available prompts in memory
let spotlightOverlay; // The spotlight overlay element
let spotlightInput; // The input field in the spotlight
let spotlightResults; // The results container in the spotlight
let selectedIndex = -1; // Track the selected suggestion
let isSpotlightVisible = false; // Flag indicating whether the spotlight is visible
let previousActiveElement = null; // Store the element that had focus before opening the spotlight

// Retrieve prompts from memory
browser.storage.local.get("prompts").then((result) => {
  promptList = result.prompts || [];
});

// Create the spotlight overlay
function createSpotlightOverlay() {
  // Create the main overlay container
  spotlightOverlay = document.createElement("div");
  spotlightOverlay.id = "souffleur-spotlight";
  spotlightOverlay.className = "souffleur-spotlight";
  
  // Create the spotlight container
  const spotlightContainer = document.createElement("div");
  spotlightContainer.className = "spotlight-container";
  
  // Create the input field
  spotlightInput = document.createElement("input");
  spotlightInput.type = "text";
  spotlightInput.className = "spotlight-input";
  spotlightInput.placeholder = "Search prompts...";
  
  // Create the results container
  spotlightResults = document.createElement("div");
  spotlightResults.className = "spotlight-results";
  
  // Assemble the components
  spotlightContainer.appendChild(spotlightInput);
  spotlightContainer.appendChild(spotlightResults);
  spotlightOverlay.appendChild(spotlightContainer);
  
  // Add to the document
  document.body.appendChild(spotlightOverlay);
  
  // Hide by default
  hideSpotlight();
  
  // Add event listeners
  setupSpotlightEventListeners();
}

// Set up event listeners for the spotlight
function setupSpotlightEventListeners() {
  // Input event for filtering prompts
  spotlightInput.addEventListener("input", () => {
    filterPrompts(spotlightInput.value);
  });
  
  // Keyboard navigation
  spotlightInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      navigateResults(event.key);
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectCurrentPrompt();
    } else if (event.key === "Escape") {
      hideSpotlight();
    }
  });
  
  // Click outside to close - use mousedown instead of click to prevent immediate closing
  spotlightOverlay.addEventListener("mousedown", (event) => {
    if (event.target === spotlightOverlay) {
      // Small delay to prevent accidental closing
      setTimeout(() => {
        hideSpotlight();
      }, 100);
    }
  });
}

// Show the spotlight overlay
function showSpotlight() {
  // Save the currently focused element before showing the spotlight
  previousActiveElement = document.activeElement;

  // Ensure the inner container is visible as well
  const spotlightContainer = spotlightOverlay.querySelector('.spotlight-container');
  if (spotlightContainer) {
    spotlightContainer.style.display = 'flex'; // Or 'block' if that's the intended display
  }
  
  spotlightOverlay.style.display = "flex";
  spotlightInput.value = "";
  
  // Delay focus to ensure the overlay is fully visible
  setTimeout(() => {
    spotlightInput.focus();
  }, 50);
  
  isSpotlightVisible = true;
  
  // Show all prompts initially
  filterPrompts("");
  
  // Prevent the overlay from closing immediately
  spotlightOverlay.addEventListener("mousedown", (event) => {
    if (event.target === spotlightOverlay) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { once: true });
}

// Hide the spotlight overlay
function hideSpotlight() {
  spotlightOverlay.style.display = "none";
  isSpotlightVisible = false;
  selectedIndex = -1;
  
  // Restore focus to the element that had focus before opening the spotlight
  if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
    // Small delay to ensure the spotlight is fully hidden before restoring focus
    setTimeout(() => {
      try {
        previousActiveElement.focus();
      } catch (e) {
        console.error("Error restoring focus:", e);
      }
    }, 10);
  }
}

// Toggle the spotlight visibility
function toggleSpotlight() {
  console.log("Toggle spotlight called, current visibility:", isSpotlightVisible);
  
  if (isSpotlightVisible) {
    hideSpotlight();
  } else {
    // Ensure the overlay exists before showing it
    if (!spotlightOverlay || !document.body.contains(spotlightOverlay)) {
      console.log("Recreating spotlight overlay");
      createSpotlightOverlay();
    }
    
    // Show with a slight delay to ensure DOM is ready
    setTimeout(() => {
      showSpotlight();
    }, 10);
  }
}

// Filter prompts based on input
function filterPrompts(query) {
  let filteredPrompts;
  
  if (!query) {
    // Show all prompts if no query
    filteredPrompts = promptList;
  } else {
    // Filter prompts based on the query
    const searchQuery = query.toLowerCase();
    filteredPrompts = promptList.filter((p) =>
      p.title.toLowerCase().includes(searchQuery) || 
      p.text.toLowerCase().includes(searchQuery)
    );
  }
  
  renderResults(filteredPrompts);
}

// Render the filtered prompts in the results container
function renderResults(prompts) {
  spotlightResults.innerHTML = "";
  selectedIndex = -1;
  
  if (prompts.length === 0) {
    const noResults = document.createElement("div");
    noResults.className = "no-results";
    noResults.textContent = "No prompts found";
    spotlightResults.appendChild(noResults);
    return;
  }
  
  prompts.forEach((prompt, index) => {
    const resultItem = document.createElement("div");
    resultItem.className = "result-item";
    resultItem.setAttribute("data-index", index);
    resultItem.setAttribute("data-text", prompt.text);
    
    const title = document.createElement("div");
    title.className = "result-title";
    title.textContent = prompt.title;
    
    const preview = document.createElement("div");
    preview.className = "result-preview";
    preview.textContent = truncateText(prompt.text, 100);
    
    resultItem.appendChild(title);
    resultItem.appendChild(preview);
    
    resultItem.addEventListener("click", () => {
      selectPrompt(prompt.text);
    });
    
    resultItem.addEventListener("mouseover", () => {
      selectResultItem(index);
    });
    
    spotlightResults.appendChild(resultItem);
  });
}

// Truncate text to a specified length
function truncateText(text, maxLength = 100) {
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "...";
  }
  return text;
}

// Navigate through results with keyboard
function navigateResults(direction) {
  const items = spotlightResults.querySelectorAll(".result-item");
  if (items.length === 0) return;
  
  // Remove selection from current item
  if (selectedIndex >= 0 && selectedIndex < items.length) {
    items[selectedIndex].classList.remove("selected");
  }
  
  // Update selected index
  if (direction === "ArrowDown") {
    selectedIndex = (selectedIndex + 1) % items.length;
  } else if (direction === "ArrowUp") {
    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
  }
  
  // Add selection to new item
  items[selectedIndex].classList.add("selected");
  items[selectedIndex].scrollIntoView({ block: "nearest" });
}

// Select a result item by index
function selectResultItem(index) {
  const items = spotlightResults.querySelectorAll(".result-item");
  if (items.length === 0) return;
  
  // Remove selection from all items
  items.forEach(item => item.classList.remove("selected"));
  
  // Update selected index and add selection
  selectedIndex = index;
  items[selectedIndex].classList.add("selected");
}

// Select the current prompt (on Enter key)
function selectCurrentPrompt() {
  const items = spotlightResults.querySelectorAll(".result-item");
  if (selectedIndex >= 0 && selectedIndex < items.length) {
    const text = items[selectedIndex].getAttribute("data-text");
    selectPrompt(text);
  }
}

// Select a prompt and copy to clipboard
function selectPrompt(text) {
  copyToClipboard(text);
  
  // Hide the spotlight immediately after copying
  hideSpotlight();
  
  // Show a temporary "Copied!" message on the main page body
  const copiedMessage = document.createElement("div");
  copiedMessage.className = "copied-message"; // Use existing style
  copiedMessage.textContent = "Prompt Copied!"; // Changed text slightly for clarity
  copiedMessage.style.zIndex = "2147483647"; // Ensure it's on top
  document.body.appendChild(copiedMessage);
  
  // Remove the message after a delay (e.g., 2000ms)
  setTimeout(() => {
    if (document.body.contains(copiedMessage)) {
      document.body.removeChild(copiedMessage);
    }
  }, 2000); // Display for 2 seconds
}

// Copy text to clipboard
function copyToClipboard(text) {
  // Try to use the Clipboard API first (more modern)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log("Text copied to clipboard");
      })
      .catch(err => {
        console.error("Failed to copy text: ", err);
        // Fallback to background script method
        fallbackCopyToClipboard(text);
      });
  } else {
    // Fallback for browsers that don't support Clipboard API
    fallbackCopyToClipboard(text);
  }
}

// Fallback method using background script
function fallbackCopyToClipboard(text) {
  browser.runtime.sendMessage({
    action: "copyToClipboard",
    text: text
  }).then(response => {
    if (response.success) {
      console.log("Text copied to clipboard via background script");
    } else {
      console.error("Failed to copy text via background script");
    }
  });
}

// Listen for messages from the background script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleSpotlight") {
    // Prevent any ongoing events from interfering
    setTimeout(() => {
      toggleSpotlight();
    }, 10);
  }
  return Promise.resolve({ success: true });
});

// Add styles
function addStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .souffleur-spotlight {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2147483647; /* Highest possible z-index */
      opacity: 1 !important;
      visibility: visible !important;
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
    }
    
    .spotlight-container {
      width: 600px;
      max-width: 90%;
      background-color: #282A36;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      opacity: 1 !important;
      visibility: visible !important;
      position: relative;
      z-index: 2147483647;
    }
    
    .spotlight-input {
      width: 100%;
      padding: 16px;
      border: none;
      background-color: #282A36;
      color: #F8F8F2;
      font-size: 18px;
      outline: none;
      border-bottom: 1px solid #44475A;
    }
    
    .spotlight-input::placeholder {
      color: #6272A4;
    }
    
    .spotlight-results {
      max-height: 400px;
      overflow-y: auto;
    }
    
    .result-item {
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #44475A;
      transition: background-color 0.2s;
    }
    
    .result-item:hover, .result-item.selected {
      background-color: #44475A;
    }
    
    .result-title {
      font-weight: bold;
      font-size: 16px;
      color: #8BE9FD;
      margin-bottom: 4px;
    }
    
    .result-preview {
      font-size: 14px;
      color: #F8F8F2;
      opacity: 0.8;
    }
    
    .no-results {
      padding: 16px;
      text-align: center;
      color: #6272A4;
    }
    
    .copied-message {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #50FA7B;
      color: #282A36;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
  `;
  document.head.appendChild(style);
}

// Initialize
function initialize() {
  // Add styles first to ensure they're applied
  addStyles();
  
  // Create the spotlight overlay
  createSpotlightOverlay();
  
  // Make sure the overlay is properly attached to the DOM
  if (!document.body.contains(spotlightOverlay)) {
    document.body.appendChild(spotlightOverlay);
  }
  
  // Add keyboard shortcut listener (as a fallback)
  document.addEventListener("keydown", (event) => {
    // Alt+P shortcut (as a fallback if the browser command doesn't work)
    if (event.altKey && event.code === "KeyP") {
      event.preventDefault();
      event.stopPropagation();
      toggleSpotlight();
    }
  }, true);
  
  // Log that initialization is complete
  console.log("Souffleur spotlight initialized");
}

// Initialize when the page is fully loaded
if (document.readyState === "complete") {
  initialize();
} else {
  window.addEventListener("load", initialize);
}