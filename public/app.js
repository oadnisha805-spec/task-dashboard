const API = "/api/tasks";

const $ = (id) => document.getElementById(id);
const form = $("task-form");
const listEl = $("task-list");
const messageEl = $("message");
const errorEl = $("form-error");

let tasks = [];

// ---------- API helper (async/await + fetch) ----------
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---------- READ ----------
async function loadTasks() {
  const params = new URLSearchParams();
  if ($("filter").value) params.set("status", $("filter").value);
  if ($("search").value.trim()) params.set("q", $("search").value.trim());
  try {
    tasks = await api(`${API}?${params}`);
    render();
  } catch (err) {
    showMessage("Could not load tasks: " + err.message);
  }
}

// ---------- CREATE / UPDATE ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const id = $("task-id").value;
  const body = {
    title: $("title").value,
    description: $("description").value,
    priority: $("priority").value,
    status: $("status").value,
  };

  if (!body.title.trim()) {
    errorEl.textContent = "Please enter a title.";
    $("title").focus();
    return;
  }

  const btn = $("submit-btn");
  btn.disabled = true;
  try {
    if (id) {
      await api(`${API}/${id}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      await api(API, { method: "POST", body: JSON.stringify(body) });
    }
    resetForm();
    await loadTasks();
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// ---------- DELETE ----------
async function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  try {
    await api(`${API}/${id}`, { method: "DELETE" });
    if ($("task-id").value === String(id)) resetForm();
    await loadTasks();
  } catch (err) {
    showMessage("Delete failed: " + err.message);
  }
}

// ---------- Quick status change ----------
async function setStatus(id, status) {
  try {
    await api(`${API}/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    await loadTasks();
  } catch (err) {
    showMessage("Update failed: " + err.message);
  }
}

// ---------- Edit mode ----------
function startEdit(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  $("task-id").value = t.id;
  $("title").value = t.title;
  $("description").value = t.description;
  $("priority").value = t.priority;
  $("status").value = t.status;
  $("form-title").textContent = "Edit task";
  $("submit-btn").textContent = "Save changes";
  $("cancel-btn").hidden = false;
  $("title").focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  form.reset();
  $("task-id").value = "";
  $("form-title").textContent = "Add a task";
  $("submit-btn").textContent = "Add task";
  $("cancel-btn").hidden = true;
  errorEl.textContent = "";
}
$("cancel-btn").addEventListener("click", resetForm);

// ---------- Rendering (textContent only, so no XSS) ----------
function showMessage(text) {
  messageEl.textContent = text;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const STATUS_LABEL = { todo: "To do", "in-progress": "In progress", done: "Done" };

function render() {
  listEl.replaceChildren();
  showMessage(tasks.length ? "" : "No tasks yet. Add your first one!");

  for (const t of tasks) {
    const li = el("li", `task ${t.priority} ${t.status === "done" ? "done" : ""}`);

    const top = el("div", "task-top");
    top.append(el("h3", "task-title", t.title));
    li.append(top);

    if (t.description) li.append(el("p", "task-desc", t.description));

    const badges = el("div", "badges");
    badges.append(
      el("span", `badge p-${t.priority}`, t.priority),
      el("span", "badge", STATUS_LABEL[t.status])
    );
    li.append(badges);

    const actions = el("div", "actions");
    const next =
      t.status === "todo"
        ? ["in-progress", "Start"]
        : t.status === "in-progress"
        ? ["done", "Mark done"]
        : ["todo", "Reopen"];

    const nextBtn = el("button", "btn small", next[1]);
    nextBtn.addEventListener("click", () => setStatus(t.id, next[0]));
    const editBtn = el("button", "btn small", "Edit");
    editBtn.addEventListener("click", () => startEdit(t.id));
    const delBtn = el("button", "btn small danger", "Delete");
    delBtn.addEventListener("click", () => deleteTask(t.id));
    actions.append(nextBtn, editBtn, delBtn);
    li.append(actions);

    listEl.append(li);
  }
  updateStats();
}

async function updateStats() {
  try {
    const all = await api(API);
    const count = (s) => all.filter((t) => t.status === s).length;
    const stats = $("stats");
    stats.replaceChildren();
    for (const [label, n] of [
      ["Total", all.length],
      ["To do", count("todo")],
      ["In progress", count("in-progress")],
      ["Done", count("done")],
    ]) {
      const s = el("span", "stat");
      s.append(`${label}: `, el("b", "", String(n)));
      stats.append(s);
    }
  } catch {
    /* stats are optional */
  }
}

// ---------- Filters ----------
let searchTimer;
$("search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadTasks, 250);
});
$("filter").addEventListener("change", loadTasks);

loadTasks();
