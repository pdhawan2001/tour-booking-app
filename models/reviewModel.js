const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
      trim: true,
      maxlength: [150, 'A review must have less or equal than 150 characters.'],
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be above or equal to 1.0'],
      max: [5, 'Rating must be below or equal to 5.0'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tours: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    users: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  { 
    toJSON: { virtuals: true },
    toObject: { virtuals: true }, // we want virtual properties to show up whenever there is an output
  }
);

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
