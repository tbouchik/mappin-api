const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user.transform());
});

const getUsers = catchAsync(async (req, res) => {
  const users = await userService.getUsers(req.user, req.query);
  const response = users.map(user => user.transform());
  res.send(response);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.user, req.params.userId);
  res.send(user.transform());
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUser(req.user, req.params.userId, req.body);
  res.send(user.transform());
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUser(req.user, req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getUserCount = catchAsync( (req, res) => {
  res.send({count: req.user.counter});
});


module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserCount,
};
