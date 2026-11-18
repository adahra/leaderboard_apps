# Repository Guidelines

## Project Overview

Aplikasi leaderboard turnamen dengan backend Express + SQLite (`better-sqlite3`) dan frontend statis vanilla JS. Kategori kompetisi dinamis (`junior`/`senior`). Bahasa UI Indonesia. Default user: `admin`/`admin` (admin), `user`/`user` (user).

## Architecture

- `server.js` → `backend/server.js` (Express app)
- API: `/api/auth`, `/api/teams`, `/api/results`, `/api/settings`, `/api/categories`, `/api/health`, `/api/audit`
- DB: `backend/config/db.js` singleton SQLite with WAL mode
- Frontend: `frontend/js/api.js` + `frontend/js/app.js` (SPA)
- Data: `data/leaderboard.db` (WAL file, not gitignored)

Key flow: Browser → API.js → Express → Controller → SQLite transaction (DELETE + bulk INSERT for write ops)

## Key Directories

- `backend/`: Express app, routes, controllers, config, tools
- `backend/controllers/`: auth, teams, results, settings, categories handlers
- `backend/config/`: DB singleton, schema, migration, seed
- `backend/tools/`: `inspect_db.js`, `backup_db.js`
- `frontend/`: Static SPA
- `frontend/js/`: API wrapper + UI logic (~1140 lines)
- `data/`: SQLite DB + WAL/shm (runtime only)
- `modules/`/`utils/`: Intentionally empty
- `node_modules/`: Express + better-sqlite3

## Development Commands

- `npm install`: Dependencies
- `npm start`/`npm run dev`: `node backend/server.js` (port 3000)
- `npm run backup`: `node backend/tools/backup_db.js` → `data/backups/`
- `node server.js`: Alternative entrypoint
- `node backend/tools/inspect_db.js`: Manual DB inspection

No build/lint/test scripts in package.json. Manual verification only.

## Code Conventions

- CommonJS only, no TypeScript
- Controller errors: `try/catch` → `res.status(500).json({ error })`
- Bulk writes: `db.transaction(() => { DELETE ...; INSERT ... })`
- Auth: `requireAuth` (401), `requireAdmin` (403), Bearer tokens (7 days, pbkdf2Sync)
- Frontend: Vanilla JS, global functions, `innerHTML`, basic HTML escaping
- UI: AdminLTE 4 + Bootstrap 5 (CDN), dark mode (`data-bs-theme="dark"`)
- Components: Cards, tables, modals (Bootstrap API via `app.js` helpers)
- Variables: Indonesian names
- Backend: Indonesian comments
- Category deletion blocked if teams exist

## Key Files

- `server.js`: Root entrypoint
- `backend/server.js`: Express app, static, API mount, error handling
- `backend/config/db.js`: DB schema, migration, seed
- `frontend/js/app.js`: UI logic and rendering
- `frontend/js/api.js`: API wrapper with auth/token handling
- `package.json`: Scripts, dependencies

## Runtime/Tooling Preferences

- Node.js v24.22.1+, CommonJS
- npm lockfileVersion 3
- Production: `express` ^4.19.2, `better-sqlite3` ^11.3.0
- Environment: `PORT=3000`, optional `CORS_ORIGIN`
- No `.env`, `tsconfig`, `eslint`, `prettier`, `vite`, `docker`, `nodemon`
- DB: SQLite WAL mode, sync queries

## Testing & QA

- No test framework installed
- Manual verification required
- If adding automation: Install runner, create `backend/**/*.test.js`, add `test` script to package.json