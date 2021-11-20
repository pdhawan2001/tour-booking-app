const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true, // if false, error is specified
      trim: true,
      maxlength: [
        40,
        'A tour name must have less or equal than 40 characters.',
      ], // this is a validator
      minlength: [
        10,
        'A tour name must have more or equal than 10 characters.',
      ],
      // validate: [validator.isAlpha, 'Tour name must only contain characters']  // custom validator using validator package
    },
    slug: String,
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
      enum: {
        values: ['easy', 'medium', 'difficult'], // values must be chosen from these values
        message: 'Difficulty is either: easy, medium, or difficult.',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above or equal to 1.0'],
      max: [5, 'Rating must be below or equal to 5.0'],
      set: (val) => Math.round(val * 10) / 10, // it is run each time a new value is set, multiplication and division by 10 is done so that it doesn't round the rating to integer
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this only points to current doc on NEW document creation
          return val < this.price; // 100 < 200
        },
        message: 'Discount price ({VALUE}) should be below the regular price', // works only for mongoose
      },
    },
    summary: {
      type: String,
      trim: true, // remove white space at beginning and end.
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, // we hid this field directly from the schema, we do this for fields like password
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON, to specify this object as GeoJSON object we need types and properties
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'], // only option we are specifying is 'point'
      },
      coordinates: [Number], // we expect an array of numbers with latitude first and longitude
      address: String,
      description: String,
    },
    locations: [
      // embedded documents, we have to use array for that, it will create a new document inside the tour document by specifying as array
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number, // day of the tour on which people will go at this location
      },
    ],
    guides: [
      // this means there will be subdocuments means embedded documents
      {
        type: mongoose.Schema.ObjectId, // we expect the type to mongoDb ID
        ref: 'User', // this will reference it with user, this also doesn't require importing User model
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
); // this is schema, // first is schema definiton and second is object with options

// we are indexing price and ratingsAverage here, because most user will sort by these only
tourSchema.index({ price: 1, ratingsAverage: -1 }); // 1 stands for sorting in asc, -1 for desc
tourSchema.index({ slug: 1 }); // unique slug to query for tours, may become the most query field
tourSchema.index({ startLocation: '2dsphere' }); // we need an index for geospatial queries, A 2dsphere index supports queries that calculate geometries on an earth-like sphere

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
}); // virtual properties are those which are not needed to be saved on database and involves simple tasks // this will be created each time we get something from db
// we cannot use virtual prop in query like tour.find where durationWeek = 1, because it is not a part of db

// Virtual  Populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // this is the name of the field in the other model (review model), where the reference to current model is stored, so it is tour, because in review model we have a field called tour, here tour id is stored
  localField: '_id', // Id is stored as _id in current tour model, _id is called tour in the foreign model(review model)
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create() // but not on .insertMany() or update etc
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true }); // this will point towards currently processed document
  next(); // just like express middleware, mongoose model also require next
});

// tourSchema.pre('save', async function (next) {
//   // guidesPromises because we have marked findById function as async await and it will return a promise
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id)); // this will loop through the guides which we specify while creating a new tour and then it will retrieve users from it
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function(next) {
//   console.log('Will save document...');
//   next();
// })
// tourSchema.post('save', function(doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE
// tourSchema.pre('find', function(next) { // find hook is query middleware and will point towards current query // not for findOne
tourSchema.pre(/^find/, function (next) {
  // regex so every command starting with find will be executed
  this.find({ secretTour: { $ne: true } }); // here this is a query object
  this.start = Date.now(); // this will set the current time in milliseconds // will give us the time from start of query
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt', // it will not show these fields in the query, because of - sign
  }); // it will fill up the field guides in our model which is refrenced, it will look like embedding but it is actually refrenced, it will fill it up only in the query and not in the actual database, using populate will still actually create a new queery and it can impact performance
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`); // will get the query time by subtracting from the current time
  // console.log(docs);
  next();
});

// AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); // here we are adding another field in the aggregation pipeline
//   console.log(this.pipeline()); // this will point towards current aggregation
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema); // this is a model

module.exports = Tour;
