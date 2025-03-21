const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, clientService, filterService } = require('../services');
const mailService = require('../services/mail.service');

const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const tokens = await authService.generateAuthTokens(user.id);
  await clientService.createDefaultClient(user.id, req.body.company);
  await filterService.createDefaultFilter(user.id);
  const response = { user: user.transform(), tokens };
  mailService.welcomeMessage(user)
  res.status(httpStatus.CREATED).send(response);
});

const login = catchAsync(async (req, res) => {
  const userExists = await userService.checkUserExists(req.body.email);
  let response = {};
  if (userExists) {
    const user = await authService.loginUser(req.body.email, req.body.password);
    const tokens = await authService.generateAuthTokens(user.id);
    response = { user: user.transform(), tokens };
  } else {
    const client = await authService.loginClient(req.body.email, req.body.password);
    const tokens = await authService.generateAuthTokens(client.id);
    response = { user: client.transform(), tokens };
  }
  res.send(response);
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuthTokens(req.body.refreshToken);
  const response = { ...tokens };
  res.send(response);
});

const forgotPassword = catchAsync(async (req, res) => {
  try {
    const resetPasswordToken = await authService.generateResetPasswordToken(req.body.email);
    if (resetPasswordToken.token && resetPasswordToken.user) {
      await mailService.sendResetPasswordEmail(req.body.email, resetPasswordToken.token, resetPasswordToken.user);
    }
  } catch(error) {
    console.log(error)
  } finally {
    res.status(httpStatus.NO_CONTENT).send();
  }
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  register,
  login,
  refreshTokens,
  forgotPassword,
  resetPassword,
};
