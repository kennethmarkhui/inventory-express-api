const fs = require('fs');
const express = require('express');
const path = require('path');

const connectDB = require('./config/db');
const multer = require('multer');

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(express.json({ extended: false }));

app.use('/uploads/images', express.static(path.join('uploads', 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  next();
});

// Routes
app.use('/api/items', require('./routes/items'));

app.use((req, res) => {
  const error = new Error('Could not find this route.');
  error.code = 404;
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      if (err) throw err;
      console.log('Something went wrong. ' + req.file.path + ' was not saved.');
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE' && error.field === 'image') {
      error.code = 500;
      error.message =
        error.field + ' ' + error.message + '. Maximum upload file size: 2MB';
    }
  }
  res
    .status(error.code || 500)
    .json({ msg: error.message || 'An unknown error occured.' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
