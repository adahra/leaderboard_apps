const express = require('express');
const router = express.Router();
const c = require('../controllers/categoriesController');

router.get('/', c.getCategories);
router.post('/', c.createCategory);
router.put('/:key', c.updateCategory);
router.delete('/:key', c.deleteCategory);
router.post('/:key/sync', c.syncTeamCount);

module.exports = router;