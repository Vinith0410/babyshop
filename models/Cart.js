const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  productId: { type: String, required: true },
  name: String,
  image: String,
  price: Number,
  discount: { type: Number, default: 0 },
  qty: { type: Number, default: 1 },
  // 👇 store available colors
  availableColors: {
    type: [String],
    default: []
  },
  // 👇 store the selected color
  selectedColor: {
    type: String,
    default: "Default"
  },
  // delivery charge for the cart item (copied from product at add-to-cart time)
  deliveryCharge: {
    type: Number,
    default: 0
  },
  subtotal: Number
});

module.exports = mongoose.model("Cart", cartSchema);
