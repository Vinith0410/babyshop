const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Product = require("../models/Product");
const Catalogue = require("../models/catalogue");

const router = express.Router();


// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

/* ------------------------------------------------
   PRODUCT ROUTES
------------------------------------------------ */

// Add Product Page
router.get("/admin/add-product", (req, res) => {
    if (!req.session.user || req.session.user.email !== "admin123@gmail.com") {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "../public/admin/add-product.html"));
});

// Serve addcatalogues.html
router.get("/admin/add-catalogues", (req, res) => {
    if (!req.session.user || req.session.user.email !== "admin123@gmail.com") {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "../public/admin/addcatalogue.html"));
});
router.get("/admin/edit-catalogues", (req, res) => {
    if (!req.session.user || req.session.user.email !== "admin123@gmail.com") {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "../public/admin/catalogues-list.html"));
});

// Add Product
router.post("/admin/add-product", upload.single("image"), async (req, res) => {
  try {
    const { name, price: priceRaw, mrp: mrpRaw, discount: discountRaw, description, about, stockStatus } = req.body;
    const price = parseFloat(priceRaw) || 0;
    const mrp = parseFloat(mrpRaw) || 0;
    // compute discount from mrp and sale price if mrp provided
    const discount = mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : (parseFloat(discountRaw) || 0);

    // Handle catalogues
    let catalogues = req.body["catalogues[]"] || req.body.catalogues;
    if (!Array.isArray(catalogues)) {
      catalogues = catalogues ? [catalogues] : [];
    }
    catalogues = catalogues.map(c => c.trim());

    // Handle colors
    let colors = req.body["colors[]"] || req.body.colors;
    if (!Array.isArray(colors)) {
      colors = colors ? [colors] : [];
    }
    colors = colors.map(c => c.trim());

  // Handle image
  const image = req.file ? `/uploads/${req.file.filename}` : "";

    const newProduct = new Product({
      image,
      name,
      price,
      mrp,
      discount,
      description,
      about,
      catalogues,
      colors,   // <-- new field
      stockStatus,
    });

    await newProduct.save();

    res.send(`
      <script>
        alert("Product added successfully!");
        window.location.href = "/admin/view-product";
      </script>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding product.");
  }
});


// Get all products (JSON)
router.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).send("Error fetching products");
  }
});

// View Product Page
router.get("/admin/view-product", (req, res) => {
    if (!req.session.user || req.session.user.email !== "admin123@gmail.com") {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "../public/admin/view-product.html"));
});

// Edit Product Page
router.get("/admin/edit-product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.render("edit-product", { product });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});

// Update Product
router.post("/admin/edit-product/:id", upload.single("image"), async (req, res) => {
  try {
  const { name, price: priceRaw, mrp: mrpRaw, discount: discountRaw, description, catalogues,about,stockStatus  } = req.body;
  const colors = req.body["colors[]"] || req.body.colors || [];

  const price = parseFloat(priceRaw) || 0;
  const mrp = parseFloat(mrpRaw) || 0;
  const discount = mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : (parseFloat(discountRaw) || 0);

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found");

    let imagePath = product.image;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
      const oldImagePath = path.join(__dirname, "../public", product.image);
      if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
    }

    // Update product fields
  product.name = name;
  product.price = price;
  product.mrp = mrp;
  product.discount = discount;
    product.description = description;
    product.about = about;
    product.catalogues = catalogues;
    product.colors = Array.isArray(colors) ? colors.filter(c => c.trim() !== "") : [colors];
    product.image = imagePath;
    product.stockStatus = stockStatus || "In Stock";

    await product.save();

    // 🔥 Sync changes to Cart items
    const Cart = require("../models/Cart"); // import Cart model here

    await Cart.updateMany(
      { productId: product._id },
      {
        $set: {
          name: product.name,
          price: product.price,
          discount: product.discount,
          image: product.image,
          availableColors: product.colors
        }
      }
    );

    res.send(`
      <script>
        alert("Product updated successfully!");
        window.location.href = "/admin/view-product";
      </script>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating product");
  }
});


// Get single product JSON
router.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found");
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching product");
  }
});

// Delete product
router.get("/admin/delete-product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found");

    const imagePath = path.join(__dirname, "../public", product.image);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    await Product.deleteOne({ _id: req.params.id });

    res.send(`
      <script>
        alert("Product deleted successfully!");
        window.location.href = "/admin/view-product";
      </script>
    `);
  } catch (err) {
    res.status(500).send("Error deleting product");
  }
});

// API: Get existing catalogues for dropdown
router.get("/api/catalogues", async (req, res) => {
  try {
    const catalogues = await Catalogue.find();
    res.json(catalogues);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch catalogues" });
  }
});

// API: Add new catalogue or add model to existing one
router.post("/admin/add-catalogues", async (req, res) => {
  const { existingCatalogue, newCatalogue, modelName } = req.body;

  try {
    let catalogueName = newCatalogue && newCatalogue.trim() !== ""
                        ? newCatalogue
                        : existingCatalogue;

    if (!catalogueName) {
      return res.status(400).send("Please select or enter a catalogue name");
    }

    let catalogue = await Catalogue.findOne({ name: catalogueName });

    if (!catalogue) {
      // create new catalogue
      catalogue = new Catalogue({ name: catalogueName, models: [modelName] });
    } else {
      // add new model to existing catalogue
      if (!catalogue.models.includes(modelName)) {
        catalogue.models.push(modelName);
      }
    }

  await catalogue.save();
  res.redirect("/admin/add-catalogues?success=1");


  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving catalogue");
  }
});

// Remove a model from a catalogue
// Remove a model OR a whole catalogue and update products
router.post("/admin/remove-catalogue-model", async (req, res) => {
  const { catalogueName, modelName } = req.body;

  try {
    // 1. Find the catalogue
    const catalogue = await Catalogue.findOne({ name: catalogueName });
    if (!catalogue) return res.status(404).json({ error: "Catalogue not found" });

    if (modelName) {
      // -------------------------------
      // Case 1: Remove only one model
      // -------------------------------
      catalogue.models = catalogue.models.filter(m => m !== modelName);
      await catalogue.save();

      const key = `${catalogueName} - ${modelName}`;
      await Product.updateMany(
        { catalogues: key },
        { $pull: { catalogues: key } }
      );

      return res.json({ success: true, message: `Model '${modelName}' removed from catalogue and products updated` });
    } else {
      // -------------------------------
      // Case 2: Remove the whole catalogue
      // -------------------------------
      await Catalogue.deleteOne({ name: catalogueName });

      // build all possible "Catalogue - Model" keys
      const keys = catalogue.models.map(m => `${catalogueName} - ${m}`);

      await Product.updateMany(
        { catalogues: { $in: keys } },
        { $pull: { catalogues: { $in: keys } } }
      );

      return res.json({ success: true, message: `Catalogue '${catalogueName}' and all its models removed from products` });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove model/catalogue" });
  }
});

// Edit catalogue name
router.post("/admin/edit-catalogue", async (req, res) => {
  const { oldName, newName } = req.body;

  try {
    const catalogue = await Catalogue.findOne({ name: oldName });
    if (!catalogue) return res.status(404).send("Catalogue not found");

    catalogue.name = newName;
    await catalogue.save();

    // Update all products with old catalogue
    const keys = catalogue.models.map(m => `${oldName} - ${m}`);
    const newKeys = catalogue.models.map(m => `${newName} - ${m}`);

    for (let i = 0; i < keys.length; i++) {
      await Product.updateMany(
        { catalogues: keys[i] },
        { $set: { "catalogues.$": newKeys[i] } }
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to edit catalogue" });
  }
});

// Edit a model name inside a catalogue and update products
router.post("/admin/edit-catalogue-model", async (req, res) => {
  const { catalogueName, oldModel, newModel } = req.body;

  try {
    const catalogue = await Catalogue.findOne({ name: catalogueName });
    if (!catalogue) return res.status(404).json({ error: "Catalogue not found" });

    // Replace model in catalogue
    const modelIndex = catalogue.models.indexOf(oldModel);
    if (modelIndex === -1) return res.status(404).json({ error: "Model not found" });
    catalogue.models[modelIndex] = newModel;
    await catalogue.save();

    // Update product catalogues
    const oldKey = `${catalogueName} - ${oldModel}`;
    const newKey = `${catalogueName} - ${newModel}`;
    await Product.updateMany(
      { catalogues: oldKey },
      { $set: { "catalogues.$": newKey } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to edit model" });
  }
});


module.exports = router;
