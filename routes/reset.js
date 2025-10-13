const express = require("express");
const router = express.Router();
const path = require("path");
const User = require("../models/User");
const nodemailer = require("nodemailer");
require("dotenv").config();


let resetUsers = {};

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

// Forgot password
router.get("/forgot-password", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "forgot-password.html"));
});

router.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000);

  resetUsers[email] = { otp };
  req.session.resetEmail = email;

  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "🔐 Password Reset Request – Allwin Baby Shop",
    text: `
    We heard you need a little help getting back into your Allwin Baby Shop account. Don’t worry  we’ve got you! 💕

    Here’s your One-Time Password (OTP) to reset your password:
    Your OTP to reset password is: ✨ ${otp} ✨

    ⚠️ This code will expire in 10 minutes for your security.
    If you didn’t request a password reset, please ignore this email  your account is safe.

    If you have any questions or need assistance, feel free to reach out to our support team.
    With care,
    Allwin Baby Shop Support Team 🍼💖
    `
  }, (err) => {
    if (err) {
      console.log("Reset OTP email error:", err);
      return res.send("<script>alert('Failed to send OTP.'); window.location.href='/forgot-password';</script>");
    }
    res.redirect("/reset-verify");
  });
});

router.get("/reset-verify", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "reset-verify.html"));
});

router.post("/reset-verify", (req, res) => {
  const { otp } = req.body;
  const email = req.session.resetEmail;

  if (resetUsers[email] && resetUsers[email].otp == otp) {
    res.redirect("/reset-password");
  } else {
    res.send("<script>alert('Invalid OTP.'); window.location.href='/reset-verify';</script>");
  }
});

router.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "reset-password.html"));
});

router.post("/reset-password", async (req, res) => {
  const { password } = req.body;
  const email = req.session.resetEmail;

  await User.updateOne({ email }, { $set: { password } });
  delete resetUsers[email];
  req.session.resetEmail = null;

  res.send("<script>alert('Password updated successfully.'); window.location.href='/login';</script>");
});

module.exports = router;
