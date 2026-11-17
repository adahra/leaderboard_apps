const crypto = require('crypto');
const db = require('../config/db');

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map();

function loginKey(req) {
  return (req.ip || req.socket?.remoteAddress || 'unknown').toString();
}

function checkLoginRateLimit(req, res) {
  const key = loginKey(req);
  const now = Date.now();
  const rec = loginAttempts.get(key);
  if (rec && now >= rec.resetAt) loginAttempts.delete(key);
  const cur = loginAttempts.get(key);
  if (cur && cur.count >= LOGIN_MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((cur.resetAt - now) / 1000);
    res.status(429).json({ error: `Terlalu banyak percobaan login. Coba lagi dalam ${retryAfter} detik.` });
    return false;
  }
  return true;
}

function recordLoginFailure(req) {
  const key = loginKey(req);
  const now = Date.now();
  const rec = loginAttempts.get(key);
  if (!rec || now >= rec.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    rec.count += 1;
  }
}

function clearLoginAttempts(req) {
  loginAttempts.delete(loginKey(req));
}

function createUserRecord(username, password, role) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  db.prepare('INSERT INTO users (username, password_hash, salt, role) VALUES (?,?,?,?)').run(username, hash, salt, role);
}
// ---- Reset password helpers ----
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}
function setResetToken(userId, token) {
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, expires, userId);
}
function clearResetToken(userId) {
  db.prepare('UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(userId);
}
function validateResetToken(token) {
  const row = db.prepare('SELECT id, reset_token_expires FROM users WHERE reset_token = ?').get(token);
  if (!row) return null;
  if (new Date(row.reset_token_expires) <= new Date()) {
    // token expired, clear it
    db.prepare('UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(row.id);
    return null;
  }
  return row.id;
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
    if (!user) { recordLoginFailure(req); return res.status(401).json({ error: 'Username atau password salah.' }); }
    const hash = hashPassword(password, user.salt);
    if (hash !== user.password_hash) { recordLoginFailure(req); return res.status(401).json({ error: 'Username atau password salah.' }); }
    clearLoginAttempts(req);
    db.logAudit(user.username, 'auth.login', user.username, null);
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
// ---- Password reset handlers ----
exports.forgotPassword = (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: 'Username diperlukan.' });
    const user = db.prepare('SELECT id FROM users WHERE username=?').get(username);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    const token = generateResetToken();
    setResetToken(user.id, token);
    db.logAudit(username, 'auth.forgot_password', username, 'reset token dibuat (berlaku 1 jam)');
    res.json({ reset_token: token, expires_in: '1 hour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ error: 'Token dan password baru diperlukan.' });
    const userId = validateResetToken(token);
    if (!userId) return res.status(400).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(newPassword, salt);
    db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, userId);
    clearResetToken(userId);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId); // password ganti -> sesi lama tidak valid
    db.logAudit('system', 'auth.reset_password', null, `user_id=${userId}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.me = (req, res) => {
  const user = getSessionUser(req);
  res.json({ user });
};

// ---- Session management (admin) ----
exports.getSessions = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT s.token, s.user_id, s.expires_at, s.created_at, u.username
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.revokeSession = (req, res) => {
  try {
    const { token } = req.params;
    const row = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
    if (!row) return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    db.logAudit(req.user?.username || 'system', 'auth.revoke_session', null, `token=${token.slice(0,8)}… user_id=${row.user_id}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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