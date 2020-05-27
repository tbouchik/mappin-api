const AWS = require('aws-sdk');
const path = require('path');
const exec = require('await-exec');
const fs = require('fs');
const csv = require('csvtojson');
const AppError = require('../utils/AppError');
const httpStatus = require('http-status');
const { createDocument, updateDocument } = require('../services/document.service');
const Queue = require('better-queue');

AWS.config.update({ region: 'us-east-1' });

const singleSmelt = async (req, res) => {
  try {
    const { body, user } = req;
    let command = `python3.7 ${process.env.TEXTRACTOR_PATH} --documents ${process.env.AWS_BUCKET_PATH}/${body.filename} --forms --output ${process.env.TEXTRACTOR_OUTPUT}`;
    await exec(command, {
      timeout: 200000,
    });
    const fileName = body.filename.split('.')[0];
    const fileExtension = body.filename.split('.')[1];
    const outputDirName = fileName + '-' + fileExtension;
    if (fs.existsSync(`${process.env.TEXTRACTOR_OUTPUT}/${outputDirName}/${outputDirName}-page-1-forms.csv`)) {
      //joining path of directory
      const directoryPath = `${process.env.TEXTRACTOR_OUTPUT}/${outputDirName}`;
      //passing directoryPath and callback function
      fs.readdir(directoryPath, async (err, files) => {
        //handling error
        if (err) {
          throw new AppError(httpStatus.NOT_FOUND, err);
        }
        let pageNumber = 0;
        let finalJson = {};
        //listing all files using forEach
        for (let i = 0; i < files.length; i++) {
          if (files[i].split('.')[1] === 'csv' && files[i].includes('forms')) {
            pageNumber += 1;
            const jsonArray = await csv().fromFile(path.join(directoryPath, files[i]));
            finalJson[`page_${pageNumber}`] = jsonArray;
          }
        }
        try {
          documentBody = {
            link: `${process.env.AWS_BUCKET_PATH}/${body.filename}`,
            name: body.filename,
            metadata: finalJson,
          };
          createDocument(user, documentBody).then(result => {
            res.send({
              id: result._id,
              name: body.filename,
              metadata: finalJson,
            });
          });
        } catch (err) {
          throw new AppError(httpStatus.SERVICE_UNAVAILABLE, err);
        }
      });
    } else {
      throw new AppError(httpStatus.NO, 'Output file not found');
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Caught error' });
  }
};

const bulkSmelt = (req, res) => {
  try {
    const { body, user } = req;
    let queue = new Queue(async (payload, cb) => {
      let finalJson = {};
      let filename = payload.documentBody.alias
      const command = `python3.7 ${process.env.TEXTRACTOR_PATH} --documents ${process.env.AWS_BUCKET_PATH}/${filename} --forms --output ${process.env.TEXTRACTOR_OUTPUT}`;
      await exec(command, {
        timeout: 200000,
      });
      const fileName = filename.split('.')[0];
      const fileExtension = filename.split('.')[1];
      const outputDirName = fileName + '-' + fileExtension;
      if (fs.existsSync(`${process.env.TEXTRACTOR_OUTPUT}/${outputDirName}/${outputDirName}-page-1-forms.csv`)) {
        //joining path of directory
        const directoryPath = `${process.env.TEXTRACTOR_OUTPUT}/${outputDirName}`;
        //passing directoryPath and callback function
        fs.readdir(directoryPath, async (err, files) => {
          //handling error
          if (err) {
            throw new AppError(httpStatus.NOT_FOUND, err);
          }
          let pageNumber = 0;
          //listing all files using forEach
          for (let i = 0; i < files.length; i++) {
            if (files[i].split('.')[1] === 'csv' && files[i].includes('forms')) {
              pageNumber += 1;
              const jsonArray = await csv().fromFile(path.join(directoryPath, files[i]));
              finalJson[`page_${pageNumber}`] = jsonArray;
            }
          }
          cb(null, finalJson);
        });
      }
    });
    files = body.files;
    for (let file of files) {
      let documentBody = {
        link: `${process.env.AWS_BUCKET_PATH}/${file.alias}`,
        name: file.name,
        metadata: {},
        mimeType: file.mimeType,
        alias: file.alias,
        businessPurpose: file.businessPurpose,
        extractionType: file.extractionType,
        status: 'pending',
      };
      createDocument(user, documentBody).then(res => {
        queue.push({
          id: res._id,
          documentBody,
        });
      });
    }
    queue.on('task_finish', (taskId, result) => {
      console.log('smelt result: \n', result)
      updateDocument(user, taskId, {
        metadata: { ...result },
        status: 'smelted',
      }).then();
    });

    queue.on('empty', () => {
      console.log('EMPTY');
    });
    queue.on('drain', () => {
      console.log('DRAIN');
      res.send('OK');
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Caught error' });
  }
};

module.exports = {
  singleSmelt,
  bulkSmelt,
};
