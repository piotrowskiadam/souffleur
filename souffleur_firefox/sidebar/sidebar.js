// Global state variables
let promptList = []; // In-memory array of prompt objects {title: string, text: string}
let isAddingPrompt = false; // Flag to track if the 'Add Prompt' form is active

/**
 * Loads prompts from local extension storage and initiates rendering.
 */
function loadPrompts() {
  // Use chrome.storage.local which is compatible across browsers (mostly)
  chrome.storage.local.get("prompts")
    .then((result) => {
      promptList = result.prompts || []; // Initialize with empty array if nothing found
      console.log("SIDEBAR: Prompts loaded from storage:", promptList);
      renderPrompts(); // Render the loaded prompts
      attachDragListeners(); // Setup drag-and-drop after rendering
    })
    .catch(error => {
      console.error("SIDEBAR: Error loading prompts from storage:", error);
      // Optionally render an error message or empty state
      promptList = [];
      renderPrompts();
    });
}

/**
 * Truncates text to a specified maximum length, adding ellipsis if needed.
 * @param {string} text - The text to truncate.
 * @param {number} [maxLength=150] - The maximum desired length.
 * @returns {string} The truncated (or original) text.
 */
function truncateText(text, maxLength = 150) {
  if (typeof text !== 'string') return ''; // Handle non-string input
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "...";
  }
  return text;
}

/**
 * Renders the current `promptList` array into the sidebar's prompt list container.
 * Clears existing content and rebuilds the list items.
 */
function renderPrompts() {
  const list = document.getElementById("prompt-list");
  if (!list) {
      console.error("SIDEBAR: Cannot render prompts, list element not found.");
      return;
  }
  list.innerHTML = ""; // Clear previous list

  promptList.forEach((prompt, index) => {
    const truncatedText = truncateText(prompt.text);

    const promptElement = document.createElement("div");
    promptElement.className = "prompt-item";
    promptElement.draggable = true; // Enable dragging
    promptElement.dataset.index = index; // Store original index for reference
    // Use template literals for cleaner HTML structure
    promptElement.innerHTML = `
      <div class="drag-handle"></div>
      <div class="prompt-content">
        <h3>${prompt.title || "[No Title]"}</h3>
        <p>${truncatedText || "[No Text]"}</p>
        <div class="prompt-buttons">
          <button class="copy-btn" data-index="${index}" title="Copy prompt text">
            Copy
            <span class="copied-label">Copied!</span>
          </button>
          <button class="edit-btn" data-index="${index}" title="Edit prompt">Edit</button>
          <button class="delete-btn" data-index="${index}" title="Delete prompt">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(promptElement);
  });
  // Re-attach listeners to the newly created buttons
  attachPromptListeners();
}

/**
 * Attaches click event listeners to all Copy, Edit, and Delete buttons
 * within the rendered prompt list. Uses event delegation where possible,
 * but direct attachment is used here for simplicity after each render.
 */
function attachPromptListeners() {
  // --- Copy Button Listener ---
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    // Remove existing listener to prevent duplicates if re-rendering
    btn.replaceWith(btn.cloneNode(true));
    // Get the new button instance and add listener
    const newBtn = document.querySelector(`.copy-btn[data-index="${btn.dataset.index}"]`);
    if (newBtn) {
        newBtn.addEventListener("click", handleCopyClick);
    }
  });

  // --- Edit Button Listener ---
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.replaceWith(btn.cloneNode(true));
    const newBtn = document.querySelector(`.edit-btn[data-index="${btn.dataset.index}"]`);
     if (newBtn) {
        newBtn.addEventListener("click", handleEditClick);
    }
  });

  // --- Delete Button Listener ---
  document.querySelectorAll(".delete-btn").forEach((btn) => {
     btn.replaceWith(btn.cloneNode(true));
     const newBtn = document.querySelector(`.delete-btn[data-index="${btn.dataset.index}"]`);
     if (newBtn) {
        newBtn.addEventListener("click", handleDeleteClick);
    }
  });
}

/**
 * Handles the click event for a 'Copy' button.
 * Copies the corresponding prompt text to the clipboard.
 * @param {Event} e - The click event object.
 */
function handleCopyClick(e) {
    const index = parseInt(e.target.getAttribute("data-index"), 10);
    if (isNaN(index) || index < 0 || index >= promptList.length) return;

    const textToCopy = promptList[index].text;
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            console.log("SIDEBAR: Text copied to clipboard.");
            // Show 'Copied!' feedback
            const copiedLabel = e.target.querySelector(".copied-label");
            if (copiedLabel) {
                copiedLabel.classList.add("show");
                setTimeout(() => {
                    copiedLabel.classList.remove("show");
                }, 1500); // Shorter duration
            }
        })
        .catch(err => {
            console.error("SIDEBAR: Failed to copy text:", err);
            // Optionally show an error message to the user
        });
}

/**
 * Handles the click event for an 'Edit' button.
 * Replaces the prompt display with an editable form.
 * @param {Event} e - The click event object.
 */
function handleEditClick(e) {
    const index = parseInt(e.target.getAttribute("data-index"), 10);
    if (isNaN(index) || index < 0 || index >= promptList.length) return;

    const prompt = promptList[index];
    const promptElement = e.target.closest(".prompt-item");
    const promptContent = promptElement.querySelector(".prompt-content");

    // Prevent multiple edit forms on the same item
    if (promptElement.querySelector(".edit-form")) return;

    // Create edit form elements
    const editForm = document.createElement("div");
    editForm.className = "edit-form";
    editForm.innerHTML = `
        <input type="text" class="edit-title" value="${prompt.title || ''}" placeholder="Prompt Title" />
        <textarea class="edit-text" placeholder="Enter your prompt here">${prompt.text || ''}</textarea>
        <div class="edit-buttons">
          <button class="save-btn">Save</button>
          <button class="cancel-btn">Cancel</button>
        </div>
      `;

    // Hide original content and append edit form
    if (promptContent) promptContent.style.display = "none";
    promptElement.appendChild(editForm);

    // --- Edit Form Listeners ---
    const saveBtn = editForm.querySelector(".save-btn");
    const cancelBtn = editForm.querySelector(".cancel-btn");
    const editTitleInput = editForm.querySelector(".edit-title");
    const editTextarea = editForm.querySelector(".edit-text");

    saveBtn.addEventListener("click", () => {
        const newTitle = editTitleInput.value;
        const newText = editTextarea.value;

        // Update the prompt in the local array
        promptList[index] = { ...promptList[index], title: newTitle, text: newText }; // Preserve ID if exists

        // Save the updated list to storage
        chrome.storage.local.set({ prompts: promptList })
            .then(() => {
                console.log("SIDEBAR: Prompt updated and saved.");
                renderPrompts(); // Re-render the entire list
            })
            .catch(error => {
                console.error("SIDEBAR: Error saving updated prompt:", error);
                // Optionally revert UI or show error
                if (promptContent) promptContent.style.display = "block"; // Show original content on error
                promptElement.removeChild(editForm);
            });
    });

    cancelBtn.addEventListener("click", () => {
        // Remove edit form and show original content
        promptElement.removeChild(editForm);
        if (promptContent) promptContent.style.display = "block";
    });
}

/**
 * Handles the click event for a 'Delete' button.
 * Removes the corresponding prompt from the list and storage.
 * @param {Event} e - The click event object.
 */
function handleDeleteClick(e) {
    const index = parseInt(e.target.getAttribute("data-index"), 10);
    if (isNaN(index) || index < 0 || index >= promptList.length) return;

    // Remove the prompt from the local array
    promptList.splice(index, 1);

    // Save the updated list to storage
    chrome.storage.local.set({ prompts: promptList })
        .then(() => {
            console.log("SIDEBAR: Prompt deleted and list saved.");
            renderPrompts(); // Re-render the list
        })
        .catch(error => {
            console.error("SIDEBAR: Error saving list after deletion:", error);
            // Optionally try to re-render anyway or show error
            renderPrompts();
        });
}


/**
 * Attaches drag-and-drop event listeners to the prompt list container.
 */
function attachDragListeners() {
  const listElement = document.getElementById("prompt-list");
  if (!listElement) return;

  let draggedItem = null; // The DOM element being dragged
  let dragStartIndex = -1; // The original index in the `promptList` array

  // --- Drag Start ---
  listElement.addEventListener("dragstart", (e) => {
    // Only allow dragging on the handle or the item itself if needed
    if (!e.target.classList.contains('drag-handle') && !e.target.classList.contains('prompt-item')) {
       // e.preventDefault(); // Uncomment if only handle should initiate drag
       return;
    }
    draggedItem = e.target.closest(".prompt-item");
    if (!draggedItem) return;

    // Store the original index from the dataset
    dragStartIndex = parseInt(draggedItem.dataset.index, 10);
    console.log(`SIDEBAR: Drag Start - Index: ${dragStartIndex}`);

    // Add dragging class slightly after drag starts for visual feedback
    setTimeout(() => {
        if (draggedItem) draggedItem.classList.add("dragging");
    }, 0);
  });

  // --- Drag End ---
  listElement.addEventListener("dragend", (e) => {
    // Clean up dragging class and state variables
    const itemToEnd = draggedItem || document.querySelector(".dragging");
    if (itemToEnd) {
        itemToEnd.classList.remove("dragging");
    }
    draggedItem = null;
    dragStartIndex = -1;
  });

  // --- Drag Over ---
  listElement.addEventListener("dragover", (e) => {
    e.preventDefault(); // Necessary to allow dropping
    const afterElement = getDragAfterElement(listElement, e.clientY);
    const currentDraggable = document.querySelector(".dragging");
    if (!currentDraggable) return;

    // Insert the dragged item visually before the element it's hovering over
    if (afterElement == null) {
      listElement.appendChild(currentDraggable); // Append to end if hovering below all items
    } else {
      listElement.insertBefore(currentDraggable, afterElement);
    }
  });

  // --- Drop ---
  listElement.addEventListener("drop", (e) => {
    e.preventDefault();
    // Ensure drag started correctly and we have the start index
    if (dragStartIndex === -1 || !draggedItem) {
        console.error("SIDEBAR: Drop event occurred without a valid drag start.");
        if (draggedItem) draggedItem.classList.remove("dragging"); // Clean up class just in case
        draggedItem = null;
        return;
    }

    // Calculate the new index based on the final DOM position
    const newIndex = Array.from(listElement.children).indexOf(draggedItem);
    console.log(`SIDEBAR: Drop - Old Index: ${dragStartIndex}, New Index: ${newIndex}`);

    // Validate indices before modifying the array
    if (newIndex === -1 || dragStartIndex < 0 || dragStartIndex >= promptList.length) {
        console.error("SIDEBAR: Invalid index calculated on drop.");
        renderPrompts(); // Re-render to reset UI state
        // Reset state variables
        draggedItem.classList.remove("dragging");
        draggedItem = null;
        dragStartIndex = -1;
        return;
    }

    // Only proceed if the index actually changed
    if (dragStartIndex !== newIndex) {
        console.log(`SIDEBAR: Attempting to move item FROM index ${dragStartIndex} TO index ${newIndex}`);
        console.log("SIDEBAR: Item to move:", JSON.stringify(promptList[dragStartIndex]));

        // Update the underlying promptList array
        const [reorderedItem] = promptList.splice(dragStartIndex, 1); // Remove from old position
        if (reorderedItem) {
            console.log("SIDEBAR: Item successfully removed from old position.");
            promptList.splice(newIndex, 0, reorderedItem); // Insert at new position
            console.log("SIDEBAR: Item successfully inserted into new position.");

            console.log("SIDEBAR: Saving reordered list:", promptList);

            // Save the reordered list to storage
            chrome.storage.local.set({ prompts: promptList })
              .then(() => {
                console.log("SIDEBAR: Reordered list saved successfully.");
                // Re-render AFTER saving is confirmed to ensure UI reflects saved state
                // and updates dataset.index attributes correctly for next drag.
                renderPrompts();
              })
              .catch(error => {
                console.error("SIDEBAR: Error saving reordered list:", error);
                // Re-render to revert visual changes if save fails
                renderPrompts();
              });
        } else {
            console.error("SIDEBAR: Failed to splice item from original position.");
            renderPrompts(); // Re-render to reset state
        }
    } else {
        console.log("SIDEBAR: Item dropped in the same position, no change needed.");
        // Ensure dragging class is removed even if position didn't change
         if (draggedItem) draggedItem.classList.remove("dragging");
    }

    // Reset state variables after drop logic is complete
    draggedItem = null;
    dragStartIndex = -1;
  });
}

/**
 * Helper function for drag-and-drop to determine which element
 * the dragged item should be placed before.
 * @param {HTMLElement} container - The list container element.
 * @param {number} y - The vertical mouse coordinate within the viewport.
 * @returns {HTMLElement|null} The element to insert before, or null to append at the end.
 */
function getDragAfterElement(container, y) {
  // Get all draggable items *except* the one currently being dragged
  const draggableElements = [
    ...container.querySelectorAll(".prompt-item:not(.dragging)"),
  ];

  // Find the element whose vertical center is closest below the mouse position
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      // Calculate vertical distance from mouse y to the center of the element
      const offset = y - box.top - box.height / 2;
      // If the element is below the mouse (offset < 0) and closer than the previous closest
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest; // Keep the previous closest
      }
    },
    { offset: Number.NEGATIVE_INFINITY } // Initial closest is infinitely far away
  ).element; // Return the element associated with the closest offset
}

/**
 * Handles the click event for the 'Add Prompt' / 'Save Prompt' button.
 * Toggles the visibility of the add prompt form or saves the new prompt.
 */
function handleAddPromptToggle() {
  const addPromptForm = document.getElementById("add-prompt-form");
  const addPromptBtn = document.getElementById("add-prompt-btn");
  const titleInput = document.getElementById("new-prompt-title");
  const textInput = document.getElementById("new-prompt-text");

  if (!addPromptForm || !addPromptBtn || !titleInput || !textInput) {
      console.error("SIDEBAR: Add prompt elements not found.");
      return;
  }

  if (!isAddingPrompt) {
    // Show the form
    addPromptForm.style.display = "block";
    addPromptBtn.textContent = "Save Prompt";
    titleInput.value = ""; // Clear fields
    textInput.value = "";
    titleInput.focus(); // Focus on title field
    isAddingPrompt = true;
  } else {
    // Save the prompt
    const title = titleInput.value.trim(); // Trim whitespace
    const text = textInput.value.trim();
    if (title && text) { // Ensure both fields have content
      // Add the new prompt to the beginning of the list
      // Generate a simple pseudo-ID for potential future use (optional)
      const newPrompt = { id: `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`, title, text };
      promptList.unshift(newPrompt);

      // Save the updated list to storage
      chrome.storage.local.set({ prompts: promptList })
        .then(() => {
          console.log("SIDEBAR: New prompt saved.");
          renderPrompts(); // Re-render the list
          // Hide form and reset button/state
          addPromptForm.style.display = "none";
          addPromptBtn.textContent = "Add Prompt";
          isAddingPrompt = false;
        })
        .catch(error => {
           console.error("SIDEBAR: Error saving new prompt:", error);
           // Optionally inform user
        });
    } else {
        // Optionally provide feedback if fields are empty
        console.warn("SIDEBAR: Title and text cannot be empty to save prompt.");
        // Maybe add visual feedback later (e.g., red border)
    }
  }
}

/**
 * Handles the click event for the 'Import Prompts' button.
 * Triggers the hidden file input click.
 */
function handleImportClick() {
  const importFileInput = document.getElementById("import-file");
  if (importFileInput) {
      importFileInput.click();
  } else {
      console.error("SIDEBAR: Import file input not found.");
  }
}

/**
 * Handles the 'change' event for the hidden file input.
 * Reads the selected JSON file, parses it, saves to storage, and re-renders.
 * @param {Event} event - The change event object.
 */
function handleFileImport(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedPrompts = JSON.parse(e.target.result);
        // Basic validation: Check if it's an array
        if (!Array.isArray(importedPrompts)) {
            throw new Error("Imported file is not a valid JSON array.");
        }
        // Optional: Further validation of prompt object structure
        // Ensure imported prompts have at least title and text
        const validPrompts = importedPrompts.filter(p => p && typeof p.title === 'string' && typeof p.text === 'string');
        if (validPrompts.length !== importedPrompts.length) {
            console.warn("SIDEBAR: Some imported prompts had invalid structure and were ignored.");
        }

        promptList = validPrompts; // Replace current list with validated prompts

        // Save the imported list to storage
        chrome.storage.local.set({ prompts: promptList })
          .then(() => {
            console.log("SIDEBAR: Prompts imported and saved successfully.");
            renderPrompts(); // Re-render the list
            alert("Prompts imported successfully!");
          })
          .catch(error => {
             console.error("SIDEBAR: Error saving imported prompts:", error);
             alert("Error saving imported prompts.");
          });
      } catch (error) {
        console.error("SIDEBAR: Error parsing imported file:", error);
        alert(
          "Error importing prompts. Please make sure the file contains a valid JSON array of prompts (each with 'title' and 'text')."
        );
      } finally {
          // Reset file input value to allow importing the same file again if needed
          event.target.value = null;
      }
    };
    reader.onerror = (e) => {
        console.error("SIDEBAR: Error reading file:", e);
        alert("Error reading the selected file.");
    };
    reader.readAsText(file); // Read file content as text
  }
}

/**
 * Handles the click event for the 'Export Prompts' button.
 * Creates a JSON file from the current prompt list and triggers a download.
 */
function handleExportClick() {
  try {
    // Ensure promptList is an array before stringifying
    const dataToExport = Array.isArray(promptList) ? promptList : [];
    const dataStr = JSON.stringify(dataToExport, null, 2); // Pretty print JSON
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = "souffleur_prompts.json"; // More specific name

    // Create a temporary link element to trigger download
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    document.body.appendChild(linkElement); // Required for Firefox link click simulation
    linkElement.click();
    document.body.removeChild(linkElement); // Clean up link
    console.log("SIDEBAR: Export initiated.");
  } catch (error) {
      console.error("SIDEBAR: Error during export:", error);
      alert("Failed to export prompts.");
  }
}


// --- Initial Setup ---

// Add main button listeners once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById("add-prompt-btn");
    const importBtn = document.getElementById("import-prompts");
    const exportBtn = document.getElementById("export-prompts");
    const fileInput = document.getElementById("import-file");

    if (addBtn) addBtn.addEventListener("click", handleAddPromptToggle);
    if (importBtn) importBtn.addEventListener("click", handleImportClick);
    if (exportBtn) exportBtn.addEventListener("click", handleExportClick);
    if (fileInput) fileInput.addEventListener("change", handleFileImport);

    // Initial loading of prompts from storage
    loadPrompts();
});