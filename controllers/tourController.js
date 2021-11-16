const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name, price, ratingsAverage, summary, difficulty';
  next();
};

exports.getAllTours = catchAsync(async (req, res, next) => {
  //     console.log(req.query);
  // EXECUTE QUERY
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const tours = await features.query;
  // query.sort().select().skip().limit() // query  chaining

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id).populate('reviews');
  // Tour.findOne({_ _id: req.params.id })

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
});

exports.createTour =  factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }, // select documents
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' }, // group it by something // toUpper to show that in upper case
        numTours: { $sum: 1 }, // for each document that goes through this pipeline 1 will be added, so it'll give us a total count
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      }, // way mongodb works $ sign within quotes
    },
    {
      $sort: { avgPrice: 1 }, // sort by names used above // 1 for asc
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } } // we can repeat stages // $ne=not equal
    // }
  ]); // manipulate data in steps, we have to pass an array of stages

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', // deconstruct array field from each document, this means it will create one document for each date
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01 `),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numToursStarts: { $sum: 1 },
        tours: { $push: '$name' }, // to create array to display tour name
      },
    },
    {
      $addFields: { month: '$_id' }, // to add a field referencing another
    },
    {
      $project: {
        // to show field or not
        _id: 0, // to not display it
      },
    },
    {
      $sort: { numToursStarts: 1 },
    },
    {
      $limit: 12, // to display only 6 outputs
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});
