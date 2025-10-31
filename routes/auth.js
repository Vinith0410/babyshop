const express = require("express");
const router = express.Router();
const path = require("path");
const User = require("../models/User");
const nodemailer = require("nodemailer");
require("dotenv").config();


let tempUsers = {};

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

// --- Google OAuth routes (simple OAuth2 without passport)
// Requires environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK
const googleAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: process.env.GOOGLE_CALLBACK || '',
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state: state || ''
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

router.get('/auth/google', (req, res) => {
  // Validate Google OAuth configuration before redirecting
  const missing = [];
  if (!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
  if (!process.env.GOOGLE_CALLBACK) missing.push('GOOGLE_CALLBACK');

  if (missing.length) {
    const msg = `Missing Google OAuth config: ${missing.join(', ')}. Please set these in your environment or .env file.`;
    console.error(msg);
    // Show a friendly page instead of redirecting to Google with missing params
    return res.status(500).send(`<h2>Google OAuth not configured</h2><p>${msg}</p><p><a href="/login">Back to login</a></p>`);
  }

  // optional state could be used to redirect after login
  res.redirect(googleAuthUrl());
});

router.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/login');

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: process.env.GOOGLE_CALLBACK || '',
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.id_token) return res.redirect('/login');

    // decode JWT payload (id_token)
    const parts = tokenData.id_token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));

    const email = payload.email;
    const name = payload.name || payload.email.split('@')[0];

    if (!email) return res.redirect('/login');

    // find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, password: '' });
    }

    req.session.user = { id: user._id, name: user.name, email: user.email };
    return res.redirect('/user/home');
  } catch (err) {
    console.error('Google OAuth error:', err);
    return res.redirect('/login');
  }
});

// Register page
router.get("/", (req, res) => {
   if (req.session.user) {
    if (req.session.user.email === "admin123@gmail.com") {
      return res.redirect("/admin/home");
    }
    return res.redirect("/user/home");
  }
  res.sendFile(path.join(__dirname, "../public", "register.html"));
});

// Login page
router.get("/login", (req, res) => {
  if (req.session.user) {
    if (req.session.user.email === "admin123@gmail.com") {
      return res.redirect("/admin/home");
    }
    return res.redirect("/user/home");
  }
  res.sendFile(path.join(__dirname, "../public", "login.html"));
});


// OTP page
router.get("/verify", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "verify.html"));
});

// Send OTP
router.post("/send-otp", async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.send("<script>alert('Email already registered. Please login.'); window.location.href='/login';</script>");
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  tempUsers[email] = { name, email, password, otp };

  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Allwin Baby Shop OTP is Here!",
    text: `
    Hello [${name}] 🎉🎉
    Welcome to Allwin Baby Shop! 🍼💖
    We’re thrilled to have you join our community of parents and caregivers.
    We’re so excited to have you join the Allwin Baby Shop family! 💖

    Here’s your One-Time Password (OTP) to complete your registration:
    Your OTP is: 🎯 ${otp}  🎯

    🔒 Please enter this code within 10 minutes to keep your account safe.
    If you didn’t request this, you can safely ignore this email.

    If you have any questions or need assistance, feel free to reach out to us at
    With love,
    Allwin Baby Shop Team 🍼💝
      `
  }, (err) => {
    if (err) {
      console.log("Email send error:", err);
      return res.send("<script>alert('Failed to send OTP.'); window.location.href='/';</script>");
    }
    req.session.tempEmail = email;
    res.redirect("/verify");
  });
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { otp } = req.body;
  const email = req.session.tempEmail;

  if (!tempUsers[email]) {
    return res.send("<script>alert('Session expired. Please register again.'); window.location.href='/';</script>");
  }

  if (tempUsers[email].otp == otp) {
    const { name, password } = tempUsers[email];
    await User.create({ name, email, password });
    delete tempUsers[email];
    res.send("<script>alert('OTP Verified. You can now login.'); window.location.href='/login';</script>");
  } else {
    res.send("<script>alert('Invalid OTP. Try again.'); window.location.href='/verify';</script>");
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, password });
  if (!user) {
    return res.send("<script>alert('Invalid credentials.'); window.location.href='/login';</script>");
  }

  // Store id also
  req.session.user = { id: user._id, name: user.name, email: user.email };

  if (user.name === "admin" && user.email === "admin123@gmail.com") {
    return res.redirect("/admin/home");
  }

  res.redirect("/user/home");
});

// Admin Home page after login
router.get("/admin/home", (req, res) => {
  if (!req.session.user || req.session.user.email !== "admin123@gmail.com") {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "../public/admin/home.html"));
});

router.get("/admin/orders", (req, res) => {
  if (!req.session.user || req.session.user.email !== "admin123@gmail.com") {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "../public/admin/order.html"));
});


// Home page after login
router.get("/user/home", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "../public/user/html/home.html"));
});

//About page
router.get("/user/about", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "../public/user/html/about.html"));
});

// Shop page
router.get("/user/shop", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "../public/user/html/shop.html"));
});

// order page
router.get("/user/order", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "../public/user/html/order.html"));
});

// order page
router.get("/user/orders", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "../public/user/html/display-order.html"));
});


// Fun Mall page
router.get("/user/mall", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "../public/user/html/mall.html"));
});

// Contact page
router.get("/user/contact", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "../public/user/html/contact.html"));
});

// Cart page route
router.get("/user/cart", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/user/html/cart.html"));
});

router.get("/get-user", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json(req.session.user); // includes id, name, email
});



// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
