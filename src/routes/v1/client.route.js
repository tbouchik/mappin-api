const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const clientValidation = require('../../validations/client.validation');
const clientController = require('../../controllers/client.controller');

const router = express.Router();

  router
    .route('/count/')
    .get(auth('manageUsers'), validate(clientValidation.getClients), clientController.getClientsCount);

  router
    .route('/')
    .post(auth('manageUsers'), validate(clientValidation.createClient), clientController.createClient)
    .get(auth('manageUsers'), validate(clientValidation.getClients), clientController.getClients);

  router
    .route('/:clientId')
    .get(auth('manageUsers'), validate(clientValidation.getClient), clientController.getClient)
    .patch(auth('manageUsers'), validate(clientValidation.updateClient), clientController.updateClient)
    .delete(auth('manageUsers'), validate(clientValidation.deleteClient), clientController.deleteClient);

module.exports = router;
