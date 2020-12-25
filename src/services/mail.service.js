const httpStatus = require('http-status');
const AppError = require('../utils/AppError');
var Mailgun = require('mailgun-js');
const path = require('path');
const fs = require('fs');
const Handlebars = require("handlebars");

const welcomeMessage = async (user) => {
  var filepath = path.join(__dirname, '../../ressources/favicon.png');
  fs.readFile(path.join(__dirname, '../templates/welcome.handlebars'), null, function (err,filedata) {
    if (err) {
      console.log(err);
    }
    var mailgun = new Mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN, host: process.env.MAILGUN_HOST});
    var seed = { name: user.name }
    var template = Handlebars.compile(filedata.toString())
    const data = {
        from: 'Smeltor <no-reply@auto.smeltor.com>',
        to: 'tbouchikhi1@hotmail.com',
        subject: 'Welcome to Smeltor',
        text: '[Smeltor] Welcome to Smeltor',
        html: template(seed),
        inline: filepath
      };
      mailgun.messages().send(data, function (error, body) {
        if(error){
            throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Could not send welcome email')
        }
      });
  });
};
 
sendResetPasswordEmail = async (email, token, user) => {
  var filepath = path.join(__dirname, '../../ressources/favicon.png');
  fs.readFile(path.join(__dirname, '../templates/forgot-password.handlebars'), null, function (err,filedata) {
    if (err) {
      console.log(err);
    }
    var mailgun = new Mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN, host: process.env.MAILGUN_HOST});
    var seed = { 
      name: user.name,
      hyperlink: `https://www.smeltor.com/reset-verification?key=${token}`
    }
    var template = Handlebars.compile(filedata.toString())
    const data = {
        from: 'Smeltor <no-reply@auto.smeltor.com>',
        to: 'tbouchikhi1@hotmail.com',
        subject: 'Reset Password',
        text: 'Resetting your Smeltor password',
        html: template(seed),
        inline: filepath
      };
      mailgun.messages().send(data, function (error, body) {
        if(error){
            throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Could not send welcome email')
        }
      });
  });
}

const confirmRegistration = async (user) => {
  var filepath = path.join(__dirname, '../../ressources/favicon.png');
  fs.readFile(path.join(__dirname, '../templates/signup.handlebars'), null, function (err,filedata) {
    if (err) {
      console.log(err);
    }
  var mailgun = new Mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN, host: process.env.MAILGUN_HOST});
  const data = {
      from: 'Smeltor <no-reply@auto.smeltor.com>',
      to: 'tbouchikhi1@hotmail.com',
      subject: 'Welcome to Smeltor',
      text: '[Smeltor] Welcome to Smeltor',
      html: filedata,
      inline: filepath
    };
    mailgun.messages().send(data, function (error, body) {
      if(error){
          throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Could not send welcome email')
      }
      console.log('body', body);
    });
  });
};



module.exports = {
    welcomeMessage,
    sendResetPasswordEmail,
    confirmRegistration,
};
