const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "public"), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  }
}));

app.use(session({
  secret: "otp-secret",
  resave: false,
  saveUninitialized: true
}));

// Connect DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err));

// Routes
const authRoutes = require("./routes/auth");
const resetRoutes = require("./routes/reset");
const adminRoutes = require("./routes/admin");
const searchLogger = require("./routes/search");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");

app.use("/api/order", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/", adminRoutes);
app.use("/", authRoutes);
app.use("/", resetRoutes);
app.use("/", searchLogger);
app.use("/uploads", express.static("uploads"));


// Start server
// Ensure uploads directory exists (so multer can write files)
const uploadsPath = path.join(__dirname, "uploads");
try {
  fs.mkdirSync(path.join(uploadsPath, "payments"), { recursive: true });
} catch (err) {
  console.error("Failed to create uploads directory:", err);
}

// Serve uploads with an absolute path for reliability
app.use("/uploads", express.static(uploadsPath));

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on 0.0.0.0:${PORT}`);
});

