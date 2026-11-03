# Task Dashboard

A full-stack task manager with complete CRUD (Create, Read, Update, Delete).

- **Frontend:** Vanilla JavaScript (async/await + fetch), HTML5, responsive CSS
- **Backend:** Node.js + Express REST API
- **Database:** SQLite via Node's built-in `node:sqlite` (local file `tasks.db`, created automatically; needs Node 22.13+)

## Run it

```bash
npm install
npm start
```

Open http://localhost:3000

## API

| Method | Endpoint           | Description                                   |
|--------|--------------------|-----------------------------------------------|
| GET    | /api/tasks         | List tasks (optional `?status=` and `?q=`)    |
| GET    | /api/tasks/:id     | Get one task                                  |
| POST   | /api/tasks         | Create a task                                 |
| PUT    | /api/tasks/:id     | Update a task (partial updates allowed)       |
| DELETE | /api/tasks/:id     | Delete a task                                 |

Task fields: `title` (required, max 120), `description`, `priority` (`low|medium|high`), `status` (`todo|in-progress|done`).

## Security notes

- All SQL uses prepared statements (no SQL injection).
- Input is validated on the server (types, lengths, allowed values).
- The frontend renders with `textContent`, so user input is never executed as HTML (no XSS).
- Request body size is limited.

## Project structure

```
server.js        Express app + REST API + SQLite
public/
  index.html     UI
  style.css      Responsive styling
  app.js         Frontend logic (fetch API)
```
