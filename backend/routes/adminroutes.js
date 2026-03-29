const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const User = require('../models/UserModel');
const auth = require('../middleware/auth');
const adminMiddleware = require('../middleware/adminMiddleware');

// ✅ GET ALL USERS (Admin only)
router.get('/users', auth, adminMiddleware, async (req, res) => {
    try {
        const users = await User.find().select('-password');

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ DELETE USER (Admin only)
router.delete('/users/:id', auth, adminMiddleware, async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;