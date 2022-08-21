const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Client, User } = require('../models');
const stdClients = require('../utils/stdClient');

const checkDuplicateEmail = async (email, userId) => {
  if (email !== process.env.GENERIC_EMAIL) {
    let ObjectId = require('mongoose').Types.ObjectId; 
    const client = await Client.findOne({
      email,
      user: new ObjectId(userId)
    });
    if (client) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
  }
};

const createClient = async (user, clientBody) => {
  await checkDuplicateEmail(clientBody.email, user._id);
  clientBody.lastModifiedBy = user._id;
  clientBody.user = user._id;
  const client = await Client.create(clientBody);
  return client;
};

const createDefaultClient = async (userId, company) => {
  let defaultClients = stdClients.map(x => {x.user = userId; return x});
  const genericClientBody = {
    user: userId,
    email: process.env.GENERIC_EMAIL,
    password: 'Generated1',
    name: 'Generic Client',
    reference:'N/A',
    company,
  };
  defaultClients.push(genericClientBody);
  const client = await Client.insertMany(defaultClients);
  return client;
};

const getClients = async (user, query) => {
  // FILTER
  const filter = pick(query, ['company']);
  const usersFromSameCompany = await User.find({company: user.company}).select({ "_id": 1}).exec()
  const usersIdsFromSameCompany = usersFromSameCompany.map(x => x._id)
  filter.user = {$in: usersIdsFromSameCompany};
  if (query.name) {
    filter.name = { $regex: `(?i)${query.name}` } 
  }
  const defaultClientId = await getDefaultClientId(user) // TODO: Optimize second call to DB 
  if(query.current) {
    let ObjectId = require('mongoose').Types.ObjectId;
    const idToExclude = new ObjectId(query.current)
    // qty: { $nin: [ 5, 15 ] }
    filter._id = { $nin: [defaultClientId, idToExclude]}
  } else {
    filter._id = { $ne: defaultClientId }
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
  const clients = await Client.find(filter, null, options)
  .populate('lastModifiedBy', 'name');
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
  updateBody.lastModifiedBy = user._id;
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
  let count = await Client.countDocuments(filter)
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
