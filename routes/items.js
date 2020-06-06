const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

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

// POST api/items
router.post(
  '/',
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
      return res.status(500).json({ msg: 'Server Error: Could not add item.' });
    }

    if (existingItem) {
      return res.status(400).json({
        msg:
          'The Reference ID you provided already exists in the database. Please enter a new Reference ID.',
      });
    }

    const addedItem = new Item({
      refId,
      image: `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/${
        Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000
      }/${Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000}`,
      name,
      storage,
      category,
      period: period || null,
      location: { country: location.country, area: location.area || null },
      sizes,
    });

    try {
      await addedItem.save();
    } catch (error) {
      return res.status(500).json({ msg: 'Server Error: Could not add item.' });
    }

    res.status(201).json(addedItem);
  }
);

// GET api/items/:refId
router.get('/:refId', async (req, res) => {
  const itemRefId = req.params.refId;

  let item;
  try {
    item = await Item.findOne({ refId: itemRefId });
  } catch (error) {
    return res.status(500).json({ msg: 'Server Error: Could not find item.' });
  }

  if (!item) {
    return res
      .status(404)
      .json({ msg: 'Could not find item for the provided refId.' });
  }

  res.json(item);
});

// PATCH api/items/:id
router.patch('/:id', (req, res) => {
  res.send('update item');
});

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

  try {
    await item.remove();
  } catch (error) {
    return res
      .status(500)
      .json({ msg: 'Server Error: Could not delete item.' });
  }

  res.status(200).json({ msg: 'Item has be succesfully deleted.' });
});

module.exports = router;
