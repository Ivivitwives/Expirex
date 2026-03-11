const User = require('../models/usermodel');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'expirex-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Sign Up
const signup = async (req, res) => {
    const { email, password, username } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Create new user
        const user = await User.create({ email, password, username });
        const token = generateToken(user._id);

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                settings: user.settings
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Login
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(user._id);

        res.status(200).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                settings: user.settings
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get current user
const getMe = async (req, res) => {
    try {
        res.status(200).json({
            user: {
                id: req.user._id,
                email: req.user.email,
                username: req.user.username,
                settings: req.user.settings
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update user settings
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
            req.userId,
            { $set: updates },
            { new: true }
        ).select('-password');

        res.status(200).json({
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                settings: user.settings
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { signup, login, getMe, updateSettings };
