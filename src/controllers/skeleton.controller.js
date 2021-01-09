const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { skeletonService } = require('../services');

const createSkeleton = catchAsync(async (req, res) => {
  const skeleton = await skeletonService.createSkeleton(req.user, req.body);
  res.status(httpStatus.CREATED).send(skeleton.transform());
});

const getSkeletons = catchAsync(async (req, res) => {
  const skeletons = await skeletonService.getSkeletons(req.user, req.query);
  const response = skeletons.map(skeleton => skeleton.transform());
  res.send(response);
});

const getSkeleton = catchAsync(async (req, res) => {
  const skeleton = await skeletonService.getSkeletonById(req.user, req.params.skeletonId);
  res.send(skeleton.transform());
});

const updateSkeleton = catchAsync(async (req, res) => {
  const skeleton = await skeletonService.updateSkeleton(req.user, req.params.skeletonId, req.body);
  res.send(skeleton.transform());
});

const deleteSkeleton = catchAsync(async (req, res) => {
  await skeletonService.deleteSkeleton(req.user, req.params.skeletonId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createSkeleton,
  getSkeletons,
  getSkeleton,
  updateSkeleton,
  deleteSkeleton,
};
