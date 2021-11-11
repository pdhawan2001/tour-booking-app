const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

// 1)GLOBAL MIDDLEWARES
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100, // maxx number of requests allowed
  windowMs: 60 * 60 * 1000, // 1 hour window, that is if crossed 100 request it will prompt an error message and then user have to wait for 1 hour
  message: 'Too many requests from this IP, please try again in an hour!'
});

app.use('/api', limiter); // apply to route that start with /api

app.use(express.json()); //middleware
app.use(express.static(`${__dirname}/public`)); // to serve static file

// app.use((req, res, next) => {
//   console.log('Hello from middleware 👋🏻️');
//   next();
// });

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString(); // convert date and time to readable string
  // console.log(req.headers);
  next();
});

// 2) ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

// if any request reached this point of code that means it wasn't handled by any of the above router functions, because middleware executes line by line
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404)); // it will skip all other middleware and go directly to error handling middleware
}); // all and star for every route

app.use(globalErrorHandler); // express automatically knows it is an error handling middleware, error first middleware, first argument is error

module.exports = app;
