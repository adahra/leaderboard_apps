const crypto = require('crypto');
const db = require('../config/db');

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function createUserRecord(username, password, role) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  db.prepare('INSERT INTO users (username, password_hash, salt, role) VALUES (?,?,?,?)').run(username, hash, salt, role);
}

function getSessionUser(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.id, u.username, u.role, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(token);
  if (!row) return null;
  if (new Date(row.expires_at) <= new Date()) {
    db.prepare('DELETE FROM sessions WHERE token=?').run(token);
    return null;
  }
  return { id: row.id, username: row.username, role: row.role };
}

function requireAuth(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Login diperlukan.' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Login diperlukan.' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Hanya admin yang boleh mengubah data.' });
  req.user = user;
  next();
}

exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.getSessionUser = getSessionUser;

exports.login = (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    const user = db.prepare('SELECT id, username, password_hash, salt, role FROM users WHERE username=?').get(username);
    if (!user) return res.status(401).json({ error: 'Username atau password salah.' });
    const hash = hashPassword(password, user.salt);
    if (hash !== user.password_hash) return res.status(401).json({ error: 'Username atau password salah.' });
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)').run(token, user.id, expires);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.logout = (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
    if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(token);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.me = (req, res) => {
  const user = getSessionUser(req);
  res.json({ user });
};

exports.createUser = (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Username tidak valid.' });
    const r = ['admin', 'user', 'guest'].includes(role) ? role : 'user';
    createUserRecord(username, password, r);
    res.json({ ok: true });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Username sudah ada.' });
    res.status(500).json({ error: err.message });
  }
};