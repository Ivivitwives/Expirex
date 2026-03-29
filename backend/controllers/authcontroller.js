const User = require('../models/usermodel');
const jwt = require('jsonwebtoken');

const ADMIN_EMAIL = 'expirex25@gmail.com';
const JWT_SECRET = process.env.JWT_SECRET || 'expirex-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// Generate Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// SIGNUP
const signup = async (req, res) => {
    const { email, password, username } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const role = email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';
        const user = await User.create({ email, password, username, role });
        const token = generateToken(user._id);

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role,
                settings: user.settings
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// LOGIN
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Ensure the fixed admin account stays admin
        if (user.email.toLowerCase() === ADMIN_EMAIL && user.role !== 'admin') {
            user.role = 'admin';
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user._id);

        res.status(200).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role, // ✅
                settings: user.settings
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// GET CURRENT USER
const getMe = async (req, res) => {
    try {
        res.status(200).json({
            user: {
                id: req.user._id,
                email: req.user.email,
                username: req.user.username,
                role: req.user.role, // ✅
                settings: req.user.settings
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// UPDATE SETTINGS
const updateSettings = async (req, res) => {
    const { expiryThreshold, theme } = req.body;

    try {
        const updates = {};
        if (expiryThreshold !== undefined) {
            updates['settings.expiryThreshold'] = expiryThreshold;
        }
        if (theme !== undefined) {
            updates['settings.theme'] = theme;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true }
        ).select('-password');

        res.status(200).json({
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role,
                settings: user.settings
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { signup, login, getMe, updateSettings, generateToken };