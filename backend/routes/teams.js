const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teamsController');
const auth = require('../controllers/authController');

router.get('/', teamsController.getTeams);
router.put('/', auth.requireAdmin, teamsController.updateTeams);
router.delete('/:team_no', auth.requireAdmin, teamsController.deleteTeam);

module.exports = router;
