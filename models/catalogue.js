// models/Catalogue.js
const mongoose = require("mongoose");

const catalogueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // prevent duplicate catalogue names
    trim: true
  },
  models: {
    type: [String],  // array of strings
    default: []
  }
});

module.exports = mongoose.model("Catalogue", catalogueSchema);
