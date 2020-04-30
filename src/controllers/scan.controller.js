const AWS = require("aws-sdk");
const path = require("path");
const exec = require("await-exec");
const fs = require("fs");
const csv = require("csvtojson");
const AppError = require('../utils/AppError');
const httpStatus = require('http-status');
const {createDocument} = require('../services/document.service');

AWS.config.update({ region: "us-east-1" });

const scanDocument = async (req, res) => {
    try {
        const { body } = req;
        const textractorScriptPath = path.join(__dirname, process.env.TEXTRACTOR_PATH);
        let command = `python3.7 ${textractorScriptPath} --documents ${process.env.AWS_BUCKET}/${body.filename} --forms --output ${process.env.TEXTRACTOR_OUTPUT}`;
        await exec(command, {
        timeout:200000
        });
        const fileName = body.filename.split(".")[0];
        const fileExtension = body.filename.split(".")[1];
        const outputDirName = fileName + "-" + fileExtension;
        if (fs.existsSync(`${process.env.TEXTRACTOR_OUTPUT}/${outputDirName}/${outputDirName}-page-1-forms.csv`)) {
                //joining path of directory
                const directoryPath = `${process.env.TEXTRACTOR_OUTPUT}/${outputDirName}`;
                //passing directoryPath and callback function
                fs.readdir(directoryPath, async function(err, files) {
                    //handling error
                    if (err) {
                        throw new AppError(httpStatus.NOT_FOUND, err);
                    }
                    let pageNumber = 0;
                    let finalJson = {};
                    //listing all files using forEach
                    for (let i = 0; i < files.length; i++) {
                        if (files[i].split(".")[1] === "csv" && files[i].includes("forms")) {
                            pageNumber += 1;
                            const jsonArray = await csv().fromFile(path.join(directoryPath, files[i]));
                            finalJson[`page_${pageNumber}`] = jsonArray;
                        }
                    }
                    try{
                        documentBody = {
                            link: `${process.env.AWS_BUCKET}/${body.filename}`,
                            name: body.filename,
                            metadata: finalJson
                        }
                        await createDocument(req.user,documentBody)
                    }catch(err){
                        throw new AppError(httpStatus.SERVICE_UNAVAILABLE, err);
                    }
                    res.send(finalJson);

                });
        } else {
            throw new AppError(httpStatus.NO, 'Output file not found');
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Caught error" });
    }
};

module.exports = {scanDocument};
