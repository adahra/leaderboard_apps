const express = require('express');
const router = express.Router();
const resultsController = require('../controllers/resultsController');

router.get('/', resultsController.getResults);
router.put('/', resultsController.updateResults);

module.exports = router;
