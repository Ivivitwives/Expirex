const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const productcontroller = require('../controllers/productcontroller');
const verifyToken = require('../middleware/auth');

//auth routes
router.post('/login', authController.login);
router.get('/dashboard', verifyToken, productcontroller.getDashboard);

//only logged-in users can register others
router.post('/register', verifyToken, authController.registerStaff);

module.exports = router;