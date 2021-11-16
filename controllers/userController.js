const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  // allowedFields contains all the arguements that we pass in and will create an array for the same
  // here we will loop through each object and for each element will check if it is an allowed field simply add it to the new object that we will return in the end
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    // el is element passed in
    if (allowedFields.includes(el)) {
      // el is the element
      newObj[el] = obj[el]; // adding that element in the new object
    }
  }); // object.keys to loop through the object and return an array for the same
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POST password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email'); // filter the body and things a user can update

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    // we have put x there and not (req, res, next) because we don't want to update everything, we have restricted data to role admin only
    new: true, // to return the new updated document
    runValidators: true, // to validate our documents
  }); // passing the id and the data that should be updated

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// when a user deletes his account we deactivate it not delete it, so sometime in future he can access it
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false }); // we are logged in that's why we can get the id from req.body

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! Please use /signup instead.',
  });
};

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update password with this, because it is not protected
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
