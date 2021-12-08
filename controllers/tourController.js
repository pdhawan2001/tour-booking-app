const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

const multerStorage = multer.memoryStorage(); // this way image will be stored as buffer

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true); // no error
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]); // this will produce req.files

// upload,single('image'); // this will produce req.file
// upload.array('images', 5) // this will produce req.files

exports.resizeTourImages = async (req, res, next) => {
  console.log(req.files);

  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer) //check console.log for imageCover[0]
    .resize(2000, 1333) // 3:2 ratio
    .toFormat('jpeg')
    .jpeg({ quality: 90 }) // to compress it, so it doesn't take up too much space
    .toFile(`public/img/tours/${req.body.imageCover}`); // writing image to file

  // 2) Images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      // i is index here
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer) //check console.log for imageCover[0]
        .resize(2000, 1333) // 3:2 ratio
        .toFormat('jpeg')
        .jpeg({ quality: 90 }) // to compress it, so it doesn't take up too much space
        .toFile(`public/img/tours/${filename}`); // writing image to file

      req.body.images.push(filename);
    })
  );

  // console.log(req.body);
  next();
};

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

// '/tours-within/:distance/center/:latlng/unit/:unit'
// /tours-within/233/center/ 25.152248,75.855359/unit/km
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params; // we have specified these params in the URL that's why req.params
  const [lat, lng] = latlng.split(','); // we are spliting the string and it will create an array of two elements longitude and latitude

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // we are dividing the distance by radius of earth in miles and km to basically convert it into radians

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat, lng.',
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }, // in geoJSON we have to define longitude first and then latitude, mongoDb expects radius in a special unit called radians
  }); // we are querying for startLocation, because startLocation is the field where each tour starts, centerSphere takes an array of coordinates and a radius

  res.status(200).json({
    status: 'success',
    resuls: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params; // we have specified these params in the URL that's why req.params
  const [lat, lng] = latlng.split(','); // we are spliting the string and it will create an array of two elements longitude and latitude

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat, lng.',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        // it is the only geoSpatial pipeline stage that actually exists, and IT ALWAYS COMES FIRST, NEED TO BE THE FIRST ONE IN THE PIPELINE, and it requires ONE OF OUR FIELD TO CONTAIN GEOSPATIAL INDEX
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1], // multiplied by 1 to convert in numbers
        }, // it is the point from which to calculate the distances, each distance will be calculated from this point and start locations of each tour
        distanceField: 'distance',
        distanceMultiplier: multiplier, // this will convert it into km
      },
    },
    {
      $project: {
        // only show this fields in output
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
