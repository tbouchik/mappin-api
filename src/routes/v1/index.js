const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const companyRoute = require('./company.route');
const documentRoute = require('./document.route');
const smelterRoute = require('./smelter.route');
const clientRoute = require('./client.route');
const filterRoute = require('./filter.route');
const subscriptionRoute = require('./subscription.route');
const invoiceRoute = require('./invoice.route');
const journalRoute = require('./journal.route');
const vendorRoute = require('./vendor.route');

const router = express.Router();

router.use('/auth', authRoute);
router.use('/users', userRoute);
router.use('/companies', companyRoute);
router.use('/documents', documentRoute);
router.use('/smelt', smelterRoute);
router.use('/clients', clientRoute);
router.use('/filters', filterRoute);
router.use('/subs', subscriptionRoute);
router.use('/invoice', invoiceRoute);
router.use('/journals', journalRoute);
router.use('/vendors', vendorRoute);

module.exports = router;
