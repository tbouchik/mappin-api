const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const s3Proxy = require('s3-proxy');
const companion = require('@uppy/companion');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const AppError = require('./utils/AppError');
const client = require('prom-client');

const app = express();

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// gzip compression
app.use(compression());

// enable cors
app.use(cors());
app.options('*', cors());

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// uppy
const options = {
  providerOptions: {
    s3: {
      getKey: (req, filename, metadata) => filename,
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
      bucket: process.env.AWS_BUCKET_NAME,
      region: 'us-east-1',
      useAccelerateEndpoint: false, // default: false,
      expires: 3600, // default: 300 (5 minutes)
      acl: 'private', // default: public-read
    },
  },
  server: {
    host: 'localhost:3000', // or yourdomain.com
    protocol: 'http',
  },
  filePath: process.env.FILEPATH,
  secret: process.env.AWS_SECRET_ACCESS_KEY,
};
app.use(companion.app(options));

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

// Create a Registry which registers the metrics
const register = new client.Registry()

// Enable the collection of default metrics
client.collectDefaultMetrics({ register })

const getDurationInMilliseconds  = (start) => {
  const NS_PER_SEC = 1e9
  const NS_TO_MS = 1e6
  const diff = process.hrtime(start)

  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS
}

// Create a histogram metric
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['method', 'route', 'params', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
})

// Register the histogram for requests duration
register.registerMetric(httpRequestDurationMicroseconds)
app.use((req, res, next) => {
  const start = process.hrtime()
  res.on('close', () => {
      const durationInMilliseconds = getDurationInMilliseconds (start)
      httpRequestDurationMicroseconds
        .labels(req.method, req._parsedUrl.pathname, req._parsedUrl.query, res.statusCode)
        .observe(durationInMilliseconds)
  })
  next()
})

// v1 api routes
app.use('/v1', routes);

// s3-proxy
app.get(
  '/media/*',
  function(req, res, next) {
    req.originalUrl = req.originalUrl.replace('/media', '');
    next();
  },
  s3Proxy({
    bucket: 'bucket413',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    overrideCacheControl: 'max-age=100000',
    defaultKey: 'index.html',
  })
);
app.get('/metrics',function(req, res, next) {
  res.setHeader('Content-Type', register.contentType);
  register.metrics().then((data) => {
    res.end(data);
  })
})

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new AppError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to AppError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;
