// Global variables for managing spotlight state and elements
let promptList = []; // In-memory cache of available prompts
let spotlightOverlay; // The main overlay div
let spotlightInput; // The input field within the spotlight
let spotlightResults; // The div containing search results
let selectedIndex = -1; // Index of the currently highlighted result (-1 for none)
let isSpotlightVisible = false; // Flag to track visibility state
let previousActiveElement = null; // Element that had focus before spotlight opened

// Prompts are fetched from the background script when the spotlight is shown.

/**
 * Creates the spotlight overlay DOM elements and appends them to the body.
 * Initializes the overlay as hidden.
 */
function createSpotlightOverlay() {
  // Create the main overlay container
  spotlightOverlay = document.createElement("div");
  spotlightOverlay.id = "souffleur-spotlight";
  spotlightOverlay.className = "souffleur-spotlight";

  // Create the spotlight container (holds input and results)
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

  // Add to the document body
  // Use try-catch in case body isn't ready or accessible
  try {
      document.body.appendChild(spotlightOverlay);
  } catch (e) {
      console.error("Souffleur: Failed to append spotlight overlay to body.", e);
      return; // Stop if we can't add the overlay
  }


  // Hide by default
  hideSpotlight();

  // Add event listeners for interaction
  setupSpotlightEventListeners();
}

/**
 * Sets up event listeners for the spotlight input and overlay.
 * Handles filtering, keyboard navigation, and closing.
 */
function setupSpotlightEventListeners() {
  // Ensure elements exist before adding listeners
  if (!spotlightInput || !spotlightOverlay) {
      console.error("Souffleur: Cannot setup listeners, spotlight elements not found.");
      return;
  }

  // Input event for filtering prompts as the user types
  spotlightInput.addEventListener("input", () => {
    filterPrompts(spotlightInput.value);
  });

  // Keyboard navigation within the spotlight
  spotlightInput.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault(); // Prevent cursor movement in input
        navigateResults(event.key);
        break;
      case "Enter":
        event.preventDefault(); // Prevent form submission/newline
        selectCurrentPrompt();
        break;
      case "Escape":
        hideSpotlight();
        break;
    }
  });

  // Click outside the spotlight content (but on the overlay) to close
  // Use 'mousedown' to catch click before potential focus changes
  spotlightOverlay.addEventListener("mousedown", (event) => {
    // Only close if the click is directly on the overlay, not its children
    if (event.target === spotlightOverlay) {
      // Use a small delay to prevent accidental closing if the click also triggered opening
      setTimeout(() => {
        hideSpotlight();
      }, 100);
    }
  });
}

/**
 * Shows the spotlight overlay, fetches prompts, and sets focus.
 */
function showSpotlight() {
  // Ensure overlay exists; create if necessary (e.g., if removed from DOM)
  if (!spotlightOverlay || !document.body.contains(spotlightOverlay)) {
      console.log("CONTENT: Recreating spotlight overlay before showing.");
      createSpotlightOverlay();
      // If creation failed, exit
      if (!spotlightOverlay) return;
  }

  // Save the currently focused element to restore later
  previousActiveElement = document.activeElement;

  // Ensure the inner container is visible (might have been hidden by selectPrompt)
  const spotlightContainer = spotlightOverlay.querySelector('.spotlight-container');
  if (spotlightContainer) {
    spotlightContainer.style.display = 'flex';
  }

  // Make the overlay visible
  spotlightOverlay.style.display = "flex";
  spotlightInput.value = ""; // Clear previous input

  // Delay focus slightly to ensure the element is visible and focusable
  setTimeout(() => {
    // Check if input still exists before focusing
    if (spotlightInput) {
        spotlightInput.focus();
    }
  }, 50);

  isSpotlightVisible = true;

  // Fetch prompts from the background script
  console.log("CONTENT: Sending getPrompts message to background.");
  chrome.runtime.sendMessage({ action: "getPrompts" }) // Use chrome.runtime
    .then(response => {
      console.log("CONTENT: Received response for getPrompts:", response);
      // Check for runtime.lastError specifically for Chrome compatibility pattern
      if (chrome.runtime.lastError) {
          console.error("CONTENT: Error receiving getPrompts response:", chrome.runtime.lastError.message);
          promptList = [];
      } else if (response && response.prompts) {
        promptList = response.prompts; // Update the local prompt list
        console.log("Prompts received in content script:", promptList);
      } else {
        console.error("Failed to get prompts from background or invalid response:", response);
        promptList = []; // Clear list on error
      }
      // Render prompts (or empty state) after receiving response
      filterPrompts("");
    })
    .catch(error => {
      // Catch errors during the sendMessage call itself
      console.error("Error sending message to get prompts:", error);
      promptList = []; // Clear list on error
      filterPrompts(""); // Render empty state
    });

  // Add a one-time listener to prevent immediate closing if the overlay itself is clicked right after opening
  spotlightOverlay.addEventListener("mousedown", (event) => {
    if (event.target === spotlightOverlay) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { once: true });
}

/**
 * Hides the spotlight overlay and restores focus to the previously active element.
 */
function hideSpotlight() {
  // Ensure overlay exists before trying to hide
  if (!spotlightOverlay) return;

  spotlightOverlay.style.display = "none";
  isSpotlightVisible = false;
  selectedIndex = -1; // Reset selection

  // Restore focus to the element that had focus before opening the spotlight
  if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
    // Use a small delay to ensure the spotlight is fully hidden before restoring focus
    setTimeout(() => {
      try {
        previousActiveElement.focus();
      } catch (e) {
        // Ignore errors if the element is no longer focusable
        console.warn("Could not restore focus to previous element:", e);
      }
      previousActiveElement = null; // Clear reference
    }, 10);
  } else {
      previousActiveElement = null; // Clear reference even if not focused
  }
}

/**
 * Toggles the visibility of the spotlight overlay.
 * Creates the overlay if it doesn't exist.
 */
function toggleSpotlight() {
  console.log("CONTENT: Toggle spotlight called, current visibility:", isSpotlightVisible);
  if (isSpotlightVisible) {
    hideSpotlight();
  } else {
    // Ensure the overlay exists before showing it; create if needed.
    if (!spotlightOverlay || !document.body.contains(spotlightOverlay)) {
      console.log("CONTENT: Recreating spotlight overlay for toggle.");
      createSpotlightOverlay();
      // If creation failed, don't try to show
      if (!spotlightOverlay) return;
    }
    // Show with a slight delay to ensure DOM is ready and transitions work
    setTimeout(() => {
      showSpotlight();
    }, 100); // Keep increased delay
  }
}

/**
 * Filters the global `promptList` based on the search query.
 * @param {string} query - The search term entered by the user.
 */
function filterPrompts(query) {
  let filteredPrompts;
  if (!query) {
    // Show all prompts if no query
    filteredPrompts = promptList;
  } else {
    // Filter prompts based on title or text content (case-insensitive)
    const searchQuery = query.toLowerCase();
    filteredPrompts = promptList.filter((p) =>
      (p.title && p.title.toLowerCase().includes(searchQuery)) ||
      (p.text && p.text.toLowerCase().includes(searchQuery))
    );
  }
  // Render the filtered results
  renderResults(filteredPrompts);
}

/**
 * Renders the provided list of prompts into the spotlight results container.
 * @param {Array<object>} prompts - The array of prompt objects to render.
 */
function renderResults(prompts) {
   // Ensure results container exists
  if (!spotlightResults) {
      console.error("Souffleur: Cannot render results, container not found.");
      return;
  }

  spotlightResults.innerHTML = ""; // Clear previous results
  selectedIndex = -1; // Reset selection

  // Display "No prompts found" message if the list is empty
  if (!prompts || prompts.length === 0) {
    const noResults = document.createElement("div");
    noResults.className = "no-results";
    noResults.textContent = "No prompts found";
    spotlightResults.appendChild(noResults);
    return;
  }

  // Create and append each result item
  prompts.forEach((prompt, index) => {
    const resultItem = document.createElement("div");
    resultItem.className = "result-item";
    resultItem.setAttribute("data-index", index); // Store index for selection
    resultItem.setAttribute("data-text", prompt.text); // Store full text for copying

    const title = document.createElement("div");
    title.className = "result-title";
    title.textContent = prompt.title || "[No Title]"; // Handle missing title

    const preview = document.createElement("div");
    preview.className = "result-preview";
    preview.textContent = truncateText(prompt.text || "", 100); // Handle missing text

    resultItem.appendChild(title);
    resultItem.appendChild(preview);

    // Add click listener to select and copy the prompt
    resultItem.addEventListener("click", () => {
      selectPrompt(prompt.text);
    });

    // Add mouseover listener to highlight the item
    resultItem.addEventListener("mouseover", () => {
      selectResultItem(index);
    });

    spotlightResults.appendChild(resultItem);
  });
}

/**
 * Truncates text to a specified maximum length, adding ellipsis if needed.
 * @param {string} text - The text to truncate.
 * @param {number} [maxLength=100] - The maximum desired length.
 * @returns {string} The truncated (or original) text.
 */
function truncateText(text, maxLength = 100) {
  if (typeof text !== 'string') return ''; // Handle non-string input
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "...";
  }
  return text;
}

/**
 * Handles keyboard navigation (ArrowUp/ArrowDown) within the results list.
 * @param {string} direction - "ArrowUp" or "ArrowDown".
 */
function navigateResults(direction) {
  if (!spotlightResults) return; // Ensure container exists
  const items = spotlightResults.querySelectorAll(".result-item");
  if (items.length === 0) return;

  // Remove selection highlight from the currently selected item
  if (selectedIndex >= 0 && selectedIndex < items.length) {
    items[selectedIndex].classList.remove("selected");
  }

  // Calculate the new index based on direction
  if (direction === "ArrowDown") {
    selectedIndex = (selectedIndex + 1) % items.length;
  } else if (direction === "ArrowUp") {
    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
  }

  // Add selection highlight to the new item and scroll it into view
  items[selectedIndex].classList.add("selected");
  items[selectedIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/**
 * Highlights a specific result item based on its index (e.g., on mouseover).
 * @param {number} index - The index of the item to select.
 */
function selectResultItem(index) {
  if (!spotlightResults) return; // Ensure container exists
  const items = spotlightResults.querySelectorAll(".result-item");
  // Validate index
  if (items.length === 0 || index < 0 || index >= items.length) return;

  // Remove selection from all items first
  items.forEach(item => item.classList.remove("selected"));

  // Update selected index and add selection class
  selectedIndex = index;
  items[selectedIndex].classList.add("selected");
}

/**
 * Selects the currently highlighted prompt (triggered by Enter key).
 */
function selectCurrentPrompt() {
  if (!spotlightResults) return; // Ensure container exists
  const items = spotlightResults.querySelectorAll(".result-item");
  // Check if a valid item is selected
  if (selectedIndex >= 0 && selectedIndex < items.length) {
    const text = items[selectedIndex].getAttribute("data-text");
    if (text) { // Ensure text exists before selecting
        selectPrompt(text);
    }
  }
}

/**
 * Handles the selection of a prompt: copies text and closes the spotlight.
 * @param {string} text - The prompt text to copy.
 */
function selectPrompt(text) {
  copyToClipboard(text);

  // Hide the spotlight immediately after copying
  hideSpotlight();

  // Show a temporary "Copied!" message on the main page body
  const copiedMessage = document.createElement("div");
  copiedMessage.className = "copied-message"; // Use existing style
  copiedMessage.textContent = "Prompt Copied!";
  copiedMessage.style.zIndex = "2147483647"; // Ensure it's on top
  document.body.appendChild(copiedMessage);

  // Remove the message after a delay
  setTimeout(() => {
    // Check if message still exists before removing
    if (document.body.contains(copiedMessage)) {
      document.body.removeChild(copiedMessage);
    }
  }, 2000); // Display for 2 seconds
}

/**
 * Copies the given text to the clipboard using the modern Clipboard API.
 * Includes basic error handling.
 * @param {string} text - The text to copy.
 */
function copyToClipboard(text) {
  // Use modern Clipboard API if available
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log("Text copied to clipboard via navigator.clipboard");
      })
      .catch(err => {
        console.error("Failed to copy text using navigator.clipboard: ", err);
        // Consider notifying the user here if copying fails
      });
  } else {
     // Log a warning if the Clipboard API is unavailable
     console.warn("Clipboard API (navigator.clipboard.writeText) not available.");
     // Fallback methods are generally not feasible in content scripts without specific permissions/background interaction
  }
}

// Fallback method using background script (REMOVED - Incompatible with MV3 Service Worker DOM access)
/*
function fallbackCopyToClipboard(text) {
  chrome.runtime.sendMessage({ // Use chrome.runtime
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
*/

/**
 * Listens for messages from the background script (e.g., to toggle spotlight).
 * @param {object} request - The message payload.
 * @param {object} sender - Information about the message sender.
 * @param {function} sendResponse - Callback function to send a response (not used here).
 */
function handleBackgroundMessage(request, sender, sendResponse) {
  console.log("CONTENT: Message received:", request);
  if (request.action === "toggleSpotlight") {
    console.log("CONTENT: Handling toggleSpotlight message.");
    // Use a timeout to prevent potential race conditions or interference
    setTimeout(() => {
      toggleSpotlight();
    }, 100); // Delay before toggling UI
  }
  // Return false or undefined as we don't send an async response from this listener
}

/**
 * Injects the necessary CSS styles for the spotlight overlay into the page head.
 */
function addStyles() {
  const styleId = "souffleur-spotlight-styles";
  // Avoid adding styles multiple times
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    /* Styles omitted for brevity - assume they are correct */
    .souffleur-spotlight {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background-color: rgba(0, 0, 0, 0.6); display: flex;
      justify-content: center; align-items: center;
      z-index: 2147483647; opacity: 1 !important; visibility: visible !important;
      backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
    }
    .spotlight-container {
      width: 600px; max-width: 90%; background-color: #282A36;
      border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      overflow: hidden; display: flex; flex-direction: column;
      opacity: 1 !important; visibility: visible !important;
      position: relative; z-index: 2147483647;
    }
    .spotlight-input {
      width: 100%; padding: 16px; border: none; background-color: #282A36;
      color: #F8F8F2; font-size: 18px; outline: none;
      border-bottom: 1px solid #44475A; box-sizing: border-box;
    }
    .spotlight-input::placeholder { color: #6272A4; }
    .spotlight-results { max-height: 400px; overflow-y: auto; }
    .result-item {
      padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #44475A;
      transition: background-color 0.2s;
    }
    .result-item:hover, .result-item.selected { background-color: #44475A; }
    .result-title {
      font-weight: bold; font-size: 16px; color: #8BE9FD; margin-bottom: 4px;
    }
    .result-preview { font-size: 14px; color: #F8F8F2; opacity: 0.8; }
    .no-results { padding: 16px; text-align: center; color: #6272A4; }
    .copied-message {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background-color: #50FA7B; color: #282A36; padding: 8px 16px;
      border-radius: 4px; font-weight: bold;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); z-index: 2147483647;
    }
  `;
  // Append to head or body
  (document.head || document.documentElement).appendChild(style);
}

/**
 * Initializes the content script: adds styles and creates the spotlight overlay.
 */
function initialize() {
  console.log("Souffleur content script initializing...");
  addStyles();
  // Create the overlay elements but keep them hidden initially
  createSpotlightOverlay();
  console.log("Souffleur content script initialized.");
}

// --- Script Execution ---

// Register the message listener
chrome.runtime.onMessage.addListener(handleBackgroundMessage);

// Initialize the spotlight UI once the DOM is ready
if (document.readyState === "complete" || document.readyState === "interactive") {
  initialize();
} else {
  window.addEventListener("DOMContentLoaded", initialize);
}