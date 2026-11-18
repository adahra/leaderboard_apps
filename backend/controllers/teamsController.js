const db = require('../config/db');

function getTeams(req, res) {
  try {
    const cat = req.query.category || 'junior';
    const rows = db.prepare('SELECT team_no,name,p1,p2,photo_url,group_name FROM teams WHERE category=? ORDER BY team_no').all(cat);
    res.json(rows.map(r => ({ id: r.team_no, name: r.name, p1: r.p1, p2: r.p2, photo: r.photo_url || '', group: r.group_name })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function updateTeams(req, res) {
  try {
    const cat = req.query.category || 'junior';
    const teams = req.body.teams || req.body || [];
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM teams WHERE category=?').run(cat);
      const ins = db.prepare('INSERT INTO teams (category,team_no,name,p1,p2,photo_url,group_name) VALUES (?,?,?,?,?,?,?)');
      teams.forEach((t, i) => {
        ins.run(cat, i + 1, t.name || '', t.p1 || '', t.p2 || '', t.photo || t.photo_url || '', t.group || (cat === 'single_elimination' ? 'Single Elimination' : 'Double Elimination'));
      });
    });
    tx();
    db.logAudit(req.user?.username, 'teams.update', cat, JSON.stringify({ count: teams.length }));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function deleteTeam(req, res) {
  try {
    const cat = req.query.category || 'junior';
    const teamNo = parseInt(req.params.team_no);
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM teams WHERE category=? AND team_no=?').run(cat, teamNo);
      // Re-index remaining teams
      const rows = db.prepare('SELECT team_no FROM teams WHERE category=? ORDER BY team_no').all(cat);
      rows.forEach((r, i) => {
        const newNo = i + 1;
        if (r.team_no !== newNo) {
          db.prepare('UPDATE teams SET team_no=? WHERE category=? AND team_no=?').run(newNo, cat, r.team_no);
        }
      });
    });
    tx();
    db.logAudit(req.user?.username, 'team.delete', cat, JSON.stringify({ team_no: teamNo }));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function exportTeams(req, res) {
  try {
    const cat = req.query.category || 'junior';
    const rows = db.prepare('SELECT team_no,name,p1,p2,photo_url,group_name FROM teams WHERE category=? ORDER BY team_no').all(cat);
    // Build CSV
    const header = ['team_no', 'name', 'p1', 'p2', 'photo_url', 'group_name'].join(',');
    const csvRows = rows.map(r => [r.team_no, r.name, r.p1, r.p2, r.photo_url || '', r.group_name].map(v => `\"${v.replace(/\"/g, '\"\"')}\"`).join(','));
    const csv = [header, ...csvRows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=teams_${cat}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function importTeams(req, res) {
  try {
    const cat = req.query.category || 'junior';
    const csvText = req.body;
    if (!csvText) return res.status(400).json({ error: 'No CSV data provided' });
    const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return res.status(400).json({ error: 'Empty CSV' });
    const header = lines[0];
    const expectedHeader = 'team_no,name,p1,p2,photo_url,group_name';
    const skipHeader = header === expectedHeader;
    const teams = [];
    for (let i = (skipHeader ? 1 : 0); i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',');
      if (parts.length < 3) continue;
      const team_no = parseInt(parts[0], 10);
      const name = parts[1] || '';
      const p1 = parts[2] || '';
      const p2 = parts[3] || '';
      const photo_url = parts[4] || '';
      const group_name = parts[5] || '';
      teams.push({
        name,
        p1,
        p2,
        photo: photo_url,
        group: group_name,
      });
    }
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM teams WHERE category=?').run(cat);
      const ins = db.prepare('INSERT INTO teams (category,team_no,name,p1,p2,photo_url,group_name) VALUES (?,?,?,?,?,?,?)');
      teams.forEach((t, i) => {
        ins.run(cat, i + 1, t.name || '', t.p1 || '', t.p2 || '', t.photo || '', t.group || '');
      });
    });
    tx();
    db.logAudit(req.user?.username, 'teams.import', cat, JSON.stringify({ count: teams.length }));
    res.json({ ok: true, imported: teams.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getTeams, updateTeams, deleteTeam, exportTeams, importTeams };
