const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name, price, ratingsAverage, summary, difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' }); // path is the property which we want to populate
exports.createTour = factory.createOne(Tour);
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
