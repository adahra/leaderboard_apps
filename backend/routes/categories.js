const express = require('express');
const router = express.Router();
const c = require('../controllers/categoriesController');
const auth = require('../controllers/authController');

router.get('/', c.getCategories);
router.post('/', auth.requireAdmin, c.createCategory);
router.put('/:key', auth.requireAdmin, c.updateCategory);
router.delete('/:key', auth.requireAdmin, c.deleteCategory);
router.post('/:key/sync', auth.requireAdmin, c.syncTeamCount);

module.exports = router;