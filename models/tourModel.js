const mongoose = require('mongoose');

const tourSchema = new mongoose.Schema({
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true, // if false, error is specified
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have difficulty'],
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
    },
    ratingsQuantity: {
      type: Number, 
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number
    },
    summary: {
      type: String,
      trim: true, // remove white space at beginning and end
      required: [true, 'A tour must have a description']
    }, 
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    }, 
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false // we hid this field directly from the schema, we do this for fields like password
    }, 
    startDates: [Date],
         
  }, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }); // this is schema, // first is schema definiton and second is object with options

  tourSchema.virtual('durationWeeks').get(function() {
    return this.duration /7;
  });  // virtual properties are those which are not needed to be saved on database and involves simple tasks // this will be created each time we get something from db
  // we cannot use virtual prop in query like tour.find where durationWeek = 1, because it is not a part of db

  const Tour = mongoose.model('Tour', tourSchema); // this is a model

  module.exports = Tour; 