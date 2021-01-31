const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Skeleton } = require('../models');
const { getQueryOptions, mergeClientTemplateIds, objectToMap, mapToObject } = require('../utils/service.util');
const { skeletonHasClientTemplate, skeletonStoreClientTemplate } = require('../miner/skeletons')
const { findGgMappingKey, findGgMappingKeyFromMBC } = require('./mbc.service')
const { getFilterById } = require('./filter.service');
let ObjectId = require('mongoose').Types.ObjectId; 

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

updateSkeletonFromDocUpdate = async (user, documentBody, mbc) => {
  if (mbc){
    const skeleton = await getSkeletonById(documentBody.skeleton);
    if (skeleton.id === documentBody.skeleton){
      if (skeletonHasClientTemplate(skeleton, user._id, documentBody.filter)) {
       const clientTempKey = mergeClientTemplateIds(user._id, documentBody.filter)
       let newBboxMappings = skeleton.bboxMappings.get(clientTempKey);
       newBboxMappings = Object.assign(newBboxMappings, mbc);
       skeleton.bboxMappings.set(clientTempKey, newBboxMappings);
       let newGgMappings = skeleton.ggMappings.get(clientTempKey);
       let template = await getFilterById(user, documentBody.filter, true);
       let ggMatchedResult = findGgMappingKeyFromMBC(template.keys, documentBody.ggMetadata, mbc);
       newGgMappings = Object.assign(newGgMappings, ggMatchedResult)
       skeleton.ggMappings.set(clientTempKey, mapToObject(newGgMappings));
       updateSkeleton(skeleton._id, skeleton);
      }
    }
  }
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
  updateSkeletonFromDocUpdate,
};
