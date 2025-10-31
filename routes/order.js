const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const User = require("../models/User"); // to get user info
const Address = require("../models/Address");
const nodemailer = require("nodemailer");
const ExcelJS = require("exceljs");
const multer = require("multer");
const path = require("path");

require("dotenv").config();

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,         // use 587 for TLS
  secure: false,     // false for TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password if using Gmail
  },
  tls: {
    rejectUnauthorized: false,
    ciphers: "SSLv3"
  }
});

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store uploads under public so they are served by Express static
    const dest = path.join(__dirname, "..", "public", "uploads", "payments");
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Confirm order
router.post("/confirm", upload.single("paymentProof"), async (req, res) => {
 try {
    const { userId, fullname, email, mobile, address, building, city, state, pincode } = req.body;

    if (!req.file) return res.status(400).json({ error: "Payment screenshot required" });

    // fetch cart items
    const cartItems = await Cart.find({ userId });
    if (!cartItems.length) return res.status(400).json({ error: "Cart is empty" });

    // fetch user
    const user = await User.findOne({ email: userId });
    // Use the database email if frontend email is missing
      const customerEmail = email || user?.email;

    // Calculate totals
    let totalQty = 0, totalPrice = 0;
    const products = cartItems.map(item => {
      const discount = item.discount || 0;
      const finalPrice = item.price - (item.price * discount / 100);
      const subtotal = finalPrice * item.qty;

      totalQty += item.qty;
      totalPrice += subtotal;

      return {
        productId: item.productId,
        name: item.name,
        image: item.image,
        price: item.price,
        discount: item.discount,
        qty: item.qty,
        selectedColor: item.selectedColor || "Default",
        subtotal: Math.round(subtotal)
      };
    });

     const order = new Order({
      userId,
      products,
      totalQty,
      totalPrice: Math.round(totalPrice),
      address: { fullname, email, mobile, address, building, city, state, pincode },
      paymentProof: `/uploads/payments/${req.file.filename}`
    });

    await Promise.all([
      order.save(),
      Cart.deleteMany({ userId })
    ]);

    let addressSaved = false;

    // If user checked "save address", persist it into Address collection
    try {
      const saveFlag = req.body.saveAddress;
      // log body for debugging
      console.log('Order.confirm req.body saveAddress=', saveFlag, 'userId=', req.body.userId);
      // handle checkbox value which can be string, boolean, number, or array (when duplicate fields present)
      const normalize = v => (v === null || v === undefined) ? '' : String(v).toLowerCase();
      const matchesTrue = v => ['1', 'on', 'true', 'yes'].includes(normalize(v));
      let shouldSave = false;
      if (Array.isArray(saveFlag)) {
        shouldSave = saveFlag.some(matchesTrue);
      } else {
        shouldSave = matchesTrue(saveFlag);
      }
      if (shouldSave) {
        const uid = (userId || req.body.userId || '').toString().trim();
        const addressEntry = {
          fullname: (fullname || '').toString().trim(),
          email: (customerEmail || email || '').toString().trim(),
          mobile: (mobile || '').toString().trim(),
          address: (address || '').toString().trim(),
          building: (building || '').toString().trim(),
          city: (city || '').toString().trim(),
          state: (state || '').toString().trim(),
          pincode: (pincode || '').toString().trim(),
          isDefault: false,
          createdAt: new Date()
        };

        const upsertResult = await Address.findOneAndUpdate(
          { userId: uid },
          {
            $set: {
              userId: uid,
              userName: (req.body.userName || user?.name || "").toString().trim(),
              userEmail: (req.body.userEmail || customerEmail || user?.email || "").toString().trim()
            },
            $push: { addresses: addressEntry }
          },
          { upsert: true, new: true }
        );
        console.log('Saved delivery address for user', uid, 'result id=', upsertResult?._id);
        if (upsertResult) addressSaved = true;
      } else {
        console.log('Save address flag not set, skipping save');
      }
    } catch (addrErr) {
      console.error('Failed to save address:', addrErr);
      // continue without blocking order confirmation
    }

  res.json({ message: "Check Your mail Box For More Information", addressSaved });
    // Send emails with attachment
  // Build attachment absolute path inside public folder
  const rel = (order.paymentProof || "").replace(/^\/+/, "");
  const attachmentFile = path.join(__dirname, "..", "public", rel);

    // 🔄 Background email sending (no wait for user)
    const productList = products.map(
      p => `
        <tr>
          <td>${p.productId}</td>
          <td>${p.name}</td>
          <td>${p.selectedColor}</td>
          <td>${p.qty}</td>
          <td>₹${p.subtotal}</td>
        </tr>`
    ).join("");

    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `🎉 Order Confirmed – Your Order ID: ${order._id}`,
      html: `
        <h2>Hello ${fullname}, 🎉</h2>
        <p>Your order has been placed successfully at <b>Allwin Baby Shop</b> 🍼💖</p>
        <h3>🛒 Products Ordered</h3>
        <table border="1" cellspacing="0" cellpadding="5">
          <tr>
            <th>Product ID</th>
            <th>Name</th>
            <th>Color</th>
            <th>Qty</th>
            <th>Subtotal</th>
          </tr>
          ${productList}
        </table>
        <p><b>Total Quantity:</b> ${totalQty}</p>
        <p><b>Total Price:</b> ₹${Math.round(totalPrice)}</p>
      `
    };

    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: "🛒 New Order Received",
      html: `
        <h2>New Order Alert 🚨</h2>
        <h2>Order ID: ${order._id}</h2>
        <p>Customer: ${fullname} (${customerEmail || user?.email || userId})</p>
        <h3>Products Ordered</h3>
        <table border="1" cellspacing="0" cellpadding="5">
          <tr>
            <th>Product ID</th>
            <th>Name</th>
            <th>Color</th>
            <th>Qty</th>
            <th>Subtotal</th>
          </tr>
          ${productList}
        </table>
        <p><b>Total Quantity:</b> ${totalQty}</p>
        <p><b>Total Price:</b> ₹${Math.round(totalPrice)}</p>
      `,
       attachments: [
        {
          filename: "payment-proof.png",
          path: attachmentFile
        }
      ]
    };

    // 🔄 Background (async, don’t wait) - send only to available recipients
    const mailPromises = [];
    if (customerEmail) {
      mailPromises.push(transporter.sendMail(userMailOptions));
    }
    if (process.env.EMAIL_TO) {
      mailPromises.push(transporter.sendMail(adminMailOptions));
    }

    if (mailPromises.length > 0) {
      Promise.all(mailPromises)
        .then(() => console.log("✅ Emails sent successfully"))
        .catch(err => console.error("❌ Email error:", err));
    } else {
      console.warn("No email recipients configured; skipping sending emails for order", order._id);
    }

  } catch (err) {
    console.error("Order error:", err);
    res.status(500).json({ error: "Failed to confirm order" });
  }
});


// Helper function to get delivery estimate based on status
function getDeliveryEstimate(status) {
  switch (status) {
    case "Ordered":
      return "7 to 8 days";
    case "Processing":
      return "5 to 6 days";
    case "Shipped":
      return "3 to 4 days";
    default:
      return "Unknown";
  }
}

// 📌 Get user orders
router.get("/my-orders", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const userEmail = req.session.user.email; // user email from session
    const orders = await Order.find({ userId: userEmail }).sort({ createdAt: -1 });

    const updatedOrders = orders.map(order => ({
      ...order._doc,
      deliveryEstimate: getDeliveryEstimate(order.status) // ✅ now defined
    }));

    res.json(updatedOrders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// API: get saved addresses for a user (by userId/email)
// Route mounted under /api/order -> full path: /api/order/addresses/:userId
router.get('/addresses/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const addrDoc = await Address.findOne({ userId });
    if (!addrDoc) return res.json({ userId, userName: '', userEmail: '', addresses: [] });
    res.json({ userId: addrDoc.userId, userName: addrDoc.userName || '', userEmail: addrDoc.userEmail || '', addresses: addrDoc.addresses || [] });
  } catch (err) {
    console.error('Failed to get addresses:', err);
    res.status(500).json({ error: 'Failed to get addresses' });
  }
});

// 📌 Get all orders (for admin)
router.get("/admin/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    // Add delivery estimate to each order
    const updatedOrders = orders.map(order => ({
      ...order._doc,
      deliveryEstimate: getDeliveryEstimate(order.status)
    }));

    res.json(updatedOrders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// 📌 Update order status + send mail to user
router.post("/admin/orders/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;

    const updateData = { status };
    if (status === "Delivered") {
      updateData.deliveredAt = new Date(); // ✅ store current time when delivered
    }

    // update order
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Get delivery estimate
    const deliveryTime = getDeliveryEstimate(status);

    // prepare products list for email
    const productList = order.products.map(
      p => `
        <tr>
          <td>${p.productId}</td>
          <td>${p.name}</td>
          <td>${p.selectedColor}</td>
          <td>${p.qty}</td>
          <td>$${p.subtotal}</td>
        </tr>`
    ).join("");

    let subject, htmlContent;

    if (status === "Delivered") {
      // ✅ Thank you mail
      subject = "🎉 Thank You for Shopping with Allwin Baby Shop!";
      htmlContent = `
        <h2>Your Order ID: ${order._id} </h2>
        <h2>Hello ${order.address.fullname},</h2>
        <p>We’re excited to let you know that your order has been <b>delivered successfully</b> </p>

        <h3>🛒 Order Summary</h3>
        <table border="1" cellspacing="0" cellpadding="5">
          <tr>
            <th>Product ID</th>
            <th>Name</th>
            <th>Color</th>
            <th>Qty</th>
            <th>Subtotal</th>
          </tr>
          ${productList}
        </table>

        <p><b>Total Quantity:</b> ${order.totalQty}</p>
        <p><b>Total Price:</b> $${order.totalPrice}</p>

        <p>🙏 Thank you for shopping with <b>Allwin Baby Shop</b> 🍼💖</p>
        <p>We hope to see you again soon!</p>
      `;
    } else {
      // ✅ Normal status update mail
      subject = `📦 Your Order is now ${status}`;
      htmlContent = `
        <h2>Your Order ID: ${order._id} </h2>
        <h2>Hello ${order.address.fullname},</h2>
        <p>Your order status has been updated to:</p>
        <h3 style="color:green">${status}</h3>

        <h3>🛒 Order Summary</h3>
        <table border="1" cellspacing="0" cellpadding="5">
          <tr>
            <th>Product ID</th>
            <th>Name</th>
            <th>Color</th>
            <th>Qty</th>
            <th>Subtotal</th>
          </tr>
          ${productList}
        </table>

        <p><b>Total Quantity:</b> ${order.totalQty}</p>
        <p><b>Total Price:</b> ₹${order.totalPrice}</p>
        <p><b>Estimated Delivery:</b> ${deliveryTime}</p>
      `;
    }

    // send mail to the best available recipient (address.email, userId, or admin fallback)
    const recipient = order.address?.email || order.userId || process.env.EMAIL_TO;
    if (recipient) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: recipient,
        subject,
        html: htmlContent
      });
    } else {
      console.warn("No recipient email available for order status update:", order._id);
    }

    res.json({ message: "Status updated & email sent", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// 📌 Download all orders in Excel

router.get("/admin/orders/download", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Orders");

    // Columns
    worksheet.columns = [
      { header: "Order ID", key: "orderId", width: 25 },
      { header: "User ID", key: "userId", width: 30 },
      { header: "Customer Name", key: "customerName", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Mobile", key: "mobile", width: 15 },
      { header: "Address", key: "address", width: 40 },
      { header: "City", key: "city", width: 15 },
      { header: "State", key: "state", width: 15 },
      { header: "Pincode", key: "pincode", width: 12 },
      { header: "Product ID", key: "productId", width: 25 },
      { header: "Product Name", key: "productName", width: 25 },
      { header: "Color", key: "color", width: 15 },
      { header: "Qty", key: "qty", width: 10 },
      { header: "Price", key: "price", width: 12 },
      { header: "Discount %", key: "discount", width: 12 },
      { header: "Subtotal", key: "subtotal", width: 15 },
      { header: "Order Status", key: "status", width: 15 },
      { header: "Total Qty", key: "totalQty", width: 12 },
      { header: "Total Price", key: "totalPrice", width: 15 },
      { header: "Created At", key: "createdAt", width: 20 },
      { header: "Delivered At", key: "deliveredAt", width: 20 },
    ];

    // Rows (flatten order + products)
    orders.forEach(order => {
      order.products.forEach(p => {
        worksheet.addRow({
          orderId: order._id,
          userId: order.userId,
          customerName: order.address.fullname,
          email: order.address.email,
          mobile: order.address.mobile || "—",
          address: order.address.address + " " + (order.address.building || ""),
          city: order.address.city,
          state: order.address.state,
          pincode: order.address.pincode,
          productId: p.productId,
          productName: p.name,
          color: p.selectedColor || "Default",
          qty: p.qty,
          price: p.price,
          discount: p.discount || 0,
          subtotal: p.subtotal,
          status: order.status,
          totalQty: order.totalQty,
          totalPrice: order.totalPrice,
          createdAt: new Date(order.createdAt).toLocaleString(),
          deliveredAt: order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : "—"
        });
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF007BFF" } };

    // Send file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=orders.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel download error:", err);
    res.status(500).json({ error: "Failed to download Excel" });
  }
});

module.exports = router;