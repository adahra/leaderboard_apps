const db = require('../config/db');

exports.getSettings = (req, res) => {
  try {
    const rows = db.prepare('SELECT key,value FROM settings').all();
    const out = {};
    rows.forEach(r => {
      try {
        out[r.key] = JSON.parse(r.value);
      } catch {
        out[r.key] = r.value;
      }
    });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSettings = (req, res) => {
  try {
    const body = req.body || {};
    const tx = db.transaction(() => {
      const up = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
      Object.entries(body).forEach(([k, v]) => up.run(k, JSON.stringify(v)));
    });
    tx();
    db.logAudit(req.user?.username || 'system', 'settings.update', 'settings', JSON.stringify(Object.keys(body)));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSetting = (req, res) => {
  try {
    const { key } = req.params;
    const info = db.prepare('DELETE FROM settings WHERE key = ?').run(key);
    if (!info.changes) return res.status(404).json({ error: 'Setting tidak ditemukan.' });
    db.logAudit(req.user?.username || 'system', 'settings.delete', key, null);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
