const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name, price, ratingsAverage, summary, difficulty';
  next();
};

exports.getAllTours = async (req, res) => {
  try {
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
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.getTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id); // shorthand for findById
    // Tour.findOne({_ _id: req.params.id })
    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.createTour = async (req, res) => {
  try {
    const newTour = await Tour.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // to return a new document
      runValidators: true, // validate if it is updated
    });

    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id, req.body);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.getTourStats = async (req, res) => {
  try {
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
          maxPrice: { $max: '$price' }
         }, // way mongodb works $ sign within quotes
      },
      {
        $sort: { avgPrice: 1 } // sort by names used above // 1 for asc
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
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.getMonthlyPlan = async (req, res) => {
  try {
    const year = req.params.year * 1; // 2021
    const plan = await Tour.aggregate([
      {
        $unwind: '$startDates', // deconstruct array field from each document, this means it will create one document for each date
      },
      {
        $match: {
          startDates: { 
            $gte: new Date(`${year}-01-01 `),
            $lte: new Date(`${year}-12-31`)
           }
        }
      },
      {
        $group: {
          _id: { $month : '$startDates'},
          numToursStarts: { $sum: 1 },
          tours: { $push: '$name' }, // to create array to display tour name      
        }
      },
      {
        $addFields: { month: '$_id' } // to add a field referencing another
      },
      {
        $project: { // to show field or not
          _id: 0 // to not display it
        }
      },
      {
        $sort: { numToursStarts: 1 }
      },
      {
        $limit: 12 // to display only 6 outputs
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        plan,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};