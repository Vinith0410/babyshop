const express = require("express");
const nodemailer = require("nodemailer");
require("dotenv").config();

const router = express.Router();

// Configure transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,         // use 587 for TLS
  secure: false,     // false for TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password if using Gmail
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false
  }
});

// A map to store timers for each email
const debounceTimers = new Map();

// API route to log searches
router.post("/log-search", async (req, res) => {
    const { name, email, search } = req.body || {};

    if (!name || !email || !search) {
        return res.status(400).json({ success: false, message: "Missing data" });
    }

    // Send mail asynchronously without waiting for response
    transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_TO, // admin email
        subject: "New User Search Logged",
        text: `User Search Activity:\nName: ${name}\nEmail: ${email}\nSearched for: "${search}"`
    }).then(() => {
        console.log(`Email sent for search: "${search}" by ${email}`);
    }).catch(err => console.error("Email error:", err));

    // Respond immediately to frontend
    res.json({ success: true, message: "Search logged, email sending in background" });
});


module.exports = router;
