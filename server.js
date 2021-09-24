const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');


dotenv.config({path: './config.env'});

const DB = process.env.DATABASE.replace(
  '<PASSWORD>', 
  process.env.DATABASE_PASSWORD
);

mongoose.connect(DB)
.then(() => console.log('DB connection successful')); // to connect to mongodb server, second to deal with some deperecation warnings

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
}); 