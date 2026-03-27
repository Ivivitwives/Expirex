const express = require('express');
const multer = require('multer');
const {
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
} = require('../controllers/productcontroller');
const auth = require('../middleware/auth');

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

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

// POST csv
router.post('/upload-csv', upload.single('csvFile'), uploadCSV);

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
