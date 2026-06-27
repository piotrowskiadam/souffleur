// Global variables for managing spotlight state and elements
let promptList = []; // In-memory cache of available prompts
let shadowRoot; // The shadow root isolating our DOM and styles
let spotlightOverlay; // The main overlay div (within shadow root)
let spotlightInput; // The input field within the spotlight
let spotlightResults; // The div containing search results
let selectedIndex = -1; // Index of the currently highlighted result (-1 for none)
let isSpotlightVisible = false; // Flag to track visibility state
let previousActiveElement = null; // Element that had focus before spotlight opened

/**
 * Creates the isolated spotlight overlay DOM elements within a Shadow DOM.
 * Appends the shadow host to the document body.
 */
function createSpotlightOverlay() {
  // Check if root already exists in the document
  let host = document.getElementById("souffleur-spotlight-root");
  if (!host) {
    host = document.createElement("div");
    host.id = "souffleur-spotlight-root";
    // Inline styling for the host wrapper to prevent host page layout interference
    host.style.position = "fixed";
    host.style.top = "0";
    host.style.left = "0";
    host.style.width = "0";
    host.style.height = "0";
    host.style.zIndex = "2147483647";
    
    try {
      document.body.appendChild(host);
    } catch (e) {
      console.error("Souffleur: Failed to append spotlight host to body.", e);
      return;
    }
  }

  // Create or reuse shadow root
  if (!shadowRoot) {
    shadowRoot = host.attachShadow({ mode: "open" });
  } else {
    shadowRoot.innerHTML = ""; // Clear existing contents
  }

  // Inject styles inside the shadow root
  const style = document.createElement("style");
  style.textContent = getSpotlightCSS();
  shadowRoot.appendChild(style);

  // Create the spotlight overlay container
  spotlightOverlay = document.createElement("div");
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
  shadowRoot.appendChild(spotlightOverlay);

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
  spotlightOverlay.addEventListener("mousedown", (event) => {
    if (event.target === spotlightOverlay) {
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
  let host = document.getElementById("souffleur-spotlight-root");
  if (!host || !spotlightOverlay || !shadowRoot.contains(spotlightOverlay)) {
    console.log("CONTENT: Recreating spotlight overlay before showing.");
    createSpotlightOverlay();
    if (!spotlightOverlay) return;
  }

  // Restore parent host size to full screen to capture clicks and display contents
  host.style.width = "100vw";
  host.style.height = "100vh";

  previousActiveElement = document.activeElement;

  const spotlightContainer = spotlightOverlay.querySelector('.spotlight-container');
  if (spotlightContainer) {
    spotlightContainer.style.display = 'flex';
  }

  spotlightOverlay.style.display = "flex";
  spotlightInput.value = ""; // Clear previous input

  setTimeout(() => {
    if (spotlightInput) {
      spotlightInput.focus();
    }
  }, 50);

  isSpotlightVisible = true;

  console.log("CONTENT: Sending getPrompts message to background.");
  chrome.runtime.sendMessage({ action: "getPrompts" })
    .then(response => {
      console.log("CONTENT: Received response for getPrompts:", response);
      if (chrome.runtime.lastError) {
        console.error("CONTENT: Error receiving getPrompts response:", chrome.runtime.lastError.message);
        promptList = [];
      } else if (response && response.prompts) {
        promptList = response.prompts;
      } else {
        console.error("Failed to get prompts from background or invalid response:", response);
        promptList = [];
      }
      filterPrompts("");
    })
    .catch(error => {
      console.error("Error sending message to get prompts:", error);
      promptList = [];
      filterPrompts("");
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
  if (!spotlightOverlay) return;

  spotlightOverlay.style.display = "none";
  isSpotlightVisible = false;
  selectedIndex = -1;

  // Shrink host wrapper to 0 size so it doesn't block clicks on the webpage
  const host = document.getElementById("souffleur-spotlight-root");
  if (host) {
    host.style.width = "0";
    host.style.height = "0";
  }

  if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
    setTimeout(() => {
      try {
        previousActiveElement.focus();
      } catch (e) {
        console.warn("Could not restore focus to previous element:", e);
      }
      previousActiveElement = null;
    }, 10);
  } else {
    previousActiveElement = null;
  }
}

/**
 * Toggles the visibility of the spotlight overlay.
 */
function toggleSpotlight() {
  console.log("CONTENT: Toggle spotlight called, current visibility:", isSpotlightVisible);
  if (isSpotlightVisible) {
    hideSpotlight();
  } else {
    let host = document.getElementById("souffleur-spotlight-root");
    if (!host || !spotlightOverlay || !shadowRoot.contains(spotlightOverlay)) {
      console.log("CONTENT: Recreating spotlight overlay for toggle.");
      createSpotlightOverlay();
      if (!spotlightOverlay) return;
    }
    
    // Check environment to set proper delay (Firefox needs slightly more delay for DOM readiness)
    const toggleDelay = (typeof browser !== 'undefined') ? 100 : 10;
    setTimeout(() => {
      showSpotlight();
    }, toggleDelay);
  }
}

/**
 * Filters the global `promptList` based on the search query.
 * @param {string} query - The search term entered by the user.
 */
function filterPrompts(query) {
  let filteredPrompts;
  if (!query) {
    filteredPrompts = promptList;
  } else {
    const searchQuery = query.toLowerCase();
    filteredPrompts = promptList.filter((p) =>
      (p.title && p.title.toLowerCase().includes(searchQuery)) ||
      (p.text && p.text.toLowerCase().includes(searchQuery))
    );
  }
  renderResults(filteredPrompts);
}

/**
 * Renders the provided list of prompts into the spotlight results container.
 * @param {Array<object>} prompts - The array of prompt objects to render.
 */
function renderResults(prompts) {
  if (!spotlightResults) {
    console.error("Souffleur: Cannot render results, container not found.");
    return;
  }

  spotlightResults.innerHTML = "";
  selectedIndex = -1;

  if (!prompts || prompts.length === 0) {
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
    title.textContent = prompt.title || "[No Title]";

    const preview = document.createElement("div");
    preview.className = "result-preview";
    preview.textContent = truncateText(prompt.text || "", 100);

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

/**
 * Truncates text to a specified maximum length.
 */
function truncateText(text, maxLength = 100) {
  if (typeof text !== 'string') return '';
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "...";
  }
  return text;
}

/**
 * Handles keyboard navigation within the results list.
 */
function navigateResults(direction) {
  if (!spotlightResults) return;
  const items = spotlightResults.querySelectorAll(".result-item");
  if (items.length === 0) return;

  if (selectedIndex >= 0 && selectedIndex < items.length) {
    items[selectedIndex].classList.remove("selected");
  }

  if (direction === "ArrowDown") {
    selectedIndex = (selectedIndex + 1) % items.length;
  } else if (direction === "ArrowUp") {
    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
  }

  items[selectedIndex].classList.add("selected");
  items[selectedIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/**
 * Highlights a specific result item based on its index.
 */
function selectResultItem(index) {
  if (!spotlightResults) return;
  const items = spotlightResults.querySelectorAll(".result-item");
  if (items.length === 0 || index < 0 || index >= items.length) return;

  items.forEach(item => item.classList.remove("selected"));

  selectedIndex = index;
  items[selectedIndex].classList.add("selected");
}

/**
 * Selects the currently highlighted prompt (triggered by Enter).
 */
function selectCurrentPrompt() {
  if (!spotlightResults) return;
  const items = spotlightResults.querySelectorAll(".result-item");
  if (selectedIndex >= 0 && selectedIndex < items.length) {
    const text = items[selectedIndex].getAttribute("data-text");
    if (text) {
      selectPrompt(text);
    }
  }
}

/**
 * Handles prompt selection: copies text and hides the overlay.
 */
function selectPrompt(text) {
  copyToClipboard(text);
  hideSpotlight();

  // Create feedback toast outside the shadow DOM on the host document so it floats nicely
  const copiedMessage = document.createElement("div");
  copiedMessage.className = "souffleur-copied-message-toast";
  copiedMessage.textContent = "Prompt Copied!";
  
  // Style the toast explicitly to ensure visual integrity on any webpage
  Object.assign(copiedMessage.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#50FA7B",
    color: "#282A36",
    padding: "8px 16px",
    borderRadius: "4px",
    fontWeight: "bold",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
    zIndex: "2147483647",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
  });

  document.body.appendChild(copiedMessage);

  setTimeout(() => {
    if (document.body.contains(copiedMessage)) {
      document.body.removeChild(copiedMessage);
    }
  }, 2000);
}

/**
 * Copies text to clipboard using modern Clipboard API.
 */
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log("Text copied to clipboard successfully.");
      })
      .catch(err => {
        console.error("Failed to copy text: ", err);
      });
  } else {
    console.warn("Clipboard API not available.");
  }
}

/**
 * Listens for messages from the background script.
 */
function handleBackgroundMessage(request, sender, sendResponse) {
  console.log("CONTENT: Message received:", request);
  if (request.action === "toggleSpotlight") {
    setTimeout(() => {
      toggleSpotlight();
    }, 100);
  }
}

/**
 * Returns the CSS styles for the spotlight layout inside the Shadow DOM.
 */
function getSpotlightCSS() {
  return `
    .souffleur-spotlight {
      position: fixed; 
      top: 0; 
      left: 0; 
      width: 100vw; 
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.6); 
      display: flex;
      justify-content: center; 
      align-items: center;
      z-index: 2147483647; 
      backdrop-filter: blur(5px); 
      -webkit-backdrop-filter: blur(5px);
      box-sizing: border-box;
      font-family: Inter, system-ui, -apple-system, sans-serif;
    }
    .spotlight-container {
      width: 600px; 
      max-width: 90%; 
      background-color: #282A36;
      border-radius: 12px; 
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      overflow: hidden; 
      display: flex; 
      flex-direction: column;
      position: relative; 
      z-index: 2147483647;
      border: 1px solid #44475A;
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
      box-sizing: border-box;
    }
    .spotlight-input::placeholder { color: #6272A4; }
    .spotlight-results { max-height: 400px; overflow-y: auto; }
    .result-item {
      padding: 14px 16px; 
      cursor: pointer; 
      border-bottom: 1px solid #44475A;
      transition: background-color 0.15s ease;
      box-sizing: border-box;
      text-align: left;
    }
    .result-item:last-child { border-bottom: none; }
    .result-item:hover, .result-item.selected { background-color: #44475A; }
    .result-title {
      font-weight: bold; 
      font-size: 16px; 
      color: #8BE9FD; 
      margin-bottom: 4px;
    }
    .result-preview { 
      font-size: 13px; 
      color: #F8F8F2; 
      opacity: 0.8; 
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .no-results { padding: 16px; text-align: center; color: #6272A4; font-size: 15px; }
  `;
}

/**
 * Initializes the content script.
 */
function initialize() {
  console.log("Souffleur content script initializing...");
  createSpotlightOverlay();
  console.log("Souffleur content script initialized.");
}

// --- Script Execution ---
chrome.runtime.onMessage.addListener(handleBackgroundMessage);

if (document.readyState === "complete" || document.readyState === "interactive") {
  initialize();
} else {
  window.addEventListener("DOMContentLoaded", initialize);
}
