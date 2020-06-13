const fs = require('fs');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { check, validationResult } = require('express-validator');

const router = express.Router();

const MIME_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
};

const fileUpload = multer({
  limits: { fileSize: 2000000 }, //2MB
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/images');
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype];
      cb(null, uuidv4() + '.' + ext);
    },
  }),
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error('Invalid mime type!');
    cb(error, isValid);
  },
});

const Item = require('../models/Item');

// GET api/items
router.get('/', async (req, res, next) => {
  const page = +req.query.page || 1;
  const itemsPerPage = 2;

  let totalItems;
  try {
    totalItems = await Item.find().countDocuments();
    // console.log('Total Items:', totalItems);
  } catch (err) {
    const error = new Error('Server Error: Could not fetch items.');
    error.code = 500;
    return next(error);
  }

  let items;
  try {
    items = await Item.find()
      .collation({ locale: 'en', numericOrdering: true })
      .sort({ refId: 1 })
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);
  } catch (err) {
    const error = new Error('Server Error: Could not fetch items.');
    error.code = 500;
    return next(error);
  }
  res.json({
    items,
    pagination: {
      totalItems,
      hasNextPage: itemsPerPage * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      firstPage: 1,
      lastPage: Math.ceil(totalItems / itemsPerPage),
      currentPage: page,
    },
  });
});

// GET api/items/:id
router.get('/:id', async (req, res, next) => {
  const itemId = req.params.id;

  let item;
  try {
    item = await Item.findById(itemId);
  } catch (err) {
    const error = new Error('Server Error: Could not find item.');
    error.code = 500;
    return next(error);
  }

  if (!item) {
    const error = new Error('Could not find item for the provided ID.');
    error.code = 404;
    return next(error);
  }

  res.json(item);
});

// POST api/items
router.post(
  '/',
  fileUpload.single('image'),
  [
    check('refId', 'Reference ID should not be empty.').not().isEmpty(),
    check('name', 'Name must not be empty.').not().isEmpty(),
    check('storage', 'Storage must not be empty.').not().isEmpty(),
    check('category', 'Category must not be empty.').not().isEmpty(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      let errMsgs = [];
      errors.errors.map((err) => errMsgs.push(err.param));
      const error = new Error(
        `Invalid Input: Please check the following data: ${errMsgs.join(', ')}`
      );
      error.code = 422;
      return next(error);
    }

    const {
      refId,
      name,
      storage,
      category,
      period,
      location,
      sizes,
    } = req.body;

    let existingItem;
    try {
      existingItem = await Item.findOne({ refId });
    } catch (err) {
      const error = new Error('Server Error: Could not add item.');
      error.code = 500;
      return next(error);
    }

    if (existingItem) {
      const error = new Error(
        'The Reference ID you provided already exists in the database. Please enter a new Reference ID.'
      );
      error.code = 400;
      return next(error);
    }

    const addedItem = new Item({
      refId,
      image: req.file.path,
      // image: `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/${
      //   Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000
      // }/${Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000}`,
      name,
      storage,
      category,
      period: period || null,
      location: {
        country: JSON.parse(location).country,
        area: JSON.parse(location).area || null,
      },
      sizes: JSON.parse(sizes),
    });

    try {
      await addedItem.save();
    } catch (err) {
      const error = new Error('Server Error: Could not add item.');
      error.code = 500;
      return next(error);
    }

    res.status(201).json(addedItem);
  }
);

// PATCH api/items/:id
router.patch(
  '/:id',
  fileUpload.single('image'),
  [
    check('refId', 'Reference ID should not be empty.').not().isEmpty(),
    check('name', 'Name must not be empty.').not().isEmpty(),
    check('storage', 'Storage must not be empty.').not().isEmpty(),
    check('category', 'Category must not be empty.').not().isEmpty(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      let errMsgs = [];
      errors.errors.map((err) => errMsgs.push(err.param));
      const error = new Error(
        `Invalid Input: Please check the following data: ${errMsgs.join(', ')}`
      );
      error.code = 422;
      return next(error);
    }

    const itemId = req.params.id;
    const {
      refId,
      prevRefId,
      prevImage,
      name,
      storage,
      category,
      period,
      location,
      sizes,
    } = req.body;

    let itemToUpdate;
    try {
      itemToUpdate = await Item.findById(itemId);
    } catch (err) {
      const error = new Error('Server Error: Could not update item.');
      error.code = 500;
      return next(error);
    }

    if (!itemToUpdate) {
      const error = new Error('Could not find item for the provided ID.');
      error.code = 404;
      return next(error);
    }

    let existingItem;
    try {
      existingItem = await Item.findOne({ refId });
    } catch (err) {
      const error = new Error('Server Error: Could not check if item exist.');
      error.code = 500;
      return next(error);
    }

    if (existingItem && existingItem.refId !== prevRefId) {
      const error = new Error(
        'The Reference ID you provided already exists in the database. Please enter a new Reference ID.'
      );
      error.code = 400;
      return next(error);
    }

    itemToUpdate.refId = refId;
    itemToUpdate.name = name;
    itemToUpdate.storage = storage;
    itemToUpdate.category = category;
    itemToUpdate.period = period || null;
    itemToUpdate.location = {
      country: JSON.parse(location).country,
      area: JSON.parse(location).area || null,
    };
    itemToUpdate.sizes = JSON.parse(sizes);
    if (req.file) {
      itemToUpdate.image = req.file.path;
      fs.unlink(prevImage, (err) => {
        if (err) throw err;
        console.log(
          prevImage + ' has been deleted and replaced with ' + req.file.path
        );
      });
    }

    try {
      await itemToUpdate.save();
    } catch (err) {
      const error = new Error('Server Error: Could not update item.');
      error.code = 500;
      return next(error);
    }
    res.json(itemToUpdate);
  }
);

// DELETE api/items/:id
router.delete('/:id', async (req, res, next) => {
  const itemId = req.params.id;

  let item;
  try {
    item = await Item.findById(itemId);
  } catch (err) {
    const error = new Error('Server Error: Could not delete item.');
    error.code = 500;
    return next(error);
  }

  if (!item) {
    const error = new Error('Could not find item for the provided id.');
    error.code = 404;
    return next(error);
  }

  const imagePath = item.image;

  try {
    await item.remove();
  } catch (err) {
    const error = new Error('Server Error: Could not delete item..');
    error.code = 500;
    return next(error);
  }

  fs.unlink(imagePath, (err) => {
    if (err) throw err;
    console.log(imagePath + ' has been deleted.');
  });

  res.json({ msg: 'Item has be succesfully deleted.' });
});

module.exports = router;
