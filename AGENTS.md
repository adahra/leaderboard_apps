# Repository Guidelines

## Project Overview

Aplikasi leaderboard turnamen (kategori `junior44` dan `knockout`) dengan backend Express + SQLite (`better-sqlite3`) dan frontend statis vanilla JS. Kategori kompetisi dinamis: bisa ditambah, diedit, dan dihapus dari UI. Bahasa UI Indonesia. Default user: `admin`/`admin` (admin), `user`/`user` (user).

## Architecture & Data Flow

```
browser  →  fetch (API.js)  →  Express /api/*  →  controller  →  better-sqlite3 (sync)
                              ↑                                  ↓
                          static frontend/                  data/leaderboard.db (WAL)
```

- `server.js` (root) → `require('./backend/server')` → Express app di `backend/server.js`.
- `backend/server.js`: JSON body parser (5mb), `express.static(FRONTEND_DIR)`, mount `/api` router, SPA fallback ke `index.html`, centralized 500 error handler. Exports `app`; `app.listen` hanya saat `require.main === module`.
- `backend/routes/index.js`: mount `/auth`, `/teams`, `/results`, `/settings`, `/categories`.
- Kontroler di `backend/controllers/`: auth, teams, results, settings, categories. Semua impor `db` dari `backend/config/db.js` (singleton `better-sqlite3`).
- `backend/config/db.js`: buka DB (`data/leaderboard.db`), WAL pragma, schema DDL (`teams`, `results`, `settings`, `categories`, `users`, `sessions`, `result_history`), migrasi idempoten (buang `CHECK` kategori pada `teams`; `ALTER TABLE results` tambah `scheduled_at`/`status`), seed kategori default (`junior`/`senior`) + user default.
- Frontend: `frontend/js/api.js` (fetch wrapper, token di `localStorage` `leaderboard_token`), `frontend/js/app.js` (semua logic UI/rendering, ~859 baris), `frontend/index.html`.

Data flow tulis: frontend `PUT` → controller `db.transaction` → `DELETE FROM ... WHERE category=?` lalu bulk re-insert. `updateResults` juga mencatat `result_history` bila nilai berubah (`changed_by` = `req.user.username`); penulisan identik tidak menambah baris. Read: `SELECT ... WHERE category=?`; riwayat skor/jadwal/status lewat `GET /api/results/history?category=<key>&match=<matchId>` (butuh admin).

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `backend/` | Express app, routes, controllers, config/db, tools |
| `backend/controllers/` | REST route handlers (auth, teams, results, settings, categories) |
| `backend/routes/` | Express router mount files per resource |
| `backend/config/` | `db.js` — DB instance, schema, migration, seed |
| `backend/tools/` | `inspect_db.js` — manual DB inspeksi (bukan test) |
| `frontend/` | Static SPA served by Express |
| `frontend/js/` | `api.js` fetch wrapper, `app.js` UI logic |
| `data/` | `leaderboard.db` + WAL/shm (runtime, tidak di-.gitignore) |
| `modules/`, `utils/` | Kosong sengaja — jangan tambah file tanpa permintaan |
| `node_modules/` | Dependensi terinstal (express, better-sqlite3 + transitif) |

## Development Commands

| Command | Aksi |
|---------|------|
| `npm install` | Instal dependensi |
| `npm run dev` / `npm start` | `node backend/server.js`, port `PORT` atau `3000` |
| `node server.js` | Entry alternatif (root delegasi ke `backend/server.js`) |
| `node backend/tools/inspect_db.js` | Inspeksi manual DB |

Tidak ada script `build`, `lint`, `test` di `package.json`. Tidak ada test suite, lint config, atau CI config.

## Code Conventions & Common Patterns

- CommonJS (`require`/`module.exports`), tidak ada TypeScript.
- Error handling: `try/catch` di controller, `res.status(500).json({ error })`.
- DB transaction untuk bulk write: `db.transaction(() => { ... })`.
- Validasi input di controller (regex key, schema enum `junior44`/`knockout`).
- Auth middleware: `requireAuth` (401 kalau belum login), `requireAdmin` (403 kalau bukan admin). Token `Bearer` 7 hari, hash `pbkdf2Sync`.
- Frontend vanilla JS, global function, `innerHTML` template, esc HTML untuk XSS dasar.
- Frontend UI: AdminLTE 4 + Bootstrap 5 (CDN); layout pakai kelas AdminLTE 4 (`.app-wrapper`, `.app-header`, `.app-sidebar`, `.app-main`, `.app-content`, `.app-footer`); tema gelap via `<html data-bs-theme="dark">`. Pakai komponen AdminLTE/Bootstrap (`card`, `table`, `nav nav-pills`, `small-box`, `badge text-bg-*`, `alert`, `modal`, `form-control`) — jangan bikin CSS kustom untuk komponen generik; CSS kustom (`frontend/css/styles.css`) hanya untuk visualisasi bagan/leaderboard.
- Modal (team detail, kategori, login) pakai Bootstrap Modal API via helper `showModal(id)`/`hideModal(id)` di `app.js`; bukan lagi class `.show`/`style.display` manual.
- `saveState` di frontend debounced 300ms, simpan semua kategori sekaligus.
- Nama variabel/fungsi Indonesia, komentar Indonesia.
- `deleteCategory` diblokir jika kategori masih punya tim.

Contoh pola controller:

```js
exports.updateTeams = (req, res) => {
  try {
    const cat = req.query.category || 'junior';
    const teams = req.body.teams || [];
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM teams WHERE category=?').run(cat);
      const ins = db.prepare('INSERT INTO teams (...) VALUES (?,?,?,?,?,?)');
      teams.forEach((t, i) => ins.run(cat, i + 1, t.name || '', ...));
    });
    tx();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
```

Contoh auth middleware:

```js
router.put('/', auth.requireAdmin, teamsController.updateTeams);
```

## Important Files

| File | Role |
|------|------|
| `server.js` | Root entry → require `backend/server.js` |
| `backend/server.js` | Express app, static, `/api` mount, SPA fallback, 500 handler |
| `backend/routes/index.js` | Mount semua resource routes |
| `backend/config/db.js` | DB singleton, schema, migration, seed |
| `backend/controllers/authController.js` | Auth, session, `requireAuth`/`requireAdmin` |
| `backend/controllers/teamsController.js` | `getTeams`, `updateTeams`, `deleteTeam` |
| `backend/controllers/resultsController.js` | `getResults`, `updateResults` (bulk replace + tulis `result_history`), `getResultHistory` |
| `backend/controllers/settingsController.js` | `getSettings`, `updateSettings` |
| `backend/controllers/categoriesController.js` | CRUD kategori + `syncTeamCount` |
| `frontend/js/api.js` | Fetch wrapper + token `localStorage` |
| `frontend/js/app.js` | Semua logic UI/rendering turnamen |
| `frontend/index.html` | SPA markup (7 view: bagan, input, leaderboard, juara, tim, live, pengaturan; modal: team detail, kategori, riwayat, login) |
| `package.json` | Skrip `start`/`dev`, dependensi express + better-sqlite3 |
| `.gitignore` | `node_modules/`, logs, dll; `data/` **tidak** diignore |

## Runtime/Tooling Preferences

- Runtime: Node.js (v24.22.1 terinstal), CommonJS.
- Package manager: npm (lockfileVersion 3).
- Dependensi produksi: `express` ^4.19.2 (terpasang 4.22.3), `better-sqlite3` ^11.3.0 (terpasang 11.10.0, native addon butuh compile saat install).
- Hanya env var yang digunakan: `PORT` (default `3000`).
- Tidak ada `.env`, `tsconfig`, eslint, prettier, vite, docker, atau nodemon.
- DB: SQLite WAL mode, query sinkron.

## Testing & QA

- Tidak ada test framework terinstal (tidak ada Jest/Vitest/Mocha/`node:test` setup).
- Tidak ada file tes (`*.test.*`, `*.spec.*`, `test/`, `__tests__/`).
- Tidak ada `npm test`, `npm lint`, atau coverage config.
- Verifikasi manual: nyalakan server, coba endpoint via `curl` atau browser di `http://localhost:3000`.
- Jika menambahkan otomatisasi: pasang runner (mis. `node:test` dari stdlib atau `supertest`), buat `backend/**/*.test.js`, tambah skrip `test` di `package.json`, opsional ESLint + `lint`. Tidak ada ekspektasi coverage saat ini.