const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { clientService } = require('../services');

const createClient = catchAsync(async (req, res) => {
  const client = await clientService.createClient(req.user, req.body);
  res.status(httpStatus.CREATED).send(client.transform());
});

const getClients = catchAsync(async (req, res) => {
  const clients = await clientService.getClients(req.user, req.query);
  const response = clients.map(client => client.transform());
  res.send(response);
});

const getClient = catchAsync(async (req, res) => {
  const client = await clientService.getClientById(req.user, req.params.clientId);
  res.send(client.transform());
});

const updateClient = catchAsync(async (req, res) => {
  const client = await clientService.updateClient(req.user, req.params.clientId, req.body);
  res.send(client.transform());
});

const deleteClient = catchAsync(async (req, res) => {
  await clientService.deleteClient(req.user, req.params.clientId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
};
