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

app.get('/uploads/*', (req, res) => {
  const filePath = path.join(__dirname, req.path);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.warn("File not found:", filePath);
      res.status(404).send("File not found");
    }
  });
});


// Mount small diagnostics and static serving for uploads BEFORE other route handlers
// so that requests to /uploads/* are served from the uploads folder and not
// intercepted by any catch-all routes.
const uploadsPath = path.join(__dirname, "uploads");

// Optional diagnostics: when ENABLE_UPLOADS_LOG=true, log missing upload files
if (process.env.ENABLE_UPLOADS_LOG === 'true') {
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(uploadsPath, decodeURIComponent(req.path));
    fs.access(filePath, fs.constants.R_OK, (err) => {
      if (err) {
        console.warn('[UPLOADS] Missing file requested:', filePath);
      }
      next();
    });
  });
}

app.use('/api/uploads', express.static(uploadsPath));


// Ensure uploads directory exists (so multer can write files)
try {
  fs.mkdirSync(path.join(uploadsPath, "payments"), { recursive: true });
} catch (err) {
  console.error("Failed to create uploads directory:", err);
}

// Now mount API and app routes
app.use("/api/order", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/", adminRoutes);
app.use("/", authRoutes);
app.use("/", resetRoutes);
app.use("/", searchLogger);


// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on 0.0.0.0:${PORT}`);
});

