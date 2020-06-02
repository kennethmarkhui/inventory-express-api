const mongoose = require('mongoose');

const ItemSchema = mongoose.Schema({
  refId: {
    type: String,
    required: true,
    unique: true,
  },
  image: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  storage: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  period: String,
  location: {
    country: {
      type: String,
      required: true,
    },
    area: {
      type: String,
    },
  },
  sizes: [{ _id: false, len: Number, wid: Number }],
  dateCreated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Item', ItemSchema);
