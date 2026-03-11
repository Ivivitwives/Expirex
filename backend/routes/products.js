const express = require('express');
const {
    createProduct,
    getProducts,
    getProduct,
    deleteProduct,
    updateProduct,
    getExpiringAlerts,
    getDashboardSummary,
    getMonthlyReport,
    getCategories
} = require('../controllers/productcontroller');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Dashboard summary
router.get('/dashboard', getDashboardSummary);

// Monthly report
router.get('/report', getMonthlyReport);

// Get all categories
router.get('/categories', getCategories);

// GET expiration alerts
router.get('/alerts', getExpiringAlerts);

// GET all products
router.get('/', getProducts);

// GET a single product
router.get('/:id', getProduct);

// POST a new product
router.post('/', createProduct);

// DELETE a product
router.delete('/:id', deleteProduct);

// UPDATE a product
router.patch('/:id', updateProduct);
router.put('/:id', updateProduct);

module.exports = router;
