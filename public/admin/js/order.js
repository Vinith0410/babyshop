 let allOrders = []; // store fetched orders
    let currentPage = 1;
    const rowsPerPage = 10;

    // Fetch orders from your admin route
    async function fetchOrders() {
      const res = await fetch("/api/order/admin/orders");
      allOrders = await res.json();
      renderOrders();
      renderPagination();
    }

    // Render orders with pagination
    function renderOrders(filteredOrders = null) {
      const orders = filteredOrders || allOrders;
      const tbody = document.querySelector("#ordersTable tbody");
      tbody.innerHTML = "";

      const start = (currentPage - 1) * rowsPerPage;
      const end = start + rowsPerPage;
      const paginatedOrders = orders.slice(start, end);

      paginatedOrders.forEach((order, index) => {
        const customerDetails = `
          <div><b>Name:</b> ${order.address.fullname}</div>
          <div><b>Mobile:</b> ${order.address.mobile || "—"}</div>
          <div><b>Email:</b> ${order.address.email}</div>
          <div> <button class="print-btn" onclick="printOrder('${order._id}')">🖨️ Print</button></div>
        `;

        const deliveryDetails = `
          <div><b>Address:</b> ${order.address.address}</div>
          <div><b>Building:</b> ${order.address.building || "—"}</div>
          <div><b>City:</b> ${order.address.city}</div>
          <div><b>State:</b> ${order.address.state}</div>
          <div><b>Pincode:</b> ${order.address.pincode}</div>
        `;

        const productsTable = `
          <table class="product-mini-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Image</th>
                <th>Qty</th>
                <th>Color</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${order.products.map(p => `
                <tr>
                  <td>${p._id}</td>
                  <td><img src="${p.image}" alt="${p.name}" class="product-img"></td>
                  <td>${p.qty}</td>
                  <td>${p.selectedColor}</td>
                  <td>${p.price}</td>
                  <td>${p.discount || 0}%</td>
                  <td>$${p.subtotal}</td>

                </tr>
              `).join("")}
            </tbody>
          </table>
        `;

        const row = `
          <tr>
            <td>${start + index + 1}</td>
            <td>${order._id}</td>
            <td class="customer-cell">${customerDetails}</td>
            <td class="delivery-cell">${deliveryDetails}</td>
            <td>${productsTable}</td>
            <td>
              <select class="status-select" onchange="updateStatus('${order._id}', this.value)">
                <option value="Ordered" ${order.status === "Ordered" ? "selected" : ""}>Ordered</option>
                <option value="Processing" ${order.status === "Processing" ? "selected" : ""}>Processing</option>
                <option value="Shipped" ${order.status === "Shipped" ? "selected" : ""}>Shipped</option>
                <option value="Delivered" ${order.status === "Delivered" ? "selected" : ""}>Delivered</option>
              </select>
            </td>
            <td>
              ${
                order.status === "Delivered" && order.deliveredAt
                  ? `Delivered on <br><b>${new Date(order.deliveredAt).toLocaleString()}</b>`
                  : order.deliveryEstimate || "—"
              }
            </td>

          </tr>
        `;
        tbody.insertAdjacentHTML("beforeend", row);
      });
    }

    // Render pagination controls
    function renderPagination(filteredOrders = null) {
      const orders = filteredOrders || allOrders;
      const totalPages = Math.ceil(orders.length / rowsPerPage);
      const paginationDiv = document.getElementById("pagination");
      paginationDiv.innerHTML = "";

      for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement("button");
        button.innerText = i;
        button.classList.toggle("active", i === currentPage);
        button.addEventListener("click", () => {
          currentPage = i;
          renderOrders(filteredOrders);
          renderPagination(filteredOrders);
        });
        paginationDiv.appendChild(button);
      }
    }

    // Update order status
    async function updateStatus(orderId, status) {
      await fetch(`/api/order/admin/orders/update-status/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      fetchOrders(); // refresh after update
    }

    // Search order by product ID
    function searchOrder() {
      const searchValue = document.getElementById("searchInput").value.trim();
      if (!searchValue) return;
      const filtered = allOrders.filter(order => order._id.includes(searchValue));
      currentPage = 1;
      renderOrders(filtered);
      renderPagination(filtered);
    }

    // Show all orders again
    function showAllOrders() {
      document.getElementById("searchInput").value = "";
      currentPage = 1;
      renderOrders();
      renderPagination();
    }

    function printOrder(orderId) {
  const order = allOrders.find(o => o._id === orderId);
  if (!order) return alert("Order not found!");

  const printWindow = window.open("", "_blank", "width=800,height=600");

  const content = `
    <html>
      <head>
        <title>Order Details - ${order._id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.5; }
          h2 { color: #4B0082; } /* violet color */
          .section { margin-bottom: 20px; }
          .section div { margin-bottom: 5px; }
          .title { font-weight: bold; text-decoration: underline; }
        </style>
      </head>
      <body>
        <h2>Order ID: ${order._id}</h2>

        <div class="section">
          <div class="title">Customer Details</div>
          <div><b>Name:</b> ${order.address.fullname}</div>
          <div><b>Mobile:</b> ${order.address.mobile || "—"}</div>
          <div><b>Email:</b> ${order.address.email}</div>
        </div>

        <div class="section">
          <div class="title">Delivery Address</div>
          <div><b>Address:</b> ${order.address.address}</div>
          <div><b>Building:</b> ${order.address.building || "—"}</div>
          <div><b>City:</b> ${order.address.city}</div>
          <div><b>State:</b> ${order.address.state}</div>
          <div><b>Pincode:</b> ${order.address.pincode}</div>
        </div>

        <hr>
        <p style="text-align:center;">Thank you for your order!</p>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
}


    // Load orders when page opens
    fetchOrders();


    function downloadExcel() {
  window.location.href = "/api/order/admin/orders/download";
}