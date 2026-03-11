require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const productsRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(req.path, req.method);
    next();
});

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Expirex API is running' });
});

// Routes
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to Expirex API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL;
const PORT = process.env.PORT || 8001;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server listening on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
        // Start server anyway for health checks
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server listening on port ${PORT} (DB not connected)`);
        });
    });
