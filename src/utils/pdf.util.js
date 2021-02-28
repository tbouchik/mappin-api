
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path')
const AWS = require('aws-sdk');
const awsConfig = require('aws-config');


const streamAndSendStream = (inputPath) => {
    const pdfAlias = inputPath.split('.')[0].split('/').pop() + '.pdf'
    const pdfPath = path.join(process.env.TEXTRACTOR_OUTPUT, pdfAlias) 
    
    doc = new PDFDocument
    let writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);
    //Add an image, constrain it to a given size, and center it vertically and horizontally 
    doc.image(inputPath, {
        fit: [500, 400],
        align: 'center',
        valign: 'center'
    });
    doc.end();
    let fileUploadedToS3Promise = new Promise ((resolve) =>{       
        writeStream.on('finish', async ()=> {
            const s3options = {
                bucket: process.env.AWS_BUCKET_NAME,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            };
            const s3 = new AWS.S3(awsConfig(s3options));
            let params = {
                Key : pdfAlias,
                Body : fs.createReadStream(pdfPath),
                Bucket : process.env.AWS_BUCKET_NAME,
                ContentType : 'application/pdf'
            }
            let data = await s3.upload(params).promise()
            resolve(pdfAlias);
        })
    })
    return fileUploadedToS3Promise;
}
const streamImageToFile = async (stream, filePath) => {
    return new Promise ((resolve, reject) => {
        fs.writeFile(filePath, stream, (err) => {
            if (err) reject(err);
            resolve(filePath);
        });
    })
}

const getS3PdfAlias = async (stream, filePath) => {
    const imagePath = await streamImageToFile(stream, filePath);
    let pdfAlias = await streamAndSendStream(imagePath);
    return pdfAlias;
}

module.exports = {
    getS3PdfAlias
  };