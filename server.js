const express = require("express");
const path = require("path");
const { DatabaseSync } = require("node:sqlite"); // built into Node.js, nothing to install

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Database ----------
const db = new DatabaseSync(path.join(__dirname, "tasks.db"));
db.exec("PRAGMA journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    priority    TEXT    NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
    status      TEXT    NOT NULL DEFAULT 'todo'   CHECK (status IN ('todo','in-progress','done')),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

const PRIORITIES = ["low", "medium", "high"];
const STATUSES = ["todo", "in-progress", "done"];

// ---------- Middleware ----------
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---------- Validation ----------
function validate(body, { partial }) {
  const errors = [];
  const out = {};

  if (!partial || body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      errors.push("title is required");
    } else if (body.title.trim().length > 120) {
      errors.push("title must be 120 characters or fewer");
    } else {
      out.title = body.title.trim();
    }
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.length > 1000) {
      errors.push("description must be text up to 1000 characters");
    } else {
      out.description = body.description.trim();
    }
  }
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) errors.push("priority must be low, medium or high");
    else out.priority = body.priority;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) errors.push("status must be todo, in-progress or done");
    else out.status = body.status;
  }
  return { errors, data: out };
}

// ---------- Routes (REST API) ----------

// READ all (optional ?status= & ?q= filters)
app.get("/api/tasks", (req, res) => {
  const { status, q } = req.query;
  let sql = "SELECT * FROM tasks";
  const where = [];
  const params = [];
  if (status && STATUSES.includes(status)) {
    where.push("status = ?");
    params.push(status);
  }
  if (q) {
    where.push("(title LIKE ? OR description LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY id DESC";
  res.json(db.prepare(sql).all(...params));
});

// READ one
app.get("/api/tasks/:id", (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

// CREATE
app.post("/api/tasks", (req, res) => {
  const { errors, data } = validate(req.body || {}, { partial: false });
  if (errors.length) return res.status(400).json({ error: errors.join(", ") });

  const info = db
    .prepare("INSERT INTO tasks (title, description, priority, status) VALUES (?, ?, ?, ?)")
    .run(data.title, data.description ?? "", data.priority ?? "medium", data.status ?? "todo");
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(task);
});

// UPDATE (partial updates allowed)
app.put("/api/tasks/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Task not found" });

  const { errors, data } = validate(req.body || {}, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(", ") });

  const merged = { ...existing, ...data };
  db.prepare(
    `UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?,
     updated_at = datetime('now') WHERE id = ?`
  ).run(merged.title, merged.description, merged.priority, merged.status, existing.id);

  res.json(db.prepare("SELECT * FROM tasks WHERE id = ?").get(existing.id));
});

// DELETE
app.delete("/api/tasks/:id", (req, res) => {
  const info = db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: "Task not found" });
  res.status(204).end();
});

// Unknown API route
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// Malformed JSON and other errors
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON" });
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

app.listen(PORT, () => console.log(`Task Dashboard running at http://localhost:${PORT}`));
