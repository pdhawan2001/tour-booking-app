const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
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
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
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

// QUERY MIDDLEWARE
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
}); // we are making reviews available on tour and not tour available on reviews, so to to avoid over populating

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // calcAverageRatings is a function
  console.log(tourId);
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour', // grouping all the tours by tour
        nRating: { $sum: 1 }, // for each document that goes through this pipeline 1 will be added, so it'll give us a total count
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  console.log(stats);

  if (stats.length > 0) {
    // we only want to update the tour and not save it somewhere
    await Tour.findByIdAndUpdate(tourId, {
      // stats is giving an array, which consists of only one object so stats[0] is used and the object contains nRating and avgRating
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// DOCUMENT MIDDLEWARE
reviewSchema.post('save', function () {
  // we are using post because in pre, the current review is not in the collection just yet
  // this points to current review
  this.constructor.calcAverageRatings(this.tour); // this is the current document and constructor is the model that created that document, tour is the tourID
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  // we have to use pre here rather than post, because after post query will already be executed and we will no longer have access to this query
  this.r = await this.findOne().clone(); // we want the current document, but now we will execute the query and it will give us the document that is currently processed
  console.log(this.r); // we created a property on this variable, so that it remains on the document and we can pass it to post middleware
  next();
}); // because behind the scenes findByIdAnd is just the short hand of findOneAnd

reviewSchema.post(/^findOneAnd/, async function () {
  // query is finished
  // await this.findOne(); does NOT work here, because query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour); // this.r is the review and then .tour is the tour Id, so the the current document is this.r, so that's why we are passing this.r instead of this
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
