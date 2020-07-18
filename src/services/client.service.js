const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Client, User } = require('../models');
const { getQueryOptions } = require('../utils/service.util');
const uuidv4 = require('uuid/v4');

const checkDuplicateEmail = async (email, excludeClientId) => {
  if (email !== process.env.GENERIC_EMAIL) {
    const user = await User.findOne({ email });
    const client = await Client.findOne({ email, _id: { $ne: excludeClientId } });
    if (client || user) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
  }
};

const createClient = async (user, clientBody) => {
  await checkDuplicateEmail(clientBody.email);
  clientBody.user = user._id;
  const client = await Client.create(clientBody);
  return client;
};

const createDefaultClient = async (userId, company) => {
  const genericClientBody = {
    user: userId,
    email: process.env.GENERIC_EMAIL,
    password: uuidv4(),
    name: 'Generic Client',
    company,
  };
  const client = await Client.create(genericClientBody);
  return client;
};

const getClients = async (user, query) => {
  const filter = pick(query, ['name', 'role', 'company']);
  filter.user = user._id;
  const options = getQueryOptions(query);
  const clients = await Client.find(filter, null, options);
  return clients;
};

const getClientById = async (user, clientId) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new AppError(httpStatus.NOT_FOUND, 'Client not found');
  } else if (parseInt(client.user) !== parseInt(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to access this client information');
  }
  return client;
};

const getClientByEmail = async email => {
  const client = await Client.findOne({ email });
  if (!client) {
    throw new AppError(httpStatus.NOT_FOUND, 'No client found with this email');
  }
  return client;
};

const updateClient = async (user, clientId, updateBody) => {
  const client = await getClientById(user, clientId);
  if (updateBody.email) {
    await checkDuplicateEmail(updateBody.email, clientId);
  }
  Object.assign(client, updateBody);
  await client.save();
  return client;
};

const deleteClient = async (user, clientId) => {
  const client = await getClientById(user, clientId);
  await client.remove();
  return client;
};

module.exports = {
  createClient,
  createDefaultClient,
  getClients,
  getClientById,
  getClientByEmail,
  updateClient,
  deleteClient,
};
