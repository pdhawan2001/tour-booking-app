const mongoose = require('mongoose');

const tourSchema = new mongoose.Schema({
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true, // if false, error is specified
    },
    rating: {
      type: Number,
      default: 4.5,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
  }); // this is schema
  
  const Tour = mongoose.model('Tour', tourSchema); // this is a model

  module.exports = Tour;