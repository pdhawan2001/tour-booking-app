const crypto = require('crypto');
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
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'], // only allow certain types of strings etc.
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false, // it will never show in output
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
  passwordResetToken: String,
  passwordResetExpires: Date, // token will expire after a certain time as a security measure
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
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

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) {
    return next();
  }

  this.passwordChangedAt = Date.now() - 1000; // this is because saving in DB takes time so we are subtracting one second so that user is able to login with new token, so that the token is always created after the password has been changed
  next();
});

userSchema.pre(/^find/, function (next) {
  // this regex will find the "find" keyword
  // this is query middleware, so it points to current query
  this.find({ active: { $ne: false } }); // this will find documents which are active
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
    ); // change normal time to a time stamp format,  milliseconds for /1000 // parseInt to get it into integer format, so at the end both JWTTimeStamp and Change password time stam have same format
    // console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp; // not change means JWT time stamp will be less than changed time stamp, as password will only be changed after logging in
  }
  return false; // by default user has not changed his password after the token was issued
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); // this token will be sent to user, so that user can create a new password, it will create random bytes of 32 digits
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex'); // converting in hash using sha256 algo, SHA-256 is a patented cryptographic hash function that outputs a value that is 256 bits long.

  console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // i.e password will expire after 600000 milliseconds

  return resetToken; // return plain text token because this is the one which we'll be sending through email, i.e unencrypted
};

const User = mongoose.model('User', userSchema);

module.exports = User;
