const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

const Item = require('../models/Item');

// GET api/items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ refId: 1 });
    res.json(items);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
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
    const { refId, name, storage, category, period, country, area } = req.body;
    try {
      let item = await Item.findOne({ refId });
      if (item) {
        return res.status(400).json({
          msg:
            'The Ref ID you provided already exists in the database. Please enter a new Ref ID.',
        });
      }

      item = new Item({
        refId,
        image: 'https://via.placeholder.com/600/',
        name,
        storage,
        category,
        period: period || null,
        location: { country: country, area: area || null },
        sizes: [
          { len: 1, wid: 2 },
          { len: 3, wid: 4 },
        ],
      });

      await item.save();
      res.send('Item added!');
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server Error');
    }
  }
);

// PUT api/items/:id
router.put('/:id', (req, res) => {
  res.send('update item');
});

// DELETE api/items/:id
router.delete('/:id', (req, res) => {
  res.send('delete item');
});

module.exports = router;
