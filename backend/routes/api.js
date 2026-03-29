const express = require('express')
const authRoutes = require('./auth')
const adminRoutes = require('./adminroutes')

const router = express.Router()

router.use('/auth', authRoutes)
router.use('/admin', adminRoutes)

module.exports = router
