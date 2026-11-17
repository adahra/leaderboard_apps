const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teamsController');

router.get('/', teamsController.getTeams);
router.put('/', teamsController.updateTeams);
router.delete('/:team_no', teamsController.deleteTeam);

module.exports = router;
