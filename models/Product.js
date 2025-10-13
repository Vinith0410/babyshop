const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  discount: Number,
  description: String,
  about: String,
  image: String, // Image path
  catalogues: [String] ,
  colors: {
    type: [String],
    default: [],   // if no colors, just store empty array
  },
    stockStatus: {
    type: String,
    enum: ["In Stock", "Out of Stock"],
    default: "In Stock"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);
