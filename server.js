require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const productsRoutes = require('./routes/products')
const apiRoutes = require('./routes/api')


//express app
const app = express()

//middleware
app.use(cors())
app.use(express.json())

app.use((req, res, next) => {
  console.log(req.path, req.method)
  next()
})

//routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to my soul society'})
})

app.use('/api/products', productsRoutes)
app.use('/api', apiRoutes)

//connect to db
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`Connected to DB and listening on port ${process.env.PORT}`)
    })
    })
  .catch((error) => {
    console.log(error)
  })

//listen for requests
app.listen(process.env.PORT, () => {
  console.log(`Listening on port ${process.env.PORT}`)
})