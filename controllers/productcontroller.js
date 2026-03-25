const fs = require('fs');
const csv = require('fast-csv');
const Product = require('../models/productmodel');
const mongoose = require('mongoose');



//CREATE a new product
const createProduct = async (req, res) => {
    const { name, quantity, expirationDate, category} = req.body;

    try {
        const product = await Product.create({ name, quantity, expirationDate, category });
        res.status(200).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

//GET all products
const getProducts = async (req, res) => {
  const {search, category} = req.query;
  let query = {};

  if (search) {
    query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
  }
  if (category) {
    query.category = category;
  }
  try {
  const products = await Product.find(query).sort({createdAt: -1})
  const today = new Date();
  const productsWithStatus = products.map(product => {
    const p = product.toObject();
    if(new Date(p.expirationDate) < today){
      p.status = 'Expired';
    } else if (new Date(p.expirationDate) <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      p.status = 'Expiring Soon';
    } else {
      p.status = 'Good';
    }
    return p;
  });



  res.status(200).json(productsWithStatus)
} catch (error) {
  res.status(400).json({ error: error.message })
};
};

//GET products expiring within 7 days
const getExpiringAlerts = async (req, res) => {
  const today = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(today.getDate() + 7);

  try {
    const alerts = await Product.find({
      expirationDate: { $gte: today, $lte: sevenDaysFromNow }
    }).sort({ expirationDate: 1 });

    res.status(200).json(alerts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

//GET a single product
const getProduct = async (req, res) => {
  const { id } = req.params
    if(!mongoose.Types.ObjectId.isValid(id)){
        return res.status(404).json({error: 'No such product'})
    }
    const product = await Product.findById(id)
    if(!product){
        return res.status(404).json({error: 'No such product'})
    }
    res.status(200).json(product)
}

//DELETE a product
const deleteProduct = async (req, res) => {
  const { id } = req.params
  if(!mongoose.Types.ObjectId.isValid(id)){
      return res.status(404).json({error: 'No such product'})
  }
  const product = await Product.findOneAndDelete({_id: id})
  if(!product){
      return res.status(404).json({error: 'No such product'})
  }
  res.status(200).json(product)
}

//UPDATE a product
const updateProduct = async (req, res) => {
  const { id } = req.params
  if(!mongoose.Types.ObjectId.isValid(id)){
      return res.status(404).json({error: 'No such product'})
  }
  const product = await Product.findOneAndUpdate({_id: id}, {...req.body})

  if(!product){
      return res.status(400).json({error: 'No such product'})
  }
  res.status(200).json(product)
}

//GET dashboard data
const getDashboard = async (req, res) => {
    try {
        const today = new Date();
        const warningDate = new Date();
        warningDate.setDate(today.getDate() + 7);

        //FIFO sort by expiration date
        const allProducts = await Product.find().sort({ expirationDate: 1 });
        
        res.json({ expired: allProducts.filter(p => new Date(p.expirationDate) < today), warning: allProducts.filter(p => { const d = new Date(p.expirationDate); return d >= today && d <= warningDate }), 
        all: allProducts });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
//UPLOAD CSV file
const uploadCSV = async (req, res) => {
  const file= req.file || req.files?.csvFile;
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded, Please upload a CSV file' });
  }

  const products = [];
  const filePath = file.path;

  fs.createReadStream(filePath)
  .pipe(csv.parse({ headers: true, trim: true }))
  .on('data', (row) => {
    if (row.name) {
      products.push({
        name: row.name,
        price: parseFloat(row.price),
        quantity: parseInt(row.quantity),
        expirationDate: new Date(row.expirationDate),
      category: row.category
    });
    }
  })
  .on('end', async () => {
    try { 
      if (products.length === 0) {
        throw new Error("No valid products found in the CSV file");
      }
      await Product.insertMany(products);
      fs.unlinkSync(filePath);
      res.status(200).json({ message: 'Successfully uploaded and added products' });
    } catch (error) {
      res.status(500).json({ error: 'Error inserting products into database' });
    }
  })
};
      

module.exports = { createProduct, getProducts, getProduct, deleteProduct, updateProduct, getExpiringAlerts, getDashboard, uploadCSV };