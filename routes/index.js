
const express = require("express");
const router = express.Router();
const authRoutes = require('./authRoutes');
const homeRoutes = require('./homeRoutes');
const helpRoutes = require('./helpRoutes');

router.use('/', homeRoutes);
router.use('/auth', authRoutes);
router.use('/help', helpRoutes);


module.exports = router;
