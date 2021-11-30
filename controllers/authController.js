const crypto = require('crypto');
const { promisify } = require('util'); // requiring just promisify method from utils module
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

// To create a new token
const signToken = (
  id // payload is id, we are passsing id
) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  }); // in mongoDB id is called _id, secret is a string used to create a token, a secret string

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Sending response(token) as a cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ), //it will expire in today's date + time we set in config file(converting in milliseconds) // client/browser will delete the cookie when it has expired
    httpOnly: true, // this will make sure that cookie can not be in any way modified by the browser, this way browser will just store it and send it just like any other req, to prevent cross site scripting attacks
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true; // this will ensure that cookie will only be sent on an encrypted network like HTTPS
  }

  res.cookie('jwt', token, cookieOptions);

  // Remove the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  }); // create user with this much data, because of security reasons not with full body, as anyone can specify his role as admin here
  createSendToken(newUser, 201, res);
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
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token and check if it exists.
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // value should start with bearer word and then token, so therefore bearer is mentioned here
    token = req.headers.authorization.split(' ')[1]; // we want the part after the word "Bearer" that is the token so we have split the string into an array, and then we have taken the second part which is the token itself
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  // console.log(token);

  if (!token) {
    return next(
      new AppError('You are not loggedin! Please log in to get access.', 401)
    );
  }

  // 2) Validate the token(Verification).
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // this is basically the payload, that is the data which we are passing to the request
  // console.log(decoded);

  // 3) Check if user still exists.
  const currentUser = await User.findById(decoded.id); // user based on decoded ID, not the new user, we can be assured that the ID is correct, because if we have made it till this step here after verification, then the id ought to be correct.
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token does not exist.', 401)
    );
  }

  // 4) Check if user changed password after the token was issued.
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    // iat: issued at
    return next(
      new AppError('User recently changed password! Please log in again', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser; // put entire user data on the request, that is grant him access
  next();
});

// Only for rendered pages, no errorr
exports.isLoggedIn = async (req, res, next) => {
  // for rendered pages we will not have the authorization in header therefore it must come from cookies
  if (req.cookies.jwt) {
    try {
      // 1) Validate the token(Verification).
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      ); // this is basically the payload, that is the data which we are passing to the request
      // console.log(decoded);

      // 2) Check if user still exists.
      const currentUser = await User.findById(decoded.id); // user based on decoded ID, not the new user, we can be assured that the ID is correct, because if we have made it till this step here after verification, then the id ought to be correct.
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued.
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        // iat: issued at
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser; // our pug temmplate will get access to it
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // this function will get access to the roles parameter above
    // roles is an array ['admin', 'lead-guide]. role='user' will not have permission
    if (!roles.includes(req.user.role)) {
      // if the roles does not include lead-guide or admin
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  }; // a wrapper function which will return the middleware function

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email }); /// because we don't know user's id and user also don't know his id
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // deactivate all validators that we set in our schema

  // 3) Send it back as an email
  // below basically the URL structure is recreated
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`; // user will click on this email will be able to request from there to change password, req.get('host') so that it can handle both production and development

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email`;

  try {
    await sendEmail({
      email: user.email, // or req.body.email
      subject: 'Your password reset token (valid for 10 mins)',
      message,
    });
  } catch (err) {
    // because if there is an error we want to reset the token and expires property, and just not send the error itself
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false }); // this is because above property just modifies the data and does not saves it

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'Token sent to email!',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex'); // token is a parameter as we have specified it in user Routes

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is a user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or expired!', 400));
  }

  // setting new password and password confirm
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  // deleting password reset token and token expires
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // it only modifies the document, so we have to save it
  await user.save(); // we have to validate in this case so we are not turning off the validators

  // 3) Update changedPasswordAt property for the user
  // done in userModel

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

// for the user and password related stuff we always use save and not findOneAndUpdate and all because we have to run all the validations before saving it

// for logged in users to update password
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get the user from the collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if posted password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as it will skip all the validators!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
