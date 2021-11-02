const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  }); // create user with this much data, because of security reasons not with full body, as anyone can specify his role as admin here

  // To create a new token
  const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  }); // in mongoDB id is called _id, secret is a string used to create a token, a secret string

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser,
    },
  });
});
