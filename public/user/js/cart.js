async function loadCart() {
  try {
    // Get logged-in user
    const userRes = await fetch("/get-user");
    const user = await userRes.json();
    const userId = user.email;

    // Fetch cart items
    const res = await fetch(`/api/cart/user/${userId}`);
    const items = await res.json();

    const cartBody = document.getElementById("cartBody");
    const emptyMessage = document.getElementById("emptyMessage");

    cartBody.innerHTML = "";

    let totalQty = 0;
    let totalPrice = 0;

    if (items.length === 0) {
      document.getElementById("cartTable").style.display = "none";
      emptyMessage.style.display = "block";
      document.getElementById("cartSummary").style.display = "none";
      return;
    } else {
      document.getElementById("cartTable").style.display = "table";
      emptyMessage.style.display = "none";
    }

    items.forEach(item => {
  const discount = item.discount || 0;
  const finalPrice = item.price - (item.price * discount / 100);
  const subtotal = finalPrice * item.qty;

  totalQty += item.qty;
  totalPrice += subtotal;

  // ✅ Handle colors
  let colorOptions = "";
  if (item.availableColors && item.availableColors.length > 0) {
    colorOptions = `
      <select id="color-${item._id}" class="product-color" onchange="updateColor('${item._id}', this.value)">
        ${item.availableColors.map(c => `<option value="${c}" ${item.selectedColor === c ? "selected" : ""}>${c}</option>`).join("")}
      </select>
    `;
  } else {
    colorOptions = `<span>Default Color</span>`;
  }

  const row = document.createElement("tr");
  row.innerHTML = `
    <td><img src="../..${item.image}" class="cart-product-image" alt="Product"></td>
    <td>${item.name}</td>
    <td>₹${item.price.toFixed(2)}</td>
    <td>${discount}%</td>
    <td>${colorOptions}</td>
    <td>
      <button class="qty-btn" onclick="updateQty('${item._id}', -1, ${item.price}, ${discount})">-</button>
      <span id="qty-${item._id}">${item.qty}</span>
      <button class="qty-btn" onclick="updateQty('${item._id}', 1, ${item.price}, ${discount})">+</button>
    </td>
    <td id="subtotal-${item._id}">₹${subtotal.toFixed(2)}</td>
    <td>
      <button class="qty-btn" style="background:red;color:white;" onclick="deleteItem('${item._id}')">Delete</button>
    </td>
  `;
  cartBody.appendChild(row);
});
    // Show summary if items exist
    const cartSummary = document.getElementById("cartSummary");
    cartSummary.style.display = "block";
    document.getElementById("totalQty").textContent = "Total Quantity: " + totalQty;
    document.getElementById("totalPrice").textContent = "Total Price: ₹" + totalPrice.toFixed(2);
    document.getElementById("productCount").textContent = "Products: " + items.length;

  } catch (err) {
    console.error("Error loading cart:", err);
  }
}

async function deleteItem(itemId) {
  if (!confirm("Are you sure you want to remove this item?")) return;

  const res = await fetch(`/api/cart/${itemId}`, {
    method: "DELETE"
  });

  const data = await res.json();
  if (res.ok) {
    alert(data.message);
    loadCart(); // reload cart
  } else {
    alert("Error: " + data.message);
  }
}

// Update quantity function
async function updateQty(itemId, change, price, discount) {
  const qtySpan = document.getElementById(`qty-${itemId}`);
  let qty = parseInt(qtySpan.textContent) + change;

  if (qty < 1) qty = 1; // prevent going below 1
  qtySpan.textContent = qty;

  // Recalculate subtotal with discount
  const finalPrice = price - (price * discount / 100);
  const subtotal = qty * finalPrice;
  document.getElementById(`subtotal-${itemId}`).textContent = `$${subtotal.toFixed(2)}`;

  // Send update to backend
await fetch(`/api/cart/update-qty/${itemId}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ qty })
});

  // Reload totals and summary
  loadCart();

}

// Order button handler
// Order button handler
document.getElementById("orderBtn").onclick = function() {
  window.location.href = "/user/order";
};

// Update selected color function
async function updateColor(itemId, color) {
  try {
    await fetch(`/api/cart/update-color/${itemId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedColor: color })
    });
  } catch (err) {
    console.error("Error updating color:", err);
  }
}

loadCart();