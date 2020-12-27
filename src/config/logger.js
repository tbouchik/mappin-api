const winston = require('winston');
const config = require('./config');
var {Loggly} = require('winston-loggly-bulk');

winston.add(new Loggly({
    token: "ab0c67b2-b2c4-4a5a-97f5-33c5fb099298",
    subdomain: "smeltor",
    tags: ["Winston-NodeJS"],
    json: true
}));

winston.log('info', "Hello World from Node.js!");


const enumerateErrorFormat = winston.format(info => {
  if (info instanceof Error) {
    Object.assign(info, { message: info.stack });
  }
  return info;
});

const logger = winston.createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    enumerateErrorFormat(),
    config.env === 'development' ? winston.format.colorize() : winston.format.uncolorize(),
    winston.format.splat(),
    winston.format.printf(({ level, message }) => `${level}: ${message}`)
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

module.exports = logger;
