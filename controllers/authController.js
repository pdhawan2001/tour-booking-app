const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// To create a new token
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  }); // in mongoDB id is called _id, secret is a string used to create a token, a secret string

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  }); // create user with this much data, because of security reasons not with full body, as anyone can specify his role as admin here

  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; // const email = req.body.email, es6 object destructuring is used here, here password is candidatePassword

  // 1) Check if email and password already exists.
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exists && password is correct.
  const user = await User.findOne({ email }).select('+password'); // findOne because we are finding user by email not by their ID, select is used to select password but not to find document by it

  if (!user || !(await user.correctPassword(password, user.password))) {
    // password is the candidate password and user.password is the original one
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send JWT token to client.
  const token = signToken(user._id);
  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token and check if it exists.
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // value should start with bearer word and then token, so therefore bearer is mentioned here
    token = req.headers.authorization.split(' ')[1]; // we want the part after the word "Bearer" that is the token so we have split the string into an array, and then we have taken the second part which is the token itself
  }
  console.log(token);

  if (!token) {
    return next(
      new AppError('You are not loggedin! Please log in to get access.', 401)
    );
  }

  // 2) Validate the token(Verification).

  // 3) Check if user still exists.

  // 4) Check if user changed password after the token was issued.

  next();
});
