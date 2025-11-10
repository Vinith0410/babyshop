const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Add to cart
router.post("/", async (req, res) => {
  try {
    const { userId, productId, name, image, price, colors , discount, qty, deliveryCharge } = req.body;

    // Check if item already exists in cart for this user
    let cartItem = await Cart.findOne({ userId, productId });
    if (cartItem) {
      // Instead of updating, send a special response
      return res.status(409).json({ message: "Already in cart" });
    }

    // If not, create new cart item
    cartItem = new Cart({
      userId,
      productId,
      name,
      image,
      price,
      discount: discount || 0,
      qty: qty || 1,
      availableColors: colors || [],
      selectedColor: colors && colors.length > 0 ? colors[0] : "Default"  // ✅ set default
    });
    // store delivery charge per item (if provided)
    if (typeof deliveryCharge !== 'undefined') {
      cartItem.deliveryCharge = parseFloat(deliveryCharge) || 0;
    }

    await cartItem.save();
    res.json({ message: "Added to cart!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error adding to cart" });
  }
});

// Get cart count for user
router.get("/count", async (req, res) => {
  try {
    const userId = req.query.user;
    const count = await Cart.countDocuments({ userId });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

router.post("/update-qty/:cartId", async (req, res) => {
  try {
    const { qty } = req.body;
    const cartId = req.params.cartId;
    const cartItem = await Cart.findById(cartId);
    if (!cartItem) return res.status(404).json({ message: "Cart item not found" });
    cartItem.qty = qty;
    cartItem.subtotal = cartItem.price * qty;
    await cartItem.save();
    res.json({ message: "Quantity updated" });
  } catch (err) {
    res.status(500).json({ message: "Error updating quantity" });
  }
});


// Get cart items with product details for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all cart items for this user
    const cartItems = await Cart.find({ userId });

    // Collect productIds from cart
    const productIds = cartItems.map(item => item.productId);

    // Find products that still exist
    const existingProducts = await Product.find({ _id: { $in: productIds } }, "_id");
    const existingProductIds = existingProducts.map(p => p._id.toString());

    // Keep only cart items where product still exists
    const validItems = cartItems.filter(item => existingProductIds.includes(item.productId.toString()));

    // Delete invalid cart items (whose product was deleted)
    const invalidIds = cartItems
      .filter(item => !existingProductIds.includes(item.productId.toString()))
      .map(item => item._id);

    if (invalidIds.length > 0) {
      await Cart.deleteMany({ _id: { $in: invalidIds } });
    }

    // Populate product details for valid cart items
    const populatedItems = await Cart.find({ _id: { $in: validItems.map(i => i._id) } })
      .populate("productId");

    res.json(populatedItems);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching cart items" });
  }
});

// Delete cart item
router.delete("/:cartId", async (req, res) => {
  try {
    const { cartId } = req.params;
    const deleted = await Cart.findByIdAndDelete(cartId);

    if (!deleted) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    res.json({ message: "Item removed from cart" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting cart item" });
  }
});

// Update selected color
router.post("/update-color/:id", async (req, res) => {
  try {
    const { selectedColor } = req.body;
    const updated = await Cart.findByIdAndUpdate(
      req.params.id,
      { selectedColor },
      { new: true }
    );
    res.json({ message: "Color updated", item: updated });
  } catch (err) {
    res.status(500).json({ message: "Error updating color" });
  }
});



module.exports = router;