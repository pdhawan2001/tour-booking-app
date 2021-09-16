const fs = require('fs');
const express = require('express');
const morgan = require('morgan');

const app = express();

// 1) MIDDLEWARES
app.use(morgan('dev'));
app.use(express.json()); //middleware

app.use((req, res, next) => {
  console.log('Hello from middleware 👋🏻️');
  next();
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString(); // convert date and time to readable string
  next();
});

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`)
);

// 2) ROUTE HANDLERS

  // 2.1) TOUR HANDLERS
const getAllTours = (req, res) => {
  console.log(req.requestTime);
  res.status(200).json({
    status: 'success',
    requestedAt: req.requestTime,
    results: tours.length,
    data: {
      tours,
    },
  });
};

const getTour = (req, res) => {
  console.log(req.params);
  const id = req.params.id * 1; // convert string to a number
  const tour = tours.find(el => el.id === id);

  // if(id>tours.length) {
  if(!tour){
    return res.status(404).json({
      status: 'fail',
      message: 'invalid ID',
    })
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
};

const createTour = (req, res) => {
  // console.log(req.body);
  const newId = tours[tours.length - 1].id + 1;
  const newTour = { id: newId, ...req.body }; // create new object by merging two object together

  tours.push(newTour);
  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    (err) => {
      res.status(201).json({
        status: 'success',
        data: {
          tour: newTour,
        },
      });
    }
  );
};

const updateTour = (req, res) => {

  if(req.params.id*1>tours.length){
    return res.status(404).json({
      status: 'fail',
      message: 'invalid ID',
    })
  }
  res.status(200).json({
    status: 'success',
    data: {
      tour: '<Updated tour here...'
    }
  });
};

const deleteTour = (req,res) => {
  if(req.params.id*1>tours.length){
    return res.status(404).json({
      status: 'fail',
      message: 'invalid ID',
    })
  }
  res.status(204).json({
    status: 'success',
    data: null
  });
};

  // 2.2) USER HANDLERS

const getAllUsers = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined'
  });
}

const getUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined'
  });
}

const createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined'
  });
}

const updateUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined'
  });
}

const deleteUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined'
  });
}

// 3) ROUTES

  // 3.1) TOUR ROUTES
app
  .route('/api/v1/tours')
  .get(getAllTours)
  .post(createTour);

app
  .route('/api/v1/tours/:id')
  .get(getTour)
  .patch(updateTour)
  .delete(deleteTour);

  // 3.2) USER ROUTES
app
  .route('/api/v1/users')
  .get(getAllUsers)
  .post(createUser);

app 
  .route('/api/v1/users/:id')
  .get(getUser)
  .patch(updateUser)
  .delete(deleteUser);

// 4) START SERVER
const port = 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
