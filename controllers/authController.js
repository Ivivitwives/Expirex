const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, role: user.role, username: user.username });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};


// only admin can call this
exports.registerStaff = async (req, res) => {
    try {
        const { username, password } = req.body;
        // Check if user already exists
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const newUser = new User({ username, password, role});
        await newUser.save();
        res.status(201).json({ message: 'Staff registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
