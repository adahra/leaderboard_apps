const express = require('express');
const router = express.Router();
const db = require('../config/db');

const teamsRoutes = require('./teams');
const resultsRoutes = require('./results');
const settingsRoutes = require('./settings');
const categoriesRoutes = require('./categories');
const authRoutes = require('./auth');
const schedulingRoutes = require('./scheduling');
const auth = require('../controllers/authController');

router.get('/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, db: 'error', error: err.message });
  }
});

router.use('/auth', authRoutes);
router.get('/audit', auth.requireAdmin, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const rows = db.prepare('SELECT id,actor,action,target,detail,created_at FROM audit_log ORDER BY id DESC LIMIT ?').all(limit);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.use('/teams', teamsRoutes);
router.use('/results', resultsRoutes);
router.use('/settings', settingsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/scheduling', schedulingRoutes);

module.exports = router;