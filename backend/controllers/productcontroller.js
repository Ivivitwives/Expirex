const fs = require('fs');
const csv = require('fast-csv');
const Product = require('../models/ProductModel');
const mongoose = require('mongoose');

// CREATE a new product
const createProduct = async (req, res) => {
    const { name, quantity, expirationDate, category } = req.body;

    try {
        const product = await Product.create({ 
            name, 
            quantity, 
            expirationDate, 
            category,
            userId: req.userId 
        });
        
        // Add status to response
        const productObj = product.toObject();
        productObj.status = getStatus(product.expirationDate, req.user.settings.expiryThreshold);
        
        res.status(200).json(productObj);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Helper function to determine status
const getStatus = (expirationDate, threshold = 7) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);
    
    if (expDate < today) {
        return 'Expired';
    } else if (expDate <= new Date(today.getTime() + threshold * 24 * 60 * 60 * 1000)) {
        return 'Near Expiry';
    } else {
        return 'Safe';
    }
};

// GET all products with status
const getProducts = async (req, res) => {
    const { search, category, status, startDate, endDate, sortBy } = req.query;
    const threshold = req.user?.settings?.expiryThreshold || 7;
    
    let query = { userId: req.userId };

    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }
    if (category) {
        query.category = category;
    }
    if (startDate || endDate) {
        query.expirationDate = {};
        if (startDate) query.expirationDate.$gte = new Date(startDate);
        if (endDate) query.expirationDate.$lte = new Date(endDate);
    }

    try {
        let sortOption = { expirationDate: 1 }; // Default: nearest expiration first
        if (sortBy === 'newest') sortOption = { createdAt: -1 };
        if (sortBy === 'oldest') sortOption = { createdAt: 1 };
        if (sortBy === 'name') sortOption = { name: 1 };

        const products = await Product.find(query).sort(sortOption);
        
        let productsWithStatus = products.map(product => {
            const p = product.toObject();
            p.status = getStatus(p.expirationDate, threshold);
            return p;
        });

        // Filter by status if provided
        if (status) {
            productsWithStatus = productsWithStatus.filter(p => p.status === status);
        }

        res.status(200).json(productsWithStatus);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// GET dashboard summary
const getDashboardSummary = async (req, res) => {
    const threshold = req.user?.settings?.expiryThreshold || 7;
    
    try {
        const products = await Product.find({ userId: req.userId });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let totalProducts = products.length;
        let expired = 0;
        let nearExpiry = 0;
        let safe = 0;
        
        products.forEach(product => {
            const status = getStatus(product.expirationDate, threshold);
            if (status === 'Expired') expired++;
            else if (status === 'Near Expiry') nearExpiry++;
            else safe++;
        });

        // Get recent notifications (products that became expired or near expiry recently)
        const recentAlerts = products
            .filter(p => {
                const status = getStatus(p.expirationDate, threshold);
                return status === 'Expired' || status === 'Near Expiry';
            })
            .map(p => ({
                ...p.toObject(),
                status: getStatus(p.expirationDate, threshold)
            }))
            .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate))
            .slice(0, 10);

        res.status(200).json({
            summary: {
                total: totalProducts,
                expired,
                nearExpiry,
                safe
            },
            recentAlerts,
            lastUpdated: new Date()
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// GET expiring alerts (products expiring within threshold)
const getExpiringAlerts = async (req, res) => {
    const threshold = req.user?.settings?.expiryThreshold || 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thresholdDate = new Date(today.getTime() + threshold * 24 * 60 * 60 * 1000);

    try {
        const alerts = await Product.find({
            userId: req.userId,
            expirationDate: { $gte: today, $lte: thresholdDate }
        }).sort({ expirationDate: 1 });

        const alertsWithStatus = alerts.map(a => ({
            ...a.toObject(),
            status: 'Near Expiry'
        }));

        res.status(200).json(alertsWithStatus);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// GET monthly report
const getMonthlyReport = async (req, res) => {
    const { month, year } = req.query;
    
    if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required' });
    }

    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of the month

        const expiredProducts = await Product.find({
            userId: req.userId,
            expirationDate: { $gte: startDate, $lte: endDate }
        }).sort({ expirationDate: 1 });

        const expiredInMonth = expiredProducts.filter(p => {
            const expDate = new Date(p.expirationDate);
            return expDate < new Date();
        });

        // Category breakdown
        const categoryBreakdown = {};
        expiredInMonth.forEach(p => {
            if (!categoryBreakdown[p.category]) {
                categoryBreakdown[p.category] = { count: 0, quantity: 0 };
            }
            categoryBreakdown[p.category].count++;
            categoryBreakdown[p.category].quantity += p.quantity;
        });

        res.status(200).json({
            month: parseInt(month),
            year: parseInt(year),
            totalExpired: expiredInMonth.length,
            totalQuantityLost: expiredInMonth.reduce((sum, p) => sum + p.quantity, 0),
            products: expiredInMonth.map(p => p.toObject()),
            categoryBreakdown
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// GET a single product
const getProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const threshold = req.user?.settings?.expiryThreshold || 7;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ error: 'No such product' });
        }

        const product = await Product.findOne({ _id: id, userId: req.userId });
        if (!product) {
            return res.status(404).json({ error: 'No such product' });
        }

        const productObj = product.toObject();
        productObj.status = getStatus(product.expirationDate, threshold);

        res.status(200).json(productObj);
    } catch (error) {
        next(error);
    }
};

// DELETE a product
const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ error: 'No such product' });
        }

        const product = await Product.findOneAndDelete({ _id: id, userId: req.userId });
        if (!product) {
            return res.status(404).json({ error: 'No such product' });
        }

        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

// UPDATE a product
const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const threshold = req.user?.settings?.expiryThreshold || 7;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ error: 'No such product' });
        }

        const product = await Product.findOneAndUpdate(
            { _id: id, userId: req.userId }, 
            { ...req.body },
            { new: true }
        );

        if (!product) {
            return res.status(400).json({ error: 'No such product' });
        }

        const productObj = product.toObject();
        productObj.status = getStatus(product.expirationDate, threshold);

        res.status(200).json(productObj);
    } catch (error) {
        next(error);
    }
};

// GET all categories
const getCategories = async (req, res, next) => {
    try {
        const categories = await Product.distinct('category', { userId: req.userId });
        res.status(200).json(categories);
    } catch (error) {
        next(error);
    }
};
//UPLOAD CSV file
const uploadCSV = async (req, res, next) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded, Please upload a CSV file' });
        }

        const products = [];
        const filePath = file.path;

        fs.createReadStream(filePath)
            .pipe(csv.parse({ headers: true }))
            .on('error', (error) => {
                console.error(error);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                next(error);
            })
            .on('data', (row) => {
                if (row.name) {
                    const expDate = new Date(row.expirationDate);

                    if (!isNaN(expDate.getTime())) {
                        products.push({
                        name: row.name,
                        quantity: parseInt(row.quantity) || 0,
                        expirationDate: expDate,
                        category: row.category || 'General',
                        userId: req.userId
                    });
                }
            }
        })
        .on('end', async () => {
            try {
                if (products.length === 0) {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    return res.status(400).json({
                        error: "No valid products found in the CSV file. Check your date format (YYYY-MM-DD)."
                    });
                }

                await Product.insertMany(products);

                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

                res.status(200).json({
                    message: 'Successfully uploaded and added products',
                    count: products.length
                });
            } catch (error) {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                next(error);
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { 
    createProduct, 
    getProducts, 
    getProduct, 
    deleteProduct, 
    updateProduct, 
    getExpiringAlerts,
    getDashboardSummary,
    getMonthlyReport,
    getCategories,
    uploadCSV
};
