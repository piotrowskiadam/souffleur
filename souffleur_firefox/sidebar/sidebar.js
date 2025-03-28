let promptList = [];
let isAddingPrompt = false;

// Load prompts from storage
function loadPrompts() {
  chrome.storage.local.get("prompts").then((result) => { // Use chrome.storage
    promptList = result.prompts || [];
    renderPrompts();
    attachDragListeners();
  });
}

// Function to truncate prompt text to a maximum of 150 characters and add "..."
function truncateText(text, maxLength = 150) {
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "...";
  }
  return text;
}

// Render the prompts in the sidebar
function renderPrompts() {
  const list = document.getElementById("prompt-list");
  list.innerHTML = "";

  promptList.forEach((prompt, index) => {
    const truncatedText = truncateText(prompt.text);

    const promptElement = document.createElement("div");
    promptElement.className = "prompt-item";
    promptElement.draggable = true;
    promptElement.dataset.index = index;
    promptElement.innerHTML = `
      <div class="drag-handle"></div>
      <div class="prompt-content">
        <h3>${prompt.title}</h3>
        <p>${truncatedText}</p>
        <div class="prompt-buttons">
          <button class="copy-btn" data-index="${index}">
            Copy
            <span class="copied-label">Copied!</span>
          </button>
          <button class="edit-btn" data-index="${index}">Edit</button>
          <button class="delete-btn" data-index="${index}">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(promptElement);
  });
  attachPromptListeners();
}

// Attach listeners for Copy, Edit, and Delete buttons
function attachPromptListeners() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = e.target.getAttribute("data-index");
      navigator.clipboard.writeText(promptList[index].text);

      const copiedLabel = e.target.querySelector(".copied-label");
      copiedLabel.classList.add("show");

      setTimeout(() => {
        copiedLabel.classList.remove("show");
      }, 2000);
    });
  });

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = e.target.getAttribute("data-index");
      const prompt = promptList[index];

      // Create edit form
      const editForm = document.createElement("div");
      editForm.className = "edit-form";
      editForm.innerHTML = `
        <input type="text" class="edit-title" value="${prompt.title}" placeholder="Prompt Title" />
        <textarea class="edit-text" placeholder="Enter your prompt here">${prompt.text}</textarea>
        <div class="edit-buttons">
          <button class="save-btn">Save</button>
          <button class="cancel-btn">Cancel</button>
        </div>
      `;

      // Replace prompt content with edit form
      const promptElement = e.target.closest(".prompt-item");
      const promptContent = promptElement.querySelector(".prompt-content");
      promptContent.style.display = "none";
      promptElement.appendChild(editForm);

      // Add event listeners to save and cancel buttons
      const saveBtn = editForm.querySelector(".save-btn");
      const cancelBtn = editForm.querySelector(".cancel-btn");

      saveBtn.addEventListener("click", () => {
        const newTitle = editForm.querySelector(".edit-title").value;
        const newText = editForm.querySelector(".edit-text").value;

        promptList[index] = { title: newTitle, text: newText };
        chrome.storage.local.set({ prompts: promptList }).then(() => { // Use chrome.storage
          renderPrompts();
        });
      });

      cancelBtn.addEventListener("click", () => {
        promptElement.removeChild(editForm);
        promptContent.style.display = "block";
      });
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = e.target.getAttribute("data-index");
      promptList.splice(index, 1);
      chrome.storage.local.set({ prompts: promptList }).then(() => { // Use chrome.storage
        renderPrompts();
      });
    });
  });
}

// Attach drag listeners
function attachDragListeners() {
  const listElement = document.getElementById("prompt-list"); // Renamed for clarity
  let draggedItem = null;
  let dragStartIndex = -1; // Variable to store the starting index

  listElement.addEventListener("dragstart", (e) => {
    draggedItem = e.target.closest(".prompt-item");
    // Store the original index when drag starts
    dragStartIndex = parseInt(draggedItem.dataset.index);
    console.log(`SIDEBAR: Drag Start - Index: ${dragStartIndex}`); // Log start index
    // Use setTimeout to allow the browser to render the drag image before adding class
    setTimeout(() => {
        if (draggedItem) draggedItem.classList.add("dragging");
    }, 0);
  });

  listElement.addEventListener("dragend", (e) => {
    // Use draggedItem directly if available, otherwise querySelector
    const itemToEnd = draggedItem || document.querySelector(".dragging");
    if (itemToEnd) {
        itemToEnd.classList.remove("dragging");
    }
    draggedItem = null; // Reset dragged item
    dragStartIndex = -1; // Reset start index
  });

  listElement.addEventListener("dragover", (e) => {
    e.preventDefault(); // Necessary to allow drop
    const afterElement = getDragAfterElement(listElement, e.clientY);
    const currentDraggable = document.querySelector(".dragging"); // Find the element being dragged
    if (!currentDraggable) return; // Exit if no element is being dragged

    if (afterElement == null) {
      listElement.appendChild(currentDraggable);
    } else {
      listElement.insertBefore(currentDraggable, afterElement);
    }
  });

  listElement.addEventListener("drop", (e) => {
    e.preventDefault();
    if (dragStartIndex === -1 || !draggedItem) {
        console.error("SIDEBAR: Drop event occurred without a valid drag start.");
        return; // Exit if drag didn't start properly
    }

    // Calculate new index based on the final position in the DOM
    const newIndex = Array.from(listElement.children).indexOf(draggedItem);
    console.log(`SIDEBAR: Drop - Old Index: ${dragStartIndex}, New Index: ${newIndex}`); // Log indices

    if (newIndex === -1) {
        console.error("SIDEBAR: Dropped item not found in the list.");
        // Potentially reset UI or just log error
        renderPrompts(); // Re-render to reset state
        return;
    }

    // --- Debugging Logs ---
    console.log(`SIDEBAR: Attempting to move item FROM index ${dragStartIndex} TO index ${newIndex}`);
    if (dragStartIndex >= 0 && dragStartIndex < promptList.length) {
      console.log("SIDEBAR: Item to move:", JSON.stringify(promptList[dragStartIndex]));
    } else {
      console.error("SIDEBAR: dragStartIndex is out of bounds!");
    }
    // --- End Debugging Logs ---

    // Update promptList array using the stored dragStartIndex
    const [reorderedItem] = promptList.splice(dragStartIndex, 1); // Remove from old position
    if (reorderedItem) {
        console.log("SIDEBAR: Item successfully removed from old position."); // Log success
        promptList.splice(newIndex, 0, reorderedItem); // Insert at new position
        console.log("SIDEBAR: Item successfully inserted into new position."); // Log success
    } else {
        console.error("SIDEBAR: Failed to splice item from original position.");
        renderPrompts(); // Re-render to reset state
        return;
    }

    console.log("SIDEBAR: Saving reordered list:", promptList); // Added log

    // Save to storage and re-render
    chrome.storage.local.set({ prompts: promptList })
      .then(() => {
        console.log("SIDEBAR: Reordered list saved successfully."); // Added log
        // Re-render AFTER saving is confirmed to ensure UI reflects saved state
        renderPrompts();
      })
      .catch(error => {
        console.error("SIDEBAR: Error saving reordered list:", error); // Added error handling
        // Optionally re-render even on error to reset UI?
        // renderPrompts();
      });
      
    // Reset state variables after drop logic is complete
    draggedItem = null;
    dragStartIndex = -1;
  });
}

// Function to get the element after the drag
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

// Handle adding a new prompt
document.getElementById("add-prompt-btn").addEventListener("click", () => {
  const addPromptForm = document.getElementById("add-prompt-form");
  const addPromptBtn = document.getElementById("add-prompt-btn");

  if (!isAddingPrompt) {
    addPromptForm.style.display = "block";
    addPromptBtn.textContent = "Save Prompt";
    isAddingPrompt = true;
  } else {
    const title = document.getElementById("new-prompt-title").value;
    const text = document.getElementById("new-prompt-text").value;
    if (title && text) {
      promptList.unshift({ title, text });
      chrome.storage.local.set({ prompts: promptList }).then(() => { // Use chrome.storage
        renderPrompts();
        addPromptForm.style.display = "none";
        addPromptBtn.textContent = "Add Prompt";
        document.getElementById("new-prompt-title").value = "";
        document.getElementById("new-prompt-text").value = "";
        isAddingPrompt = false;
      });
    }
  }
});

// Handle importing prompts from a JSON file
document.getElementById("import-prompts").addEventListener("click", () => {
  document.getElementById("import-file").click();
});

document.getElementById("import-file").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedPrompts = JSON.parse(e.target.result);
        promptList = importedPrompts;
        chrome.storage.local.set({ prompts: promptList }).then(() => { // Use chrome.storage
          renderPrompts();
          alert("Prompts imported successfully!");
        });
      } catch (error) {
        alert(
          "Error importing prompts. Please make sure the file is valid JSON."
        );
      }
    };
    reader.readAsText(file);
  }
});

// Handle exporting prompts to a JSON file
document.getElementById("export-prompts").addEventListener("click", () => {
  const dataStr = JSON.stringify(promptList, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
  const exportFileDefaultName = "prompts.json";

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
});

// Initial loading of prompts
loadPrompts();