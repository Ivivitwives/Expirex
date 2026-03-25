const express = require('express');
const multer = require('multer');
const path = require('path');
const{createProduct,getProducts,getProduct,deleteProduct,updateProduct,getExpiringAlerts, uploadCSV} = require('../controllers/productcontroller');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });


router.post('/uploads', upload.single('csvFile'), uploadCSV);


//GET all products
router.get('/', getProducts);

router.get('/', (req, res) => {
  res.json({ message: 'Get all products' });
})

//GET expiration alerts
router.get('/alerts', getExpiringAlerts);
router.get('/alerts', async (req, res) => {
    res.json({ message: 'Get expiration alerts' });
});

//GET a single product
router.get('/:id', getProduct);

router.get('/:id', (req, res) => {
    res.json({ message: 'Get a single product'})
})

//POST a new product
router.post('/', createProduct);

router.post('/', (req, res) => {
    res.json({ message: 'Post a new product'})
})

//DELETE a product
router.delete('/:id', deleteProduct);
router.delete('/:id', (req, res) => {
    res.json({ message: 'Delete a product'})
})

//UPDATE a product
router.put('/:id', updateProduct);
router.patch('/:id', (req, res) => {
    res.json({ message: 'Update a product'})
})

module.exports = router;