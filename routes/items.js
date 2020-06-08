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
      cb(null, 'images/items');
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
router.get('/', async (req, res) => {
  let items;
  try {
    items = await Item.find()
      .collation({ locale: 'en', numericOrdering: true })
      .sort({ refId: 1 });
  } catch (error) {
    return res
      .status(500)
      .json({ msg: 'Server Error: Could not fetch items.' });
  }
  res.json(items);
});

// GET api/items/:id
router.get('/:id', async (req, res) => {
  const itemId = req.params.id;

  let item;
  try {
    item = await Item.findById(itemId);
  } catch (error) {
    return res.status(500).json({ msg: 'Server Error: Could not find item.' });
  }

  if (!item) {
    return res
      .status(404)
      .json({ msg: 'Could not find item for the provided ID.' });
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
  async (req, res) => {
    // console.log(req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          console.log(err);
        });
      }
      let errMsgs = [];
      errors.errors.map((err) => errMsgs.push(err.param));
      return res.status(422).json({
        msg: `Invalid Input: Please check the following data: ${errMsgs.join(
          ', '
        )}`,
      });
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
    } catch (error) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          console.log(err);
        });
      }
      return res.status(500).json({ msg: 'Server Error: Could not add item.' });
    }

    if (existingItem) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          console.log(err);
        });
      }
      return res.status(400).json({
        msg:
          'The Reference ID you provided already exists in the database. Please enter a new Reference ID.',
      });
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
    } catch (error) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          console.log(err);
        });
      }
      return res.status(500).json({ msg: 'Server Error: Could not add item.' });
    }

    res.status(201).json(addedItem);
  }
);

// PATCH api/items/:id
router.patch(
  '/:id',
  [
    check('refId', 'Reference ID should not be empty.').not().isEmpty(),
    check('name', 'Name must not be empty.').not().isEmpty(),
    check('storage', 'Storage must not be empty.').not().isEmpty(),
    check('category', 'Category must not be empty.').not().isEmpty(),
    check('location.country', 'Please provide a country.').not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      let errMsgs = [];
      errors.errors.map((err) => errMsgs.push(err.param));
      return res.status(422).json({
        msg: `Invalid Input: Please check the following data: ${errMsgs.join(
          ', '
        )}`,
      });
    }

    const itemId = req.params.id;
    const {
      refId,
      prevRefId,
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
    } catch (error) {
      return res
        .status(500)
        .json({ msg: 'Server Error: Could not update item.' });
    }

    if (!itemToUpdate) {
      return res
        .status(404)
        .json({ msg: 'Could not find item for the provided ID.' });
    }

    let existingItem;
    try {
      existingItem = await Item.findOne({ refId });
    } catch (error) {
      return res
        .status(500)
        .json({ msg: 'Server Error: Could not check if item exist.' });
    }

    if (existingItem && existingItem.refId !== prevRefId) {
      return res.status(400).json({
        msg:
          'The Reference ID you provided already exists in the database. Please enter a new Reference ID.',
      });
    }

    itemToUpdate.refId = refId;
    itemToUpdate.name = name;
    itemToUpdate.storage = storage;
    itemToUpdate.category = category;
    itemToUpdate.period = period;
    itemToUpdate.location = location;
    itemToUpdate.sizes = sizes;

    try {
      await itemToUpdate.save();
    } catch (error) {
      return res
        .status(500)
        .json({ msg: 'Server Error: Could not update item.' });
    }

    res.json(itemToUpdate);
  }
);

// DELETE api/items/:id
router.delete('/:id', async (req, res) => {
  const itemId = req.params.id;

  let item;
  try {
    item = await Item.findById(itemId);
  } catch (error) {
    return res
      .status(500)
      .json({ msg: 'Server Error: Could not delete item.' });
  }

  if (!item) {
    return res
      .status(404)
      .json({ msg: 'Could not find item for the provided id.' });
  }

  const imagePath = item.image;

  try {
    await item.remove();
  } catch (error) {
    return res
      .status(500)
      .json({ msg: 'Server Error: Could not delete item.' });
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.json({ msg: 'Item has be succesfully deleted.' });
});

module.exports = router;
