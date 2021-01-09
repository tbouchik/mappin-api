const express = require('express');
const auth = require('../../middlewares/auth');
const smelterController = require('../../controllers/smelter.controller');

const router = express.Router();


router.route('/bulk').post(auth('manageDocuments'), smelterController.bulkSmelt);

module.exports = router;
