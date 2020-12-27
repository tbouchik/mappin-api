const express = require('express');
const subscriptionController = require('../../controllers/subscription.controller');
const auth = require('../../middlewares/auth');


const router = express.Router();

router
    .route('/')
    .get(auth('manageDocuments'), subscriptionController.getSubscriptions)

module.exports = router;
