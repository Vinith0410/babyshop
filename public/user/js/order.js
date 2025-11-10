async function loadOrderSummary() {
  try {
    // Get logged-in user
    const userRes = await fetch("/get-user");
    const user = await userRes.json();
    const userId = user.email;

    // Fetch cart items
    const res = await fetch(`/api/cart/user/${userId}`);
    const items = await res.json();
if (!items || items.length === 0) {
  document.body.innerHTML = ""; // clear page content
  setTimeout(() => {
    alert("Add a product for order");
    window.location.href = "/user/shop";
  }, 0);
  return;
}
    document.getElementById("order-heading").style.display = "block";
    document.getElementById("orderTable").style.display = "table";
    document.getElementById("orderSummary").style.display = "block";
    document.getElementById("deliveryForm").style.display = "block";
    document.getElementById("addressHeading").style.display = "block";

    // Prefill delivery form with logged-in user info (name/email)
    try {
      const fullnameInput = document.querySelector('input[name="fullname"]');
      const emailInput = document.querySelector('input[name="email"]');
      if (fullnameInput) fullnameInput.value = user.name || '';
      if (emailInput) emailInput.value = user.email || '';
    } catch (e) {
      // ignore if inputs not present
    }

      // Load saved addresses for this user and render them as cards above the form
      try {
    const addrRes = await fetch(`/api/order/addresses/${encodeURIComponent(user.email)}`);
        if (addrRes.ok) {
          const addrData = await addrRes.json();
          const saved = (addrData && addrData.addresses) || [];
          renderSavedAddresses(saved);
          // show container if addresses exist
          const container = document.getElementById('savedAddressesContainer');
          if (saved.length > 0) {
            container.style.display = 'block';
          } else {
            container.style.display = 'none';
          }
        }
      } catch (err) {
        console.warn('Failed to load saved addresses', err);
      }


       const orderBody = document.getElementById("orderBody");
    const orderSummary = document.getElementById("orderSummary");
    orderBody.innerHTML = "";

    let totalQty = 0;
    let totalPrice = 0;
    let totalDelivery = 0; // ✅ new variable to track delivery charges

    items.forEach(item => {
      const discount = item.discount || 0;
      const deliveryCharge = item.deliveryCharge || 0; // ✅ read from model / backend
      const finalPrice = item.price - (item.price * discount / 100);
      const subtotal = finalPrice * item.qty;

      totalQty += item.qty;
      totalPrice += subtotal;
      totalDelivery += deliveryCharge * item.qty; // ✅ add to total

      const color = item.selectedColor && item.selectedColor.trim() !== ""
        ? item.selectedColor
        : "Default Product Color";

      const imageUrl = (item.image && typeof item.image === 'string')
        ? (item.image.startsWith('/') ? item.image : '/' + item.image)
        : '/image/shop/image/placeholder.png'; // fallback placeholder

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><img src="${imageUrl}" alt="Product" width="60"></td>
        <td>${item.name}</td>
        <td>₹${item.price.toFixed(2)}</td>
        <td>${discount}%</td>
        <td>${color}</td>
        <td>${item.qty}</td>
        <td>₹${Math.round(subtotal)}</td>
        <td>₹${(deliveryCharge * item.qty).toFixed(2)}</td> <!-- ✅ new column -->
      `;
      orderBody.appendChild(row);
    });

    if (items.length > 0) {
      const grandTotal = totalPrice + totalDelivery; // ✅ include delivery charge in final total

      orderSummary.style.display = "block";
      document.getElementById("productCount").textContent = "Total Item: " + totalQty;
      document.getElementById("totalQty").textContent = "Total Item Price: ₹" + Math.round(totalPrice);
      document.getElementById("total-delivery-charge").textContent = "Delivery Charge: ₹" + Math.round(totalDelivery);
      document.getElementById("totalPrice").textContent =
        // "Total Price: " + Math.round(totalPrice) +
        // "+" + Math.round(totalDelivery) +
        "Total Price:  ₹" + Math.round(grandTotal)
      document.getElementById("delivery-tamilnadu").textContent= `
      🎉 If you are from Tamil Nadu, delivery is FREE! You Will Save ₹ ${Math.round(totalDelivery)}
      `
        ;

  // -----------------------
  // ✅ Render summary card INSIDE #orderSummary
  // -----------------------
  const summaryContainer = document.getElementById("paymentSummaryCard");
  if (summaryContainer) {
  // Default card details (you can later set state-based logic if needed)
  const freeDeliveryState = "tamil nadu"; // ✅ you can adjust or remove later
  const deliveryNote = "🎉 If you are from Tamil Nadu, delivery is FREE!";
  const deliverynote2="🚚 Standard delivery charges apply for other states.";
  const noteColor = "green";

  const finalPriceWithoutDelivery = totalPrice; // total without delivery
  const grandTotalRounded = Math.round(grandTotal);
  const totalPriceRounded = Math.round(totalPrice);
  const totalDeliveryRounded = Math.round(totalDelivery);

  summaryContainer.innerHTML = `
    <div class="payment-summary-card">
      <h3>💰 Payment Summary</h3>
      <p class="summary-line">Total Amount: <strong>₹${grandTotalRounded}</strong></p>
      <p class="summary-line">Delivery Amount: <strong>₹${totalDeliveryRounded}</strong></p>
      <p class="note success">${deliveryNote}</p>
      <p class="summary-line">Price without Delivery: ₹${totalPriceRounded}</p>
      <p class="note success">If you are ${freeDeliveryState}, you will save ₹${totalDeliveryRounded}</p>
      <p class="final-price">Final Price: ₹${totalPriceRounded}</p>
      <p class="note info">${deliverynote2}</p>
      <p class="summary-line pay-with">You Have to Pay with Delivery: <strong>₹${grandTotalRounded}</strong></p>
    </div>
  `;
  }
    }

    // ✅ Update readonly fields inside the form
const productField = document.getElementById("productPriceField");
const deliveryField = document.getElementById("deliveryChargeField");
const totalField = document.getElementById("totalPriceField");

if (productField && deliveryField && totalField) {
  productField.value = `₹${Math.round(totalPrice)}`;
  deliveryField.value = `₹${Math.round(totalDelivery)}`;
  totalField.value = `₹${Math.round(totalPrice + totalDelivery)}`;
}

// ✅ Add change listener to state select (for Tamil Nadu logic)
const stateSelect = document.querySelector('select[name="state"]');
if (stateSelect) {
  stateSelect.addEventListener("change", () => {
    const state = stateSelect.value.trim().toLowerCase();
    let deliveryToShow = totalDelivery;
    let totalToShow = totalPrice + totalDelivery;

    if (state === "tamil nadu") {
      deliveryToShow = 0;
      totalToShow = totalPrice;
    }

    if (productField && deliveryField && totalField) {
      productField.value = `₹${Math.round(totalPrice)}`;
      deliveryField.value = `₹${Math.round(deliveryToShow)}`;
      totalField.value = `₹${Math.round(totalToShow)}`;
    }
  });
}

  } catch (err) {
    console.error("Error loading order summary:", err);
  }
}

document.getElementById("deliveryForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);

  // ✅ Ensure numeric values are correctly sent
  const productValue = document.getElementById("productPriceField").value.replace(/[₹,]/g, "").trim() || "0";
  const deliveryValue = document.getElementById("deliveryChargeField").value.replace(/[₹,]/g, "").trim() || "0";
  const totalValue = document.getElementById("totalPriceField").value.replace(/[₹,]/g, "").trim() || "0";

  formData.set("productprice", productValue);
  formData.set("deliverycharge", deliveryValue);
  formData.set("total", totalValue);

  // ✅ Add user info
  const userRes = await fetch("/get-user");
  const user = await userRes.json();
  formData.append("userId", user.email);
  formData.append("userName", user.name || "");
  formData.append("userEmail", user.email || "");

  try {
    const res = await fetch("/api/order/confirm", {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    if (res.ok) {
      alert("✅ Order placed successfully!\n\n" + (data.message || ""));
      window.location.href = "/user/orders";
    } else {
      alert("❌ Failed to place order: " + (data.error || "Unknown error"));
    }
  } catch (err) {
    alert("⚠️ Something went wrong: " + err.message);
  }
});

function showPayment(type, btn) {
  const sections = ["accountDetails", "scanDetails", "upiDetails"];
  sections.forEach(id => {
    document.getElementById(id).style.display = "none";
  });
  document.getElementById(type + "Details").style.display = "block";

  // Active button effect
  document.querySelectorAll(".pay-btn-method").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}


 document.getElementById("paymentProof").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.getElementById("previewImg");
        img.src = ev.target.result;
        img.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });

loadOrderSummary();


  // ------------------ Saved address helpers ------------------
  function renderSavedAddresses(addresses) {
    const container = document.getElementById('savedAddressesContainer');
    container.innerHTML = '';
    if (!addresses || addresses.length === 0) return;

    addresses.forEach((a, idx) => {
      const card = document.createElement('div');
      card.className = 'address-card';
      card.style = 'border:1px solid #ddd; padding:10px; margin-bottom:8px; border-radius:6px; background:#fff;';

      const html = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1">
            <strong>${escapeHtml(a.fullname || '')}</strong><br>
            <small>${escapeHtml(a.address || '')} ${escapeHtml(a.building || '')}</small><br>
            <small>${escapeHtml(a.city || '')}, ${escapeHtml(a.state || '')} - ${escapeHtml(a.pincode || '')}</small><br>
            <small class="mail"> Mail -${escapeHtml(a.email || '').toLowerCase()} Phone- ${escapeHtml(a.mobile || '')}</small>
          </div>
          <div style="margin-left:12px">
            <button type="button" data-idx="${idx}" class="use-address-btn">Use this address</button>
          </div>
        </div>
      `;

      card.innerHTML = html;
      container.appendChild(card);
    });

    // Attach click handlers
    container.querySelectorAll('.use-address-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const addresses = window.__savedAddresses || [];
        const a = addresses[idx];
        if (a) {
          populateFormFromAddress(a);
          // scroll to form
          document.getElementById('deliveryForm').scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // keep addresses in a global var for use by buttons
    window.__savedAddresses = addresses;
  }

  function populateFormFromAddress(a) {
  try {
    const set = (name, val) => {
      const el = document.querySelector(`[name="${name}"]`);
      if (el) el.value = val || '';
    };
    set('fullname', a.fullname);
    set('email', a.email);
    set('mobile', a.mobile);
    set('address', a.address);
    set('building', a.building);
    set('city', a.city);
    set('state', a.state);
    set('pincode', a.pincode);

    // ✅ Trigger state change to recalculate delivery & total
    const stateSelect = document.querySelector('select[name="state"]');
    if (stateSelect) {
      const event = new Event("change");
      stateSelect.dispatchEvent(event);
    }

  } catch (err) {
    console.warn('Failed to populate form from address', err);
  }
}

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }