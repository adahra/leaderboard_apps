const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teamsController');
const auth = require('../controllers/authController');

router.get('/', teamsController.getTeams);
router.put('/', auth.requireAdmin, teamsController.updateTeams);
router.delete('/:team_no', auth.requireAdmin, teamsController.deleteTeam);

router.get('/export', auth.requireAdmin, teamsController.exportTeams);
router.post('/import', auth.requireAdmin, express.text(), teamsController.importTeams);
module.exports = router;
