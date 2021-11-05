const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter your name!'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email!'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email!'],
  },
  photo: String,
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false, // it wwill never show in output
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // this only works on CREATE and SAVE!!!
      validator: function (el) {
        return el === this.password; // if both passwords are same then this will return true
      },
      message: 'Passwords are not the same!!',
    },
  },
  passwordChangedAt: Date,
});

userSchema.pre('save', async function (next) {
  // Only run this function was actually modified
  if (!this.isModified('password')) {
    return next();
  }

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete the password confirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  // candidatePassword is the password user entered and userPassword is password of the user at the time of signing up
  return await bcrypt.compare(candidatePassword, userPassword); // using bcrypt method, we cant use this.password because we have hid the password above by specifying select: false
}; // instance method, to check password entered is correct or not

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10 // base 10
    ); // change normal time to a time stamp format, i.e milliseconds
    // console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp; // not change meanse JWT time stamp will be less than changed time stamp
  }
  return false; // by default user has not changed his password after the token was issued
};

const User = mongoose.model('User', userSchema);

module.exports = User;
