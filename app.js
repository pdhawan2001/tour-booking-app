const express = require('express');
const morgan = require('morgan');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

// 1) MIDDLEWARES 
if(process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(express.json()); //middleware
app.use(express.static(`${__dirname}/public`)); // to serve static file 

// app.use((req, res, next) => {
//   console.log('Hello from middleware 👋🏻️');
//   next();
// });

// app.use((req, res, next) => {
//   req.requestTime = new Date().toISOString(); // convert date and time to readable string
//   next();
// });

// 2) ROUTES 

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

// if any request reached this point of code that means it wasn't handled by any of the above router functions, because middleware executes line by line
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`  // req.originalUrl gives the URL that was requested
  });
}); // all and star for every route

module.exports = app;