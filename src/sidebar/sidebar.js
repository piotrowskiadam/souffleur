// Global state variables
let promptList = []; // In-memory array of prompt objects {id: string, title: string, text: string}
let isAddingPrompt = false; // Flag to track if the 'Add Prompt' form is active

const browserApi = typeof browser !== 'undefined' ? browser : chrome;
const isFirefox = typeof browser !== 'undefined' && typeof browser.sidebarAction !== 'undefined';

// Default prompts to initialize storage with on first load if empty.
const INITIAL_PROMPTS = [
  {
    id: "tutorial-welcome",
    title: "💡 Welcome to Souffleur!",
    text: "Welcome to your new spatial prompt manager! Here is how to get started:\n\n1. Press Ctrl+Shift+Y (Chrome) or Ctrl+Alt+P (Firefox) to open the Side Panel/Sidebar to add, edit, or import prompts.\n2. Open this Spotlight Search overlay on any webpage by pressing Ctrl+Shift+U (Chrome) or Ctrl+Alt+1 (Firefox).\n3. Type to filter your prompts, use Arrow keys to navigate, and press Enter to instantly copy to your clipboard.\n\nTry it now: select this prompt and press Enter to copy it!"
  },
  {
    id: "example-code-review",
    title: "📝 Example: Code Review Template",
    text: "Act as a senior software engineer. Review the following code for security vulnerabilities, style issues, and performance bottlenecks. Suggest concrete refactoring changes:\n\n[insert your code here]"
  }
];

/**
 * Loads prompts from sync extension storage and initiates rendering.
 */
function loadPrompts() {
  browserApi.storage.sync.get("prompts")
    .then((result) => {
      if (!result.prompts || result.prompts.length === 0) {
        console.log("SIDEBAR: Storage empty, populating default prompts...");
        return browserApi.storage.sync.set({ prompts: INITIAL_PROMPTS })
          .then(() => {
            promptList = INITIAL_PROMPTS;
            renderPrompts();
            attachDragListeners();
          });
      }
      promptList = result.prompts;
      console.log("SIDEBAR: Prompts loaded from sync storage:", promptList);
      renderPrompts();
      attachDragListeners();
    })
    .catch(error => {
      console.error("SIDEBAR: Error loading prompts from sync storage:", error);
      promptList = [];
      renderPrompts();
    });
}

/**
 * Truncates text to a specified maximum length.
 */
function truncateText(text, maxLength = 150) {
  if (typeof text !== 'string') return '';
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "...";
  }
  return text;
}

/**
 * Renders the current `promptList` array into the sidebar's container.
 */
function renderPrompts() {
  const list = document.getElementById("prompt-list");
  if (!list) {
    console.error("SIDEBAR: Cannot render prompts, list element not found.");
    return;
  }
  list.innerHTML = "";

  promptList.forEach((prompt, index) => {
    const truncatedText = truncateText(prompt.text || "");

    const promptElement = document.createElement("div");
    promptElement.className = "prompt-item";
    promptElement.draggable = true;
    promptElement.dataset.index = index;
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
  
  attachPromptListeners();
}

/**
 * Attaches event listeners to copy, edit, and delete buttons.
 */
function attachPromptListeners() {
  // Copy buttons
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.replaceWith(btn.cloneNode(true));
  });
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", handleCopyClick);
  });

  // Edit buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.replaceWith(btn.cloneNode(true));
  });
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", handleEditClick);
  });

  // Delete buttons
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.replaceWith(btn.cloneNode(true));
  });
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", handleDeleteClick);
  });
}

/**
 * Handles Copy button clicks.
 */
function handleCopyClick(e) {
  const index = parseInt(e.currentTarget.getAttribute("data-index"), 10);
  if (isNaN(index) || index < 0 || index >= promptList.length) return;

  const textToCopy = promptList[index].text;
  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      console.log("SIDEBAR: Text copied to clipboard.");
      const copiedLabel = e.currentTarget.querySelector(".copied-label");
      if (copiedLabel) {
        copiedLabel.classList.add("show");
        setTimeout(() => {
          copiedLabel.classList.remove("show");
        }, 1500);
      }
    })
    .catch(err => {
      console.error("SIDEBAR: Failed to copy text:", err);
    });
}

/**
 * Handles Edit button clicks. Opens edit mode.
 */
function handleEditClick(e) {
  const index = parseInt(e.currentTarget.getAttribute("data-index"), 10);
  if (isNaN(index) || index < 0 || index >= promptList.length) return;

  const prompt = promptList[index];
  const promptElement = e.currentTarget.closest(".prompt-item");
  const promptContent = promptElement.querySelector(".prompt-content");

  if (promptElement.querySelector(".edit-form")) return;

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

  if (promptContent) promptContent.style.display = "none";
  promptElement.appendChild(editForm);

  const saveBtn = editForm.querySelector(".save-btn");
  const cancelBtn = editForm.querySelector(".cancel-btn");
  const editTitleInput = editForm.querySelector(".edit-title");
  const editTextarea = editForm.querySelector(".edit-text");

  saveBtn.addEventListener("click", () => {
    const newTitle = editTitleInput.value.trim();
    const newText = editTextarea.value.trim();

    if (newTitle && newText) {
      promptList[index] = { 
        id: prompt.id || `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: newTitle, 
        text: newText 
      };

      browserApi.storage.sync.set({ prompts: promptList })
        .then(() => {
          console.log("SIDEBAR: Prompt updated and saved.");
          renderPrompts();
        })
        .catch(error => {
          console.error("SIDEBAR: Error saving updated prompt:", error);
          if (promptContent) promptContent.style.display = "block";
          promptElement.removeChild(editForm);
        });
    } else {
      alert("Title and prompt text cannot be empty.");
    }
  });

  cancelBtn.addEventListener("click", () => {
    promptElement.removeChild(editForm);
    if (promptContent) promptContent.style.display = "block";
  });
}

/**
 * Handles Delete button clicks.
 */
function handleDeleteClick(e) {
  const index = parseInt(e.currentTarget.getAttribute("data-index"), 10);
  if (isNaN(index) || index < 0 || index >= promptList.length) return;

  if (confirm("Are you sure you want to delete this prompt?")) {
    promptList.splice(index, 1);

    browserApi.storage.sync.set({ prompts: promptList })
      .then(() => {
        console.log("SIDEBAR: Prompt deleted.");
        renderPrompts();
      })
      .catch(error => {
        console.error("SIDEBAR: Error deleting prompt:", error);
        renderPrompts();
      });
  }
}

/**
 * Drag-and-drop listener registry.
 */
function attachDragListeners() {
  const listElement = document.getElementById("prompt-list");
  if (!listElement) return;

  let draggedItem = null;
  let dragStartIndex = -1;

  listElement.addEventListener("dragstart", (e) => {
    draggedItem = e.target.closest(".prompt-item");
    if (!draggedItem) return;

    dragStartIndex = parseInt(draggedItem.dataset.index, 10);
    setTimeout(() => {
      if (draggedItem) draggedItem.classList.add("dragging");
    }, 0);
  });

  listElement.addEventListener("dragend", (e) => {
    const itemToEnd = draggedItem || document.querySelector(".dragging");
    if (itemToEnd) {
      itemToEnd.classList.remove("dragging");
    }
    draggedItem = null;
    dragStartIndex = -1;
  });

  listElement.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(listElement, e.clientY);
    const currentDraggable = document.querySelector(".dragging");
    if (!currentDraggable) return;

    if (afterElement == null) {
      listElement.appendChild(currentDraggable);
    } else {
      listElement.insertBefore(currentDraggable, afterElement);
    }
  });

  listElement.addEventListener("drop", (e) => {
    e.preventDefault();
    if (dragStartIndex === -1 || !draggedItem) {
      if (draggedItem) draggedItem.classList.remove("dragging");
      draggedItem = null;
      return;
    }

    const newIndex = Array.from(listElement.children).indexOf(draggedItem);

    if (newIndex === -1 || dragStartIndex < 0 || dragStartIndex >= promptList.length) {
      renderPrompts();
      draggedItem.classList.remove("dragging");
      draggedItem = null;
      dragStartIndex = -1;
      return;
    }

    if (dragStartIndex !== newIndex) {
      const [reorderedItem] = promptList.splice(dragStartIndex, 1);
      if (reorderedItem) {
        promptList.splice(newIndex, 0, reorderedItem);

        browserApi.storage.sync.set({ prompts: promptList })
          .then(() => {
            renderPrompts();
          })
          .catch(error => {
            console.error("SIDEBAR: Error saving drag order:", error);
            renderPrompts();
          });
      }
    } else {
      if (draggedItem) draggedItem.classList.remove("dragging");
    }

    draggedItem = null;
    dragStartIndex = -1;
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".prompt-item:not(.dragging)"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

/**
 * Handles Add/Save prompt toggle.
 */
function handleAddPromptToggle() {
  const addPromptForm = document.getElementById("add-prompt-form");
  const addPromptBtn = document.getElementById("add-prompt-btn");
  const titleInput = document.getElementById("new-prompt-title");
  const textInput = document.getElementById("new-prompt-text");

  if (!addPromptForm || !addPromptBtn || !titleInput || !textInput) return;

  if (!isAddingPrompt) {
    addPromptForm.style.display = "block";
    addPromptBtn.textContent = "Save Prompt";
    titleInput.value = "";
    textInput.value = "";
    titleInput.focus();
    isAddingPrompt = true;
  } else {
    const title = titleInput.value.trim();
    const text = textInput.value.trim();

    if (title && text) {
      const newPrompt = {
        id: `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        text
      };
      promptList.unshift(newPrompt);

      browserApi.storage.sync.set({ prompts: promptList })
        .then(() => {
          renderPrompts();
          addPromptForm.style.display = "none";
          addPromptBtn.textContent = "Add Prompt";
          isAddingPrompt = false;
        })
        .catch(error => {
          console.error("SIDEBAR: Error saving prompt:", error);
        });
    } else {
      alert("Title and prompt text cannot be empty.");
    }
  }
}

/**
 * Handles the Import button triggers.
 */
function handleImportClick() {
  const importFileInput = document.getElementById("import-file");
  if (importFileInput) {
    importFileInput.click();
  }
}

/**
 * Parses and validates imported JSON data.
 */
function handleFileImport(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedPrompts = JSON.parse(e.target.result);
        if (!Array.isArray(importedPrompts)) {
          throw new Error("Imported file is not a valid JSON array.");
        }

        // Validate and filter imported entries (ensuring title & text are strings)
        const validPrompts = importedPrompts.filter(p => p && typeof p.title === 'string' && typeof p.text === 'string');
        if (validPrompts.length !== importedPrompts.length) {
          console.warn("SIDEBAR: Staggered structure import cleanup completed.");
        }

        // Give them unique IDs if they don't have one
        promptList = validPrompts.map(p => ({
          id: p.id || `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          title: p.title,
          text: p.text
        }));

        browserApi.storage.sync.set({ prompts: promptList })
          .then(() => {
            renderPrompts();
            alert("Prompts imported successfully!");
          })
          .catch(error => {
            console.error("SIDEBAR: Error saving imported prompts:", error);
            alert("Error saving imported prompts.");
          });
      } catch (error) {
        console.error("SIDEBAR: Error parsing imported file:", error);
        alert("Error importing prompts. Make sure the file contains a valid JSON array of prompts.");
      } finally {
        event.target.value = null;
      }
    };
    reader.readAsText(file);
  }
}

/**
 * Exports prompt list to JSON.
 */
function handleExportClick() {
  try {
    const dataToExport = Array.isArray(promptList) ? promptList : [];
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = "souffleur_prompts.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    console.log("SIDEBAR: Export initiated.");
  } catch (error) {
    console.error("SIDEBAR: Error during export:", error);
    alert("Failed to export prompts.");
  }
}

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById("add-prompt-btn");
  const importBtn = document.getElementById("import-prompts");
  const exportBtn = document.getElementById("export-prompts");
  const fileInput = document.getElementById("import-file");
  const instruction = document.getElementById("shortcut-instruction");

  if (addBtn) addBtn.addEventListener("click", handleAddPromptToggle);
  if (importBtn) importBtn.addEventListener("click", handleImportClick);
  if (exportBtn) exportBtn.addEventListener("click", handleExportClick);
  if (fileInput) fileInput.addEventListener("change", handleFileImport);

  // Set the shortcut instruction text dynamically based on the browser platform
  if (instruction) {
    instruction.textContent = isFirefox 
      ? "Press Ctrl+Alt+1 to open prompt spotlight" 
      : "Press Ctrl+Shift+U to open prompt spotlight";
  }

  loadPrompts();
});
