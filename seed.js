const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config();

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const admin = new User({
            username: 'admin',
            password: 'admin123',
            role: 'admin'
        });
        await admin.save();
        console.log('Admin user created');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
createAdmin();