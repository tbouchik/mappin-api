const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const companyRoute = require('./company.route');
const documentRoute = require('./document.route');
const smelterRoute = require('./smelter.route');

const router = express.Router();

router.use('/auth', authRoute);
router.use('/users', userRoute);
router.use('/companies', companyRoute);
router.use('/documents', documentRoute);
router.use('/smelt', smelterRoute);

module.exports = router;
