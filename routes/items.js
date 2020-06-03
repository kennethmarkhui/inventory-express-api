const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

const Item = require('../models/Item');

// GET api/items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find()
      .collation({ locale: 'en', numericOrdering: true })
      .sort({ refId: 1 });
    res.json(items);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: 'Server Error: Could not fetch item.' });
  }
});

// POST api/items
router.post(
  '/',
  [
    check('refId', 'Ref ID should not be empty.').not().isEmpty(),
    check('name', 'Name must not be empty.').not().isEmpty(),
    check('storage', 'Storage must not be empty.').not().isEmpty(),
    check('category', 'Category must not be empty.').not().isEmpty(),
    check('country', 'Please provide a country.').not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const {
      refId,
      name,
      storage,
      category,
      period,
      country,
      area,
      size1L,
      size1W,
      size2L,
      size2W,
    } = req.body;
    try {
      let addedItem = await Item.findOne({ refId });
      if (addedItem) {
        return res.status(400).json({
          msg:
            'The Ref ID you provided already exists in the database. Please enter a new Ref ID.',
        });
      }

      addedItem = new Item({
        refId,
        image: 'https://via.placeholder.com/600/',
        name,
        storage,
        category,
        period: period || null,
        location: { country: country, area: area || null },
        sizes: [
          { len: size1L, wid: size1W },
          { len: size2L, wid: size2W },
        ],
      });

      const item = await addedItem.save();
      res.status(201).json(item);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ msg: 'Server Error: Could not add item.' });
    }
  }
);

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
    res.status(500).json({ msg: 'Server Error: Could not delete item.' });
  }

  if (!item) {
    res.status(404).json({ msg: 'Could not find item for the provided id.' });
  }

  try {
    await item.remove();
  } catch (error) {
    res.status(500).json({ msg: 'Server Error: Could not delete item.' });
  }

  res.status(200).json({ msg: 'Item has be succesfully deleted.' });
});

module.exports = router;
