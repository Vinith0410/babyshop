const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  userId: String,  // user's email
  userName: String,
  userEmail: String,
  addresses: [{
    fullname: String,
    email: String,
    mobile: String,
    address: String,
    building: String,
    city: String,
    state: String,
    pincode: String,
    isDefault: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
});

module.exports = mongoose.model("Address", addressSchema);