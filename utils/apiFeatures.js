class APIFeatures {
    constructor(query, queryString) {
      this.query = query; // the mongoose query
      this.queryString = queryString; // queryString coming from route
    } // constructor automatically gets called when we create an new object out of a class
  
    filter() {
      // 1A) FILTERING
      const queryObj = { ...this.queryString }; // copy of req.query obj
      const excludedFields = ['page', 'sort', 'limit', 'fields'];
      excludedFields.forEach((el) => delete queryObj[el]);
  
      // 1B) ADVANCE FILTERING
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // replacing with $match, first dollar for syntax, second for replacing, \b is added to replace multiple times
      // console.log(JSON.parse(queryStr));
  
      this.query = this.query.find(JSON.parse(queryStr));
      return this; // this is the entire object
    }
  
    sort() {
      if (this.queryString.sort) {
        console.log(this.queryString.sort);
        const sortBy = this.queryString.sort.split(',').join(' ');
        console.log(sortBy);
        this.query = this.query.sort(sortBy);
        // sort('price ratingAverage'); // if two prices are same, they'll be sorted based on
      } else {
        this.query = this.query.sort('-createdAt');
      }
      return this;
    }
  
    limitFields() {
      if (this.queryString.fields) {
        const fields = this.queryString.fields.split(',').join(' ');
        this.query = this.query.select(fields); // this method of selecting certain field names is called projecting
      } else {
        this.query = this.query.select('-__v'); // it will exclude this field
      }
      return this;
    }
  
    paginate() {
      const page = this.queryString.page * 1 || 1; // * 1 to convert a string to a number // by default page 1
      const limit = this.queryString.limit * 1 || 100;
      const skip = (page - 1) * limit; // formula derived from below comments
  
      // page=2&limit=10 // 1-10 are page 1, 11-20 are page 2, 21-30 are page 3 and so on
      this.query = this.query.skip(skip).limit(limit);
  
      // if (req.query.page) {
      //   const numTours = await Tour.countDocuments(); // method which will count the documents on page, like number of tours
      //   if (skip >= numTours) throw new Error('This page does not exit!!');
      // }   // error if no results commented for practice
  
      return this;
    }
  }

  module.exports = APIFeatures;