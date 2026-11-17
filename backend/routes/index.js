const express = require('express');
const db = require('../config/db');

const router = express.Router();

const teamsRoutes = require('./teams');
const resultsRoutes = require('./results');
const settingsRoutes = require('./settings');
const categoriesRoutes = require('./categories');
const authRoutes = require('./auth');

router.get('/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, db: 'error', error: err.message });
  }
});

router.use('/auth', authRoutes);
router.use('/teams', teamsRoutes);
router.use('/results', resultsRoutes);
router.use('/settings', settingsRoutes);
router.use('/categories', categoriesRoutes);

module.exports = router;