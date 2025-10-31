
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const perPage = 12;

// Fetch products AND catalogues (catalogues come from admin DB)
Promise.all([fetch("/api/products"), fetch("/api/catalogues")])
  .then(async ([pRes, cRes]) => {
    const products = await pRes.json();
    const catalogues = cRes.ok ? await cRes.json() : [];

    allProducts = products;
    filteredProducts = products;
    renderFilters(products, catalogues);
    renderProducts();

    // Check if there's a category to filter by from home page
    const selectedCategory = sessionStorage.getItem('selectedCategory');
    if (selectedCategory) {
      // Find and click the checkbox for this category
      document.querySelectorAll('#filters input[type="checkbox"]').forEach(cb => {
        if (cb.value.startsWith(selectedCategory)) {
          cb.checked = true;
          applyFilters();
        }
      });
      // Clear the selected category
      sessionStorage.removeItem('selectedCategory');
    }
  })
  .catch(err => console.error("Failed to load products or catalogues:", err));

// Render Filters dynamically
function renderFilters(products, catalogues = []) {
  const filterContainer = document.getElementById("filters");
  const grouped = {};

  // First: build from catalogues collection (admin-managed)
  if (Array.isArray(catalogues) && catalogues.length > 0) {
    catalogues.forEach(cat => {
      const key = cat.name;
      if (!grouped[key]) grouped[key] = new Set();
      // Filter out empty or duplicate models
      (cat.models || []).forEach(m => {
        if (m && m.trim()) {
          grouped[key].add(m.trim());
        }
      });
    });
  }

  // Also include any catalogue-model keys present on products (backwards compatibility)
  // If admin-managed catalogues exist, only add product values to those keys.
  // This prevents stray headings (e.g. 'Age') appearing when they are not
  // present in the admin `catalogues` collection.
  if (Array.isArray(catalogues) && catalogues.length > 0) {
    // First, verify which products actually have these values
    const productValueCounts = {};
    products.forEach(p => {
      (p.catalogues || []).forEach(c => {
        if (!c || typeof c !== 'string') return; // skip invalid
        const parts = c.split(" - ");
        const key = parts[0] ? parts[0].trim() : c.trim();
        const value = parts[1] ? parts[1].trim() : "";

        if (value && grouped[key]) {
          if (!productValueCounts[key]) {
            productValueCounts[key] = new Set();
          }
          productValueCounts[key].add(value);
        }
      });
    });

    // Only add values that actually exist in products
    Object.keys(productValueCounts).forEach(key => {
      productValueCounts[key].forEach(value => {
        grouped[key].add(value);
      });
    });
  } else {
    // No admin catalogues available — fall back to deriving groups from products
    products.forEach(p => {
      (p.catalogues || []).forEach(c => {
        if (!c || typeof c !== 'string') return;
        const parts = c.split(" - ");
        const key = parts[0] ? parts[0].trim() : c.trim();
        const value = parts[1] ? parts[1].trim() : "";
        if (!grouped[key]) grouped[key] = new Set();
        if (value) grouped[key].add(value);
      });
    });
  }

  // Render
  // Only render catalogue sections that have at least one model/value
  const keysToRender = Object.keys(grouped).filter(k => grouped[k] && grouped[k].size > 0);
  filterContainer.innerHTML = keysToRender.map(key => `
    <div>
      <h4>${key}</h4>
      ${Array.from(grouped[key]).map(val => `
        <label>
          <input type="checkbox" value="${key} - ${val}" data-key="${key}" onchange="applyFilters()" />
          ${val}
        </label><br>
      `).join("")}
    </div>
  `).join("");
}

// Apply Filters
function applyFilters() {
  const selected = {};
  document.querySelectorAll("#filters input:checked").forEach(cb => {
    const key = cb.getAttribute("data-key");
    if (!selected[key]) selected[key] = [];
    // cb.value may be in form 'Catalogue - Model' or just 'Model'
    const val = cb.value.includes(' - ') ? cb.value.split(' - ')[1].trim() : cb.value;
    selected[key].push(val);
  });

  // If no filters selected, show all products
  if (Object.keys(selected).length === 0) {
    filteredProducts = allProducts;
  } else {
    // Show products that match ANY of the selected filters (OR logic)
    filteredProducts = allProducts.filter(p => {
      // Make sure product has valid catalogues
      if (!p.catalogues || !Array.isArray(p.catalogues)) return false;

      // Check if product matches any selected filter
      return Object.keys(selected).some(category => {
        return p.catalogues.some(c => {
          if (!c || typeof c !== 'string') return false;
          const parts = c.split(" - ");
          const key = parts[0] ? parts[0].trim() : '';
          const value = parts[1] ? parts[1].trim() : '';

          // Only match if both category and value are valid
          return key === category && value && selected[category].includes(value);
        });
      });
    });
  }

  currentPage = 1;
  renderProducts();
}

// Search by Name
document.getElementById("searchBtn").addEventListener("click", async () => {
    const term = document.getElementById("search").value.toLowerCase().trim();
  if (term === "") {
    filteredProducts = allProducts;
  } else {
    filteredProducts = allProducts.filter(p =>
      p.name.toLowerCase().includes(term)
    );
  }
  currentPage = 1;
  renderProducts();

  // Send search log to server
// Send search log in background
    if (term !== "") {
        try {
            // Fetch logged-in user info
            const userRes = await fetch("/get-user");
            const user = await userRes.json();

            fetch("/log-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: user.name,      // actual name
                    email: user.email,    // actual email
                    search: term
                })
            }).catch(err => console.error("Error sending search email:", err));
        } catch(err) {
            console.error("Error fetching user info:", err);
        }
    }
});


// Render Products with Pagination
function renderProducts() {
    const container = document.getElementById("products");
    container.innerHTML = "";

    // Ensure container has proper display and width
    container.style.display = "grid";
    container.style.width = "100%";

        if (filteredProducts.length === 0) {
            container.innerHTML = `<p class="no-results">❌ No matches found</p>
            <a class="no-results" href="/user/shop">Go To Product</a>
            `;
             pagination.innerHTML = "";
            return;
          }
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const pageProducts = filteredProducts.slice(start, end);

  function capitalizeWords(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  }

  container.innerHTML = pageProducts.map((p, idx) => {
  const discount = p.discount || 0;
  const finalPrice = Math.round(p.price || 0); // sale price
    const productName = capitalizeWords(p.name);

    let colorsHTML = "";
    if (p.colors && p.colors.length > 0) {
      colorsHTML = `
        <div class="colors">
          <strong>Colors:</strong>
          ${p.colors.map(c => `
            <span class="color-circle" style="background:${c};" title="${c}"></span>
          `).join("")}
        </div>
      `;
    } else {
      colorsHTML = `<div class="colors"><strong>Colors:</strong> Default Color</div>`;
    }

return `
  <div class="product-card">
    <div class="card-content">
      <div class="img-wrapper">
        <img src="${p.image}" alt="${p.name}">
        ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ""}
      </div>
      <h4 class="product-name">${productName}</h4>
      <div class="product-details">
        <strong>Details:</strong>
        ${(p.catalogues || []).map(c => {
          const [category, value] = c.split(" - ");
          return `${category}: ${value || category}`;
        }).join(", ")}
      </div>
      <p class="price">
        <span class="final-price">₹${finalPrice}</span>
        ${p.mrp ? `<span class="old-price">₹${p.mrp}</span>` : ''}
      </p>
      ${p.about ? `<p class="about">${p.about}</p>` : ""}
      ${colorsHTML}
      <div class="stock-status ${p.stockStatus === 'In Stock' ? 'in-stock' : 'out-of-stock'}">
        ${p.stockStatus === 'In Stock' ? '🟢 In Stock' : '🔴 Out of Stock'}
      </div>
    </div>

    <!-- Buttons always at bottom -->
    <div class="card-actions">
      <button class="view-btn"
          data-video="${p.description}"
          ${!p.description ? "disabled style='opacity:0.5; cursor:not-allowed;'" : ""}>
        PRODUCT VIDEO
      </button>
      <button class="cart-btn" data-idx="${idx}">ADD TO CART</button>
    </div>
  </div>
`;

  }).join("");

  // 👉 Attach event listeners here
  // Reattach buttons, pagination, etc.
  document.querySelectorAll(".cart-btn").forEach((btn, idx) => {
    btn.addEventListener("click", () => addToCart(pageProducts[idx]));
  });

  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => openVideo(btn.getAttribute("data-video")));
  });

  renderPagination();

  window.scrollTo({
    top: document.querySelector(".content").offsetTop,
    behavior: "smooth"
  });
}

// Open video modal
function openVideo(url) {
  const modal = document.getElementById("videoModal");
  const frame = document.getElementById("videoFrame");

  let embedUrl = "";

  if (url.includes("watch?v=")) {
    // long format: https://www.youtube.com/watch?v=VIDEOID
    embedUrl = url.replace("watch?v=", "embed/") + "?autoplay=1&mute=1";
  } else if (url.includes("youtu.be/")) {
    // short format: https://youtu.be/VIDEOID
    const videoId = url.split("youtu.be/")[1].split("?")[0];
    embedUrl = "https://www.youtube.com/embed/" + videoId + "?autoplay=1&mute=1";
  } else {
    embedUrl = url + "?autoplay=1&mute=1"; // fallback
  }

  frame.src = embedUrl;
  modal.style.display = "flex";
}

// Close video modal
function closeVideo() {
  const modal = document.getElementById("videoModal");
  const frame = document.getElementById("videoFrame");
  frame.src = ""; // stop video
  modal.style.display = "none";
}

document.querySelectorAll(".view-btn").forEach(btn => {
  btn.addEventListener("click", () => openVideo(btn.getAttribute("data-video")));
});


function getCart(){ return JSON.parse(localStorage.getItem("cart") || "[]"); }
function saveCart(c){ localStorage.setItem("cart", JSON.stringify(c)); }


// After adding to cart
// ...existing code...
async function addToCart(item) {
  const userRes = await fetch("/get-user");
  const user = await userRes.json();

  const res = await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.email,
      productId: item._id,
      name: item.name,
      image: item.image,
      price: item.price,
      discount:item.discount,
      colors:item.colors,
      qty: 1
    })
  });

  const data = await res.json();
  alert(data.message);

  // 👉 refresh cart count
  updateCartCount();
}

//page redirect for add to cart

document.getElementById("cartBtn").addEventListener("click", () => {
  window.location.href = "/user/cart"; // goes to your new cart page
});


function renderPagination() {
  const totalPages = Math.ceil(filteredProducts.length / perPage);
  const container = document.getElementById("pagination");
  container.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    container.innerHTML += `<button onclick="goToPage(${i})" ${i === currentPage ? "disabled" : ""}>${i}</button>`;
  }
}

function goToPage(page) {
  currentPage = page;
  renderProducts();

}