const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../data/leaderboard.db');
const backupDir = path.resolve(__dirname, '../../data/backups');

async function main() {
  if (!fs.existsSync(dbPath)) {
    console.error('DB tidak ditemukan:', dbPath);
    process.exit(1);
  }
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const dest = path.join(backupDir, `leaderboard_${stamp}.db`);
  const db = new Database(dbPath, { fileMustExist: true });
  await db.backup(dest);
  db.close();
  console.log('Backup selesai:', dest);
}

main().catch((err) => {
  console.error('Backup gagal:', err.message);
  process.exit(1);
});