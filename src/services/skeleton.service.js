const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Skeleton } = require('../models');
const { getQueryOptions } = require('../utils/service.util');


const createSkeleton = async skeletonBody => {
  skeletonBody.user = user._id;
  const skeleton = await Skeleton.create(skeletonBody);
  return skeleton;
};

const getSkeletons = async query => {
  const filter = pick(query, ['name']);
  const options = getQueryOptions(query);
  const skeletons = await Skeleton.find(filter, null, options);
  return skeletons;
};

const getSkeletonById = async skeletonId => {
  const skeleton = await Skeleton.findById(skeletonId);
  if (!skeleton) {
    throw new AppError(httpStatus.NOT_FOUND, 'Skeleton not found');
  }
  return skeleton;
};

const updateSkeleton = async (skeletonId, updateBody) => {
  const skeleton = await getSkeletonById(skeletonId);
  Object.assign(skeleton, updateBody);
  await skeleton.save();
  return skeleton;
};

const deleteSkeleton = async skeletonId => {
  const skeleton = await getSkeletonById(skeletonId);
  await skeleton.remove();
  return skeleton;
};

module.exports = {
  createSkeleton,
  getSkeletons,
  getSkeletonById,
  updateSkeleton,
  deleteSkeleton,
};
