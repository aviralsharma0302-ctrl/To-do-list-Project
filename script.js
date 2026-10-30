
/* =========================================
   TASKLY - COMPLETE JAVASCRIPT
========================================= */

"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const STORAGE_KEY = "taskly_tasks_v2";
const THEME_KEY = "taskly_theme_v2";
const CATEGORY_KEY = "taskly_categories_v2";

const DEFAULT_CATEGORIES = ["Work", "Personal", "Study", "Health"];

let tasks = loadJSON(STORAGE_KEY, []);
let categories = loadJSON(CATEGORY_KEY, DEFAULT_CATEGORIES);
let currentView = "all";
let currentCategory = "All";
let editingTaskId = null;
let toastTimeout = null;

function loadJSON(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch (error) {
    console.warn("Could not load saved data:", error);
    return fallback;
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    showToast("Unable to save tasks in this browser.");
  }
}

function saveCategories() {
  try {
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
  } catch (error) {
    showToast("Unable to save categories.");
  }
}

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

/* ---------- Theme / Dark Mode ---------- */

function applyTheme(theme) {
  const dark = theme === "dark";

  document.body.classList.toggle("dark-mode", dark);

  $("#themeIcon").textContent = dark ? "☀" : "☾";
  $("#themeLabel").textContent = dark ? "Light mode" : "Dark mode";

  const metaTheme = $('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", dark ? "#11131d" : "#635bff");
  }

  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch (error) {
    // Theme still works for this page even if storage is unavailable.
  }
}

function initializeTheme() {
  let savedTheme = "light";

  try {
    savedTheme = localStorage.getItem(THEME_KEY) || "light";
  } catch (error) {
    // Use the default theme.
  }

  applyTheme(savedTheme);
}

$("#themeToggle").addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark-mode");
  applyTheme(isDark ? "light" : "dark");
});

/* ---------- Date / Greeting ---------- */

function initializeHeader() {
  const now = new Date();

  $("#todayLabel").textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).toUpperCase();

  const hour = now.getHours();
  const greeting = hour < 12
    ? "Good morning"
    : hour < 17
      ? "Good afternoon"
      : "Good evening";

  $("#greeting").innerHTML =
    `${greeting}<span class="heading-dot">.</span>`;
}

/* ---------- Task Modal ---------- */

function openTaskModal(task = null) {
  editingTaskId = task ? task.id : null;

  $("#taskForm").reset();
  updateCategorySelect();

  $("#modalTitle").textContent = task ? "Edit task" : "Create a task";
  $("#saveTaskBtn").textContent = task ? "Update task" : "Save task";

  if (task) {
    $("#taskTitle").value = task.title || "";
    $("#taskDescription").value = task.description || "";
    $("#taskCategory").value = task.category || categories[0] || "Work";
    $("#taskPriority").value = task.priority || "medium";
    $("#taskDueDate").value = task.dueDate || "";
  } else {
    $("#taskCategory").value = categories.includes("Work")
      ? "Work"
      : categories[0] || "Work";
    $("#taskPriority").value = "medium";
  }

  $("#taskModal").hidden = false;
  document.body.style.overflow = "hidden";

  // Focus the title field so users can start typing immediately.
  requestAnimationFrame(() => $("#taskTitle").focus());
}

function closeTaskModal() {
  $("#taskModal").hidden = true;
  document.body.style.overflow = "";
  editingTaskId = null;
}

$("#addTaskBtn").addEventListener("click", () => openTaskModal());
$("#emptyAddBtn").addEventListener("click", () => openTaskModal());
$("#closeModalBtn").addEventListener("click", closeTaskModal);
$("#cancelModalBtn").addEventListener("click", closeTaskModal);

$("#taskModal").addEventListener("click", (event) => {
  if (event.target === $("#taskModal")) {
    closeTaskModal();
  }
});

/* ---------- Create / Update Task ---------- */

$("#taskForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const title = $("#taskTitle").value.trim();

  if (!title) {
    $("#taskTitle").focus();
    showToast("Please enter a task title.");
    return;
  }

  const taskData = {
    title,
    description: $("#taskDescription").value.trim(),
    category: $("#taskCategory").value,
    priority: $("#taskPriority").value,
    dueDate: $("#taskDueDate").value
  };

  if (editingTaskId) {
    const task = tasks.find((item) => item.id === editingTaskId);

    if (task) {
      Object.assign(task, taskData);
      showToast("Task updated successfully.");
    }
  } else {
    tasks.unshift({
      id: makeId(),
      ...taskData,
      completed: false,
      createdAt: Date.now()
    });

    showToast("Task added successfully.");
  }

  saveTasks();
  renderTasks();
  closeTaskModal();
});

/* ---------- Task Actions ---------- */

function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  renderTasks();

  showToast(task.completed ? "Task completed!" : "Task marked as pending.");
}

function editTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (task) openTaskModal(task);
}

function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  if (!window.confirm(`Delete "${task.title}"?`)) return;

  tasks = tasks.filter((item) => item.id !== id);
  saveTasks();
  renderTasks();
  showToast("Task deleted.");
}

function clearCompleted() {
  const completedCount = tasks.filter((task) => task.completed).length;

  if (!completedCount) {
    showToast("There are no completed tasks to clear.");
    return;
  }

  if (!window.confirm(`Delete all ${completedCount} completed task(s)?`)) {
    return;
  }

  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
  showToast("Completed tasks cleared.");
}

$("#clearCompletedBtn").addEventListener("click", clearCompleted);

/* ---------- Categories ---------- */

function updateCategorySelect() {
  const select = $("#taskCategory");
  const previous = select.value;

  select.innerHTML = categories.map((category) =>
    `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
  ).join("");

  if (categories.includes(previous)) {
    select.value = previous;
  }
}

function renderCategories() {
  const list = $("#categoryList");

  const buttons = [
    `<button class="category-chip ${currentCategory === "All" ? "active" : ""}" data-category="All">All categories</button>`,
    ...categories.map((category) => `
      <button
        class="category-chip ${currentCategory === category ? "active" : ""}"
        data-category="${escapeHTML(category)}">
        ${escapeHTML(category)}
      </button>
    `)
  ];

  list.innerHTML = buttons.join("");

  updateCategorySelect();
}

function openCategoryModal() {
  $("#categoryForm").reset();
  $("#categoryModal").hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => $("#newCategoryName").focus());
}

function closeCategoryModal() {
  $("#categoryModal").hidden = true;
  document.body.style.overflow = "";
}

$("#addCategoryBtn").addEventListener("click", openCategoryModal);
$("#closeCategoryModalBtn").addEventListener("click", closeCategoryModal);
$("#cancelCategoryBtn").addEventListener("click", closeCategoryModal);

$("#categoryModal").addEventListener("click", (event) => {
  if (event.target === $("#categoryModal")) {
    closeCategoryModal();
  }
});

$("#categoryForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("#newCategoryName").value.trim();

  if (!name) {
    $("#newCategoryName").focus();
    return;
  }

  const exists = categories.some(
    (category) => category.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    showToast("That category already exists.");
    return;
  }

  categories.push(name);
  currentCategory = name;

  saveCategories();
  renderCategories();
  renderTasks();
  closeCategoryModal();

  showToast("Category added.");
});

$("#categoryList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  currentCategory = button.dataset.category;
  renderCategories();
  renderTasks();
});

/* ---------- Navigation ---------- */

$$(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    currentView = button.dataset.view;

    $$(".nav-item").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    renderTasks();
  });
});

/* ---------- Search / Filters ---------- */

$("#searchInput").addEventListener("input", renderTasks);
$("#priorityFilter").addEventListener("change", renderTasks);
$("#sortSelect").addEventListener("change", renderTasks);

function getVisibleTasks() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const priority = $("#priorityFilter").value;
  const sort = $("#sortSelect").value;

  let result = tasks.filter((task) => {
    const matchesView =
      currentView === "all" ||
      (currentView === "pending" && !task.completed) ||
      (currentView === "completed" && task.completed);

    const matchesCategory =
      currentCategory === "All" ||
      task.category === currentCategory;

    const matchesPriority =
      priority === "all" ||
      task.priority === priority;

    const searchable = [
      task.title,
      task.description,
      task.category,
      task.priority
    ].join(" ").toLowerCase();

    const matchesSearch = searchable.includes(query);

    return matchesView && matchesCategory &&
      matchesPriority && matchesSearch;
  });

  if (sort === "newest") {
    result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } else if (sort === "oldest") {
    result.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  } else if (sort === "dueDate") {
    result.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  } else if (sort === "priority") {
    const rank = { high: 0, medium: 1, low: 2 };
    result.sort((a, b) =>
      (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3)
    );
  }

  return result;
}

/* ---------- Render Tasks ---------- */

function formatDueDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear()
      ? "numeric"
      : undefined
  });
}

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return new Date(`${task.dueDate}T00:00:00`) < today;
}

function taskHTML(task) {
  const priority = ["low", "medium", "high"].includes(task.priority)
    ? task.priority
    : "medium";

  const dueDate = task.dueDate
    ? `<span class="task-due-date ${isOverdue(task) ? "overdue" : ""}">
         ${isOverdue(task) ? "Overdue · " : "Due · "}${escapeHTML(formatDueDate(task.dueDate))}
       </span>`
    : "";

  return `
    <article class="task-card ${task.completed ? "completed" : ""}" data-id="${escapeHTML(task.id)}">
      <input
        class="task-checkbox"
        type="checkbox"
        aria-label="Mark ${escapeHTML(task.title)} as ${task.completed ? "pending" : "completed"}"
        ${task.completed ? "checked" : ""}>

      <div class="task-content">
        <h3 class="task-title">${escapeHTML(task.title)}</h3>
        ${task.description
          ? `<p class="task-description">${escapeHTML(task.description)}</p>`
          : ""}
        <div class="task-meta">
          <span class="task-category">${escapeHTML(task.category || "Personal")}</span>
          <span class="task-priority ${priority}">${priority[0].toUpperCase() + priority.slice(1)} priority</span>
          ${dueDate}
        </div>
      </div>

      <div class="task-actions">
        <button type="button" class="edit-btn" aria-label="Edit task" title="Edit task">✎</button>
        <button type="button" class="delete-btn" aria-label="Delete task" title="Delete task">⌫</button>
      </div>
    </article>
  `;
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
  const pending = tasks.filter((task) => !task.completed).length;
  const completed = tasks.filter((task) => task.completed).length;
  const total = tasks.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  $("#allCount").textContent = total;
  $("#pendingCount").textContent = pending;
  $("#completedCount").textContent = completed;

  $("#totalStat").textContent = total;
  $("#pendingStat").textContent = pending;
  $("#completedStat").textContent = completed;
  $("#progressStat").textContent = `${progress}%`;
  $("#progressBar").style.width = `${progress}%`;

  const titles = {
    all: "All tasks",
    pending: "Pending tasks",
    completed: "Completed tasks"
  };

  $("#taskSectionTitle").textContent =
    currentCategory === "All"
      ? titles[currentView]
      : currentCategory;

  $("#visibleCount").textContent = visibleTasks.length;

  $("#tasksList").innerHTML = visibleTasks.map(taskHTML).join("");
  $("#emptyState").hidden = visibleTasks.length !== 0;

  if (!visibleTasks.length) {
    const hasTasks = tasks.length > 0;
    $("#emptyTitle").textContent = hasTasks
      ? "No tasks found"
      : "Your day starts here";

    $("#emptyMessage").textContent = hasTasks
      ? "Try changing your search or filters."
      : "Add your first task and start making progress.";

    $("#emptyAddBtn").textContent = hasTasks
      ? "+ Add a task"
      : "+ Add your first task";
  }

  $("#clearCompletedBtn").disabled = completed === 0;
}

/* Event delegation makes task buttons work after rerendering. */
$("#tasksList").addEventListener("click", (event) => {
  const card = event.target.closest(".task-card");
  if (!card) return;

  const id = card.dataset.id;

  if (event.target.closest(".edit-btn")) {
    editTask(id);
  } else if (event.target.closest(".delete-btn")) {
    deleteTask(id);
  }
});

$("#tasksList").addEventListener("change", (event) => {
  if (!event.target.matches(".task-checkbox")) return;

  const card = event.target.closest(".task-card");
  if (card) toggleTask(card.dataset.id);
});

/* ---------- Toast Notifications ---------- */

function showToast(message) {
  const toast = $("#toast");

  toast.textContent = message;
  toast.hidden = false;

  if (toastTimeout) clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

/* ---------- Keyboard Shortcuts ---------- */

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!$("#taskModal").hidden) closeTaskModal();
    if (!$("#categoryModal").hidden) closeCategoryModal();
  }

  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "k"
  ) {
    event.preventDefault();
    $("#searchInput").focus();
  }
});

/* ---------- Initialize App ---------- */

initializeTheme();
initializeHeader();
renderCategories();
renderTasks();
