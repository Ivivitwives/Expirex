const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const adminRoutes = require('./routes/adminroutes');
const productsRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL;
const PORT = Number(process.env.PORT || 8001);
const JWT_SECRET = process.env.JWT_SECRET;

const requiredEnvs = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvs = requiredEnvs.filter((key) => !process.env[key] && !(key === 'MONGO_URI' && process.env.MONGO_URL));
if (missingEnvs.length) {
    console.error(`Missing required environment variables: ${missingEnvs.join(', ')}`);
    process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.info(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}

app.use('/api/admin', adminRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Expirex API is running' });
});

app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to Expirex API' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server listening on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    });
