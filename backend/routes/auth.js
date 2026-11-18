const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

router.post('/login', auth.login);
router.post('/logout', auth.requireAuth, auth.logout);
router.get('/me', auth.me);
router.post('/users', auth.requireAdmin, auth.createUser);
router.get('/users', auth.requireAdmin, auth.getUsers);
router.get('/users/:username', auth.requireAdmin, auth.getUser);
router.delete('/users/:username', auth.requireAdmin, auth.deleteUser);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.post('/change-password', auth.requireAuth, auth.changePassword);
router.get('/sessions', auth.requireAdmin, auth.getSessions);
router.delete('/sessions/:token', auth.requireAdmin, auth.revokeSession);
module.exports = router;
