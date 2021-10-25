
module.exports = fn => (req, res, next) => { // this function is returned so that it can take the value of res, req, next, this will be called as soon as a new tour is created using create tour method, that's why it has the exact same signature as the below async function
    fn(req, res, next).catch(next); // next will recieve err => next(err), so it is the same as writing next, eventually it will land up in our global error handling middleware
  };
