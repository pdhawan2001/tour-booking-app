class AppError extends Error {
    constructor(message, statusCode) {
        super(message); // it is used to call the parent constructor i.e of the built in Error class
        
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'; // if starts with 4 eg 404, it will fail, else like 5 i.e 500 it will be an error like internal server error
        this.isOperational = true; // for operational errors, to classify errors

        Error.captureStackTrace(this, this.constructor); // this way it will not appear on stack trace and will not pollute it, the stack trace which we logged in app.js
    }
}; 

module.exports = AppError;