const Tour = require('../models/tourModel');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit= '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name, price, ratingsAverage, summary, difficulty';
  next();
};

exports.getAllTours = async (req, res) => {
  try {
    console.log(req.query);

    // BUILD QUERY
    // 1A) FILTERING
    const queryObj = {...req.query};  // copy of req.query obj
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 1B) ADVANCE FILTERING
    let queryString = JSON.stringify(queryObj);
    queryString = queryString.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    console.log(JSON.parse(queryString));

    let query =  Tour.find(JSON.parse(queryString));
    
    // { difficulty: 'easy', duration: { $gte: 5 }} // mongoDB practice object
    // { difficulty: 'easy', duration: { gte: '5' } } // query log
    // gte, gt, lte, lt
        
    // 2) SORTING 
    if(req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      console.log(sortBy);
      query = query.sort(sortBy);
      // sort('price ratingAverage'); // if two prices are same, they'll be sorted based on 
    } else {
      query = query.sort('-createdAt');
    }

    // 3) FIELD LIMITING 
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields); // this method of selecting certain field names is called projecting
    } else {
      query = query.select('-__v'); // it will exclude this field
    }

    // 4) PAGINATION
    const page = req.query.page * 1 || 1 ;  // * 1 to convert a string to a number // by default page 1
    const limit = req.query.limit * 1 || 100;
    const skip =  (page - 1) * limit; // formula derived from below comments

    // page=2&limit=10 // 1-10 are page 1, 11-20 are page 2, 21-30 are page 3 and so on
    query = query.skip(skip).limit(limit);

    if(req.query.page) {
      const numTours = await Tour.countDocuments(); // method which will count the documents on page, like number of tours
      if (skip >= numTours) throw new Error('This page does not exit!!'); 
    }

    // EXECUTE QUERY
    const tours = await query;
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

 // const tours = await Tour.find()
    //   .where('duration')
    //   .equals(5)
    //   .where('difficulty')
    //   .equals('easy');  // hard coded mongoose special methods

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
      message: 'Invalid data sent! 🔴️',
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
