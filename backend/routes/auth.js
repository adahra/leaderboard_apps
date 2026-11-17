const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

router.post('/login', auth.login);
router.post('/logout', auth.requireAuth, auth.logout);
router.get('/me', auth.me);
router.post('/users', auth.requireAdmin, auth.createUser);

module.exports = router;