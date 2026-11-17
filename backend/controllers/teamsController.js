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
        ins.run(cat, i + 1, t.name || '', t.p1 || '', t.p2 || '', t.photo || t.photo_url || '', t.group || (cat === 'junior' ? 'Junior' : 'Senior'));
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

module.exports = { getTeams, updateTeams, deleteTeam };
