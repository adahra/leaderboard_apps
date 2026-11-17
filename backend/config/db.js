const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'leaderboard.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// ---- Schema ----
db.exec(`
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  team_no INTEGER NOT NULL,
  name TEXT DEFAULT '',
  p1 TEXT DEFAULT '',
  p2 TEXT DEFAULT '',
  group_name TEXT DEFAULT '',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, team_no)
);
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  a INTEGER,
  b INTEGER,
  sa TEXT,
  sb TEXT,
  winner INTEGER,
  scheduled_at TEXT,
  status TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS categories (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  schema TEXT NOT NULL,
  team_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
CREATE TABLE IF NOT EXISTS result_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  match_id TEXT NOT NULL,
  a INTEGER,
  b INTEGER,
  sa TEXT,
  sb TEXT,
  winner INTEGER,
  scheduled_at TEXT,
  status TEXT,
  changed_by TEXT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_result_history_cat_match ON result_history (category, match_id);
`);

// ---- Migration: buang CHECK(category IN ('junior','senior)) agar kategori custom diperbolehkan ----
(function migrateTeamsConstraint() {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='teams'").get();
  if (!row || !row.sql) return;
  if (!/CHECK\s*\(\s*category/i.test(row.sql)) return; // sudah bebas
  try {
    const tx = db.transaction(() => {
      db.exec(`
        CREATE TABLE teams_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          team_no INTEGER NOT NULL,
          name TEXT DEFAULT '',
          p1 TEXT DEFAULT '',
          p2 TEXT DEFAULT '',
          group_name TEXT DEFAULT '',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(category, team_no)
        );
        INSERT INTO teams_new SELECT * FROM teams;
        DROP TABLE teams;
        ALTER TABLE teams_new RENAME TO teams;
      `);
    });
    tx();
  } catch (e) {
    console.error('Gagal migrasi teams constraint:', e.message);
  }
})();

// ---- Migration: tambah kolom jadwal/status pada results (DB lama) ----
(function migrateResultsColumns() {
  const cols = db.prepare('PRAGMA table_info(results)').all().map((c) => c.name);
  if (!cols.includes('scheduled_at')) db.exec('ALTER TABLE results ADD COLUMN scheduled_at TEXT');
  if (!cols.includes('status')) db.exec('ALTER TABLE results ADD COLUMN status TEXT');
})();

// ---- Migration: tambah kolom archived pada categories (DB lama) ----
(function migrateCategoriesArchived() {
  const cols = db.prepare('PRAGMA table_info(categories)').all().map((c) => c.name);
  if (!cols.includes('archived')) db.exec('ALTER TABLE categories ADD COLUMN archived INTEGER NOT NULL DEFAULT 0');
})();
const seed = db.prepare(`
  INSERT OR IGNORE INTO categories (key, label, schema, team_count, sort_order)
  VALUES (?, ?, ?, ?, ?)
`);
seed.run('junior', 'JUNIOR', 'junior44', 44, 1);
seed.run('senior', 'SENIOR', 'knockout', 16, 2);

// ---- Seed default users ----
function seedUser(username, password, role) {
  const exists = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (exists) return;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  db.prepare('INSERT INTO users (username, password_hash, salt, role) VALUES (?,?,?,?)').run(username, hash, salt, role);
}
seedUser('admin', 'admin', 'admin');
seedUser('user', 'user', 'user');

module.exports = db;