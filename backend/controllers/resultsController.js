const db = require('../config/db');

exports.getResults = (req, res) => {
  try {
    const cat = req.query.category || 'junior';
    const rows = db.prepare('SELECT id,a,b,sa,sb,winner FROM results WHERE category=?').all(cat);
    const out = {};
    rows.forEach(r => { out[r.id] = { a: r.a, b: r.b, sa: r.sa, sb: r.sb, winner: r.winner }; });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateResults = (req, res) => {
  try {
    const cat = req.query.category || 'junior';
    const results = req.body.results || req.body || {};
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM results WHERE category=?').run(cat);
      const ins = db.prepare('INSERT INTO results (id,category,a,b,sa,sb,winner) VALUES (?,?,?,?,?,?,?)');
      Object.entries(results).forEach(([id, r]) => {
        ins.run(id, cat, r.a ?? null, r.b ?? null, r.sa ?? null, r.sb ?? null, r.winner ?? null);
      });
    });
    tx();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
