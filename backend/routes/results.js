const express = require('express');
const router = express.Router();
const resultsController = require('../controllers/resultsController');
const auth = require('../controllers/authController');

router.get('/', resultsController.getResults);
router.put('/', auth.requireAdmin, resultsController.updateResults);
router.get('/history', auth.requireAdmin, resultsController.getResultHistory);

module.exports = router;
