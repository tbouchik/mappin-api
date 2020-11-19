const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Client } = require('../models');

const checkDuplicateEmail = async (email, userId) => {
  if (email !== process.env.GENERIC_EMAIL) {
    let ObjectId = require('mongoose').Types.ObjectId; 
    const client = await Client.findOne({ 
      email,
      user: new ObjectId(userId)
    });
    console.log(client)
    if (client) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
  }
};

const createClient = async (user, clientBody) => {
  await checkDuplicateEmail(clientBody.email, user._id);
  clientBody.user = user._id;
  const client = await Client.create(clientBody);
  return client;
};

const createDefaultClient = async (userId, company) => {
  const genericClientBody = {
    user: userId,
    email: process.env.GENERIC_EMAIL,
    password: 'Generated1',
    name: 'Generic Client',
    company,
  };
  const client = await Client.create(genericClientBody);
  return client;
};

const getClients = async (user, query) => {
  // FILTER
  const filter = pick(query, ['company']);
  const defaultClientId = await getDefaultClientId(user) // TODO: Optimize second call to DB 
  filter.user = user._id;
  filter._id = { $ne: defaultClientId }
  if (query.name) {
    filter.name = { $regex: `(?i)${query.name}` } 
  }
  // OPTIONS
  let page = query.page || 0;
  let limit = query.limit || 300;
  let skip = page * limit;
  let sort = page.sort || {createdAt: -1};
  const options = {
    limit, 
    skip, 
    sort
  }
  console.log('options', options);
  console.log('query', query);
  console.log('filter', filter);
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
  if (updateBody.email && updateBody.email !== client.email) {
    await checkDuplicateEmail(updateBody.email, user.id);
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

const getDefaultClientId = async (user) => {
  const client = await Client.findOne({ user: user._id, name: 'Generic Client' })
  if (!client) { 
    throw new AppError(httpStatus.NOT_FOUND, 'Client ID not found');
  } else if (parseInt(client.user) !== parseInt(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to access this client information');
  }
  return client._id;
};

const getClientsCount = async (user, query) => {
  let filter = {};
  filter.user = user._id; // filter by accountant
  if (query.name) {
    filter.name = { $regex: `(?i)${query.name}` } 
  }
  console.log('filter count :', filter)
  let count = await Client.countDocuments(filter)
  console.log('count is at ; ', count)
  return {count};
};

module.exports = {
  createClient,
  createDefaultClient,
  getClients,
  getClientById,
  getClientByEmail,
  updateClient,
  deleteClient,
  getDefaultClientId,
  getClientsCount,
};
