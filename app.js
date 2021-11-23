const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1)GLOBAL MIDDLEWARES
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));
// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100, // maxx number of requests allowed
  windowMs: 60 * 60 * 1000, // 1 hour window, that is if crossed 100 request it will prompt an error message and then user have to wait for 1 hour
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter); // apply to route that start with /api

// Body parser, reading data from body req.body
app.use(express.json({ limit: '10kb' })); // it will limit data of body to take only 10kb

// Data sanitizaion against NoSQL query injection
app.use(mongoSanitize()); // it will basically look after body and params and filter out $ signs and . (dots) to prevent NoSQL attacks

// Data sanitization against XSS
app.use(xss()); // it will clean any user input from malicious html code

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
); // we are allowing duplicates for these query strings

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString(); // convert date and time to readable string
  // console.log(req.headers);
  next();
});

// 2) ROUTES
app.get('/', (req, res) => {
  res.status(200).render('base', {
    tour: 'The Forest Hiker',
    user: 'Parth Dhawan',
  });
}); // express will automatically know the file which we are looking for

app.get('/overview', (req, res) => {
  res.status(200).render('overview', {
    title: 'All Tours',
  });
});

app.get('/tour', (req, res) => {
  res.status(200).render('tour', {
    title: 'The Forest Hiker',
  });
});

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// if any request reached this point of code that means it wasn't handled by any of the above router functions, because middleware executes line by line
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404)); // it will skip all other middleware and go directly to error handling middleware
}); // all and star for every route

app.use(globalErrorHandler); // express automatically knows it is an error handling middleware, error first middleware, first argument is error

module.exports = app;
