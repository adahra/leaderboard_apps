# AGENTS.md — leaderboard_apps

## Ringkasan
Aplikasi leaderboard turnamen (junior44 & knockout) dengan backend Express + SQLite (better-sqlite3) dan frontend statis. Kategori kompetisi dinamis, bisa ditambah/edit/hapus dari UI.

## Build / Test / Lint
- Install deps: `npm install`
- Run (dev & start): `npm run dev` atau `npm run start` → `node backend/server.js` (port 3000, env `PORT`)
- Entry alternatif: `node server.js` (delegasi ke backend)
- Test/lint: tidak ada script test/lint di `package.json`. Tidak ada test suite.

## Arsitektur
- `server.js` (root) → require `backend/server.js`.
- `backend/server.js`: Express app; static `frontend/`; API di `/api`; fallback ke `index.html`; error handler 500.
- `backend/routes/index.js`: mount `/teams`, `/results`, `/settings`, `/categories`.
- `backend/config/db.js`: buka `data/leaderboard.db`, WAL, buat schema, migrasi constraint teams, seed kategori junior/senior.
- Controllers: teamsController, resultsController, settingsController, categoriesController.
- Frontend: `frontend/index.html` + `js/api.js` (fetch wrapper) + `js/app.js` (semua logic UI/rendering turnamen).

## Alur Data
Frontend `API.*` → `/api/*` → controller → better-sqlite3 (sinkron). Kategori disimpan di tabel `categories`; tim di `teams` (category, team_no); hasil di `results` (id match). Settings (JSON) di `settings`. Semua query sync (better-sqlite3).

## Direktori & File Penting
- `backend/controllers/` — handler REST
- `backend/routes/` — routing Express
- `backend/config/db.js` — schema + migrasi + seed
- `backend/tools/inspect_db.js` — inspeksi DB (node tools/inspect_db.js)
- `data/` — leaderboard.db (+ WAL/shm). Jangan commit data hasil runtime? (tidak ada .gitignore root)
- `frontend/js/app.js` — logic turnamen (junior44 selection, knockout), ~1000 baris
- `frontend/js/api.js` — fetch wrapper
- `modules/`, `utils/` — kosong

## Konvensi Kode
- CommonJS (`require`/`module.exports`), tanpa TypeScript.
- Error handling: try/catch di controller, res.status(500).json({error}).
- DB transaction untuk bulk write (`db.transaction`).
- Validasi input di controller (regex key, schema enum).
- Frontend vanilla JS, global function, innerHTML template.
- Nama Indonesia (label UI), komentar Indonesia.

## Tips untuk Agent
- Tidak ada test; verifikasi manual via server + browser/curl.
- DB SQLite WAL; jika inspeksi langsung, gunakan `inspect_db.js` atau better-sqlite3.
- `updateTeams`/`updateResults` hapus semua baris kategori lalu re-insert (bulk replace) — hati-hati partial.
- `deleteCategory` blok jika masih ada tim.
- Frontend `saveState` debounced 300ms, menyimpan semua kategori sekaligus.
- Tidak ada git repo (git log gagal) → jangan asumsi branch workflow.
- `modules/` dan `utils/` kosong; jangan tambah file tanpa permintaan.
- Schema hanya `junior44` atau `knockout`.
