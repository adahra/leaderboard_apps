# Leaderboard Apps
Aplikasi leaderboard turnamen untuk kategori **junior** dan **senior**, dengan backend Express + SQLite (`better-sqlite3`) dan frontend statis.

## Fitur

- Bagan turnamen dinamis untuk kategori `junior` dan `senior`.
- Input hasil pertandingan, leaderboard, juara, dan data tim.
- Kategori kompetisi dapat ditambah, edit, dan hapus dari UI.
- Data disimpan di SQLite (`data/leaderboard.db`).

## Menjalankan

```bash
npm install
npm run dev
```

Server berjalan di `http://localhost:3000` (port bisa diubah dengan env `PORT`).

Entry alternatif:

```bash
node server.js
```

## Struktur

- `server.js` — delegasi ke backend.
- `backend/server.js` — Express app, static frontend, API, error handler.
- `backend/routes/` — routing `/teams`, `/results`, `/settings`, `/categories`.
- `backend/controllers/` — handler REST.
- `backend/config/db.js` — schema, migrasi, seed kategori.
- `frontend/` — UI statis (`index.html`, `js/api.js`, `js/app.js`).

## API

Base URL: `/api`

- `/teams?category=...`
- `/results?category=...`
- `/settings`
- `/categories`

## Catatan

- Tidak ada test suite atau lint script di `package.json`.
- Database menggunakan WAL mode; inspeksi bisa memakai `backend/tools/inspect_db.js`.
- Perubahan tim/hasil dilakukan bulk replace per kategori.
- Multi-user: login via `/api/auth/login`. Default admin `admin/admin`, user biasa `user/user`. Hanya admin yang dapat mengubah data; user/guest hanya melihat.