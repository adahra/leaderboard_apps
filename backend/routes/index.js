const express = require('express');
const router = express.Router();

const teamsRoutes = require('./teams');
const resultsRoutes = require('./results');
const settingsRoutes = require('./settings');
const categoriesRoutes = require('./categories');
const authRoutes = require('./auth');

router.use('/auth', authRoutes);
router.use('/teams', teamsRoutes);
router.use('/results', resultsRoutes);
router.use('/settings', settingsRoutes);
router.use('/categories', categoriesRoutes);

module.exports = router;