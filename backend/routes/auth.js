const express = require('express');
const { signup, login, getMe, updateSettings } = require('../controllers/authcontroller');
const auth = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/me', auth, getMe);
router.patch('/settings', auth, updateSettings);

module.exports = router;