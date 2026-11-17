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
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
