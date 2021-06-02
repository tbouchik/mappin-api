const AWS = require('aws-sdk');
const httpStatus = require('http-status');
const AppError = require('../utils/AppError');
const { createInvoice, updateInvoice } = require('../services/invoice.service');
const { updateUserCounter } = require('../services/user.service');
const { aixtract, fetchMetada, populateInvoiceData } = require('../services/smelter.service')
const { omitBy } = require('lodash');
const status = require('./../enums/status')

AWS.config.update({ region: 'us-east-1' });

const smelt = async(req, res) => {
  try {
    const { body, user } = req;
    let emptyDocumentMold = await createDocumentMold(user, body);
    res.json({ id: emptyDocumentMold.id });
    updateUserCounter(user._id, {counter: 1})
    let documentMold = await moldMetadataInDocument(emptyDocumentMold);
    await saveSmeltedResult(user, documentMold);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Caught error' });
  }
};

const createDocumentMold = async (user, file) => {
    let documentBody = {
      link: `${process.env.AWS_BUCKET}/${file.alias}`,
      name: file.name,
      metadata: {},
      ggMetadata: {},
      filter: file.filter,
      mimeType: file.mimeType,
      alias: file.alias,
      status: status.PENDING,
      isBankStatement: false,
    };
    let createdMold = await createInvoice(user, documentBody)
    return createdMold.transform();
}

const moldMetadataInDocument = async (payload) => {
    let newDocumentBody = Object.assign({}, payload);
    let { awsMetadata, gcpMetadata } = await startSmelterEngine(payload);
    newDocumentBody.metadata = awsMetadata.status === 'fulfilled' ? awsMetadata.value.words : {};
    newDocumentBody.ggMetadata = gcpMetadata.status === 'fulfilled' ? omitBy(gcpMetadata.value, (v,k) => k[0]=='$') : {};
    return newDocumentBody;
}

const startSmelterEngine = async (payload) => {
    const filename = payload.alias;
    const mimeType = payload.mimeType;
    const isBankStatement = payload.isBankStatement;
    return Promise.allSettled([
      fetchMetada(filename, isBankStatement),
      aixtract(filename, mimeType)
    ]).then((metadata) => {
      return {
        awsMetadata: metadata[0],
        gcpMetadata: metadata[1],
      };
    })
}

const saveSmeltedResult = async (user, documentBody) => {
    try{
      let skeletonId = null;
      let document = documentBody;
      ({ skeletonId, document } = await populateInvoiceData(user, documentBody, documentBody.id));
      await updateInvoice(user, documentBody.id, {
        metadata: document.metadata,
        ggMetadata: document.ggMetadata,
        status: status.SMELTED,
        skeleton: skeletonId,
        totalHt: document.totalHt,
        totalTtc: document.totalTtc,
        vat: document.vat,
        vendor: document.vendor,
        reference: document.reference,
        orderNumber: document.orderNumber,
        date: document.date,
      });
    } catch(err) {
      console.log(err);
    }
}

module.exports = {
    smelt,
};
