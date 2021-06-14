const AWS = require('aws-sdk');
const httpStatus = require('http-status');
const AppError = require('../utils/AppError');
const { createInvoice, updateInvoice } = require('../services/invoice.service');
const { updateUserCounter } = require('../services/user.service');
const { aixtract, fetchMetada, populateInvoiceData } = require('../services/smelter.service')
const { omitBy } = require('lodash');
const status = require('./../enums/status')
const moment = require('moment')

AWS.config.update({ region: 'us-east-1' });

const smelt_bk = async(req, res) => {
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

const smelt = async(req, res) => {
  try {
    const { body, user } = req;
    let emptyDocumentMold = await createDocumentMold(user, body);
    res.json({ id: emptyDocumentMold.id });
    updateUserCounter(user._id, {counter: 1})
    // let documentMold = await moldMetadataInDocument(emptyDocumentMold);
    let documentMold = emptyDocumentMold;
    setTimeout(async() => {
       Object.assign(documentMold, fetchHardcodedMold(emptyDocumentMold.alias));
       await saveSmeltedResult(user, documentMold);
      }, 9000);
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
        metadata: documentBody.metadata,
        ggMetadata: documentBody.ggMetadata,
        status: status.SMELTED,
        skeleton: skeletonId,
        totalHt: documentBody.totalHt,
        totalTtc: documentBody.totalTtc,
        vat: documentBody.vat,
        vendor: documentBody.vendor,
        reference: documentBody.reference,
        orderNumber: documentBody.orderNumber,
        date: documentBody.date,
      });
    } catch(err) {
      console.log(err);
    }
}

const fetchHardcodedMold = (alias) => {
  result = undefined
  let date = null
  moment.locale('fr')
  switch (alias) {
    case "demo-bearing1.pdf":
      date = moment("25/01/2016", ['DD/MM/YYYY'])
      result = {
        status: status.SMELTED,
        totalHt: 85.00,
        totalTtc: 93.50,
        vat: 8.50,
        vendor: 'Sliced Invoices',
        reference: 'INV-3337',
        orderNumber: '12345',
        date: date.toDate(),
      }
      break;
    case "demo-bearing2.pdf":
      date = moment("03/08/2019", ['DD/MM/YYYY'])
      result = {
        status: status.SMELTED,
        totalHt: 640.00,
        totalTtc: 706.00,
        vat: 66.00,
        vendor: 'John Miller',
        reference: '',
        orderNumber: '',
        date: date.toDate(),
      }
      break;
    case "demo-bearing3.pdf":
      date = moment("03/08/2019", ['DD/MM/YYYY'])
      result = {
        status: status.SMELTED,
        totalHt: 10200.00,
        totalTtc: 12240.00,
        vat: 2040.00,
        vendor: 'MY COMPANY NAME',
        reference: '',
        orderNumber: '105',
        date: null,
      }
      break;
  }
  return result;
}

module.exports = {
    smelt,
};
