module.exports = (err, req, res, next) => {
    // console.log(err.stack); // show us where an error happened
  
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }