const db = require('../config/db');

function seedTeams(key, count, defGroup) {
  const ins = db.prepare('INSERT INTO teams (category,team_no,name,p1,p2,group_name) VALUES (?,?,?,?,?,?)');
  const tx = db.transaction(() => {
    for (let i = 1; i <= count; i++) {
      ins.run(key, i, `Tim ${i}`, '', '', defGroup);
    }
  });
  tx();
}

exports.getCategories = (req, res) => {
  try {
    const rows = db.prepare('SELECT key,label,schema,team_count,sort_order FROM categories ORDER BY sort_order, key').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCategory = (req, res) => {
  try {
    const { key, label, schema, team_count, sort_order, empty } = req.body || {};
    if (!key || !label || !schema) return res.status(400).json({ error: 'key, label, dan schema wajib diisi.' });
    if (!/^[a-z0-9_]+$/.test(key)) return res.status(400).json({ error: 'key harus huruf kecil, angka, atau underscore.' });
    if (!['junior44', 'knockout'].includes(schema)) return res.status(400).json({ error: 'schema harus junior44 atau knockout.' });
    const isEmpty = empty === true || empty === 'true';
    const parsedCount = Number(team_count);
    const cnt = isEmpty ? 0 : (Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : (schema === 'junior44' ? 44 : 16));
    db.prepare('INSERT INTO categories (key,label,schema,team_count,sort_order) VALUES (?,?,?,?,?)').run(key, label, schema, cnt, Number(sort_order) || 0);
    if (!isEmpty) seedTeams(key, cnt, label.toUpperCase());
    res.json({ ok: true, key });
  } catch (err) {
    if (String(err.message).includes('UNIQUE constraint failed')) return res.status(409).json({ error: 'Kategori dengan key tersebut sudah ada.' });
    res.status(500).json({ error: err.message });
  }
};

exports.updateCategory = (req, res) => {
  try {
    const key = req.params.key;
    const { label, schema, team_count, sort_order } = req.body || {};
    const cat = db.prepare('SELECT * FROM categories WHERE key=?').get(key);
    if (!cat) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    if (schema && !['junior44', 'knockout'].includes(schema)) return res.status(400).json({ error: 'schema harus junior44 atau knockout.' });
    const newLabel = label !== undefined ? label : cat.label;
    const newSchema = schema !== undefined ? schema : cat.schema;
    const newCount = team_count !== undefined ? (Number.isFinite(Number(team_count)) ? Number(team_count) : cat.team_count) : cat.team_count;
    const newOrder = sort_order !== undefined ? (Number.isFinite(Number(sort_order)) ? Number(sort_order) : cat.sort_order) : cat.sort_order;
    db.prepare('UPDATE categories SET label=?, schema=?, team_count=?, sort_order=? WHERE key=?').run(newLabel, newSchema, newCount, newOrder, key);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteCategory = (req, res) => {
  try {
    const key = req.params.key;
    const cat = db.prepare('SELECT * FROM categories WHERE key=?').get(key);
    if (!cat) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    const cnt = db.prepare('SELECT count(*) c FROM teams WHERE category=?').get(key).c;
    if (cnt > 0) return res.status(400).json({ error: `Kategori masih memiliki ${cnt} tim. Hapus semua tim terlebih dahulu.` });
    db.prepare('DELETE FROM results WHERE category=?').run(key);
    db.prepare('DELETE FROM categories WHERE key=?').run(key);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.syncTeamCount = (req, res) => {
  try {
    const key = req.params.key;
    const cnt = db.prepare('SELECT count(*) c FROM teams WHERE category=?').get(key).c;
    db.prepare('UPDATE categories SET team_count=? WHERE key=?').run(cnt, key);
    res.json({ ok: true, count: cnt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};