const db = require('../config/db');

// Normalisasi skor/status ke TEXT agar perbandingan diff konsisten dengan kolom DB.
function norm(v) {
  if (v === null || v === undefined || v === '') return null;
  return String(v);
}

exports.getResults = (req, res) => {
  try {
    const cat = req.query.category || 'junior';
    const rows = db.prepare('SELECT id,a,b,sa,sb,winner,scheduled_at,status FROM results WHERE category=?').all(cat);
    const out = {};
    rows.forEach(r => {
      out[r.id] = { a: r.a, b: r.b, sa: r.sa, sb: r.sb, winner: r.winner, scheduled_at: r.scheduled_at, status: r.status };
    });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateResults = (req, res) => {
  try {
    const cat = req.query.category || 'junior';
    const results = req.body.results || req.body || {};
    const changedBy = (req.user && req.user.username) || 'system';
    const tx = db.transaction(() => {
      const prev = {};
      db.prepare('SELECT id,a,b,sa,sb,winner,scheduled_at,status FROM results WHERE category=?').all(cat)
        .forEach(r => { prev[r.id] = r; });
      db.prepare('DELETE FROM results WHERE category=?').run(cat);
      const ins = db.prepare('INSERT INTO results (id,category,a,b,sa,sb,winner,scheduled_at,status) VALUES (?,?,?,?,?,?,?,?,?)');
      const hist = db.prepare('INSERT INTO result_history (category,match_id,a,b,sa,sb,winner,scheduled_at,status,changed_by) VALUES (?,?,?,?,?,?,?,?,?,?)');
      Object.entries(results).forEach(([id, r]) => {
        const a = r.a ?? null, b = r.b ?? null;
        const sa = norm(r.sa), sb = norm(r.sb);
        const winner = r.winner ?? null;
        const scheduled = norm(r.scheduled_at), status = norm(r.status);
        ins.run(id, cat, a, b, sa, sb, winner, scheduled, status);
        const p = prev[id];
        const changed = !p || p.a !== a || p.b !== b || p.sa !== sa || p.sb !== sb ||
          p.winner !== winner || p.scheduled_at !== scheduled || p.status !== status;
        if (changed) hist.run(cat, id, a, b, sa, sb, winner, scheduled, status, changedBy);
      });
    });
    tx();
    db.logAudit(changedBy, 'results.update', cat, JSON.stringify({ matches: Object.keys(results).length }));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getResultHistory = (req, res) => {
  try {
    const cat = req.query.category || 'junior';
    const match = req.query.match;
    const cols = 'id,match_id,a,b,sa,sb,winner,scheduled_at,status,changed_by,changed_at';
    const rows = match
      ? db.prepare(`SELECT ${cols} FROM result_history WHERE category=? AND match_id=? ORDER BY id DESC LIMIT 100`).all(cat, match)
      : db.prepare(`SELECT ${cols} FROM result_history WHERE category=? ORDER BY id DESC LIMIT 200`).all(cat);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
