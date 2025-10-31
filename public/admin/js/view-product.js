let allProducts = [];
let catalogues = new Set();

// Function to populate catalogue filter
function populateCatalogueFilter() {
  const select = document.getElementById('catalogueFilter');
  select.innerHTML = '<option value="">All Catalogues</option>';
  [...catalogues].sort().forEach(cat => {
    select.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
}

// Function to render a single product card
function renderProductCard(p) {
  const stockColor = p.stockStatus === "In Stock" ? "green" : "red";
  const stockText = p.stockStatus || "Status Unknown";

  const imageUrl = p.image ? p.image : '/image/shop/image/placeholder.png';

  return `
    <div class="product-card">
      <img src="${imageUrl}" alt="${p.name}" style="height:180px; object-fit:cover;">
      <h5>${p.name || "Unnamed Product"}</h5>
      <p class="product-price"><strong>MRP:</strong> <s>₹${p.mrp || 0}</s></p>
      <p class="product-price"><strong>Sale Price:</strong> ₹${p.price || 0} ${p.discount > 0 ? `<span style="color:green">(${p.discount}% OFF)</span>` : ''}</p>
      <p><strong>YouTube Link:</strong> ${p.description || "No YouTube Link"}</p>
      <p><strong>Description About the Product:</strong> ${p.about || "No description for this product"}</p>

      <h4>Catalogues:</h4>
      <div>
        ${(() => {
          const grouped = {};
          (p.catalogues || []).forEach(c => {
            const parts = c.split(" - ");
            const heading = parts[0] || "Category";
            const value = parts[1] || "";
            if (!grouped[heading]) grouped[heading] = [];
            grouped[heading].push(value);
          });
          return Object.keys(grouped)
            .map(heading => `
              <div><strong>${heading}:</strong> ${grouped[heading].join(", ")}</div>
            `)
            .join("");
        })()}
      </div>

      <p><strong>Colors:</strong>
        ${(p.colors && p.colors.length > 0)
          ? p.colors.join(", ")
          : "Default Product Color"}
      </p>

      <p><strong>Stock Status:</strong>
        <span style="color:${stockColor}; font-weight:bold;">${stockText}</span>
      </p>

      <div class="card-actions">
        <a class="btn" href="/admin/edit-product.html?id=${p._id}">Edit</a>
        <a class="btn" href="/admin/delete-product/${p._id}" onclick="return confirm('Are you sure you want to delete this product?')">Delete</a>
      </div>
    </div>
  `;
}

// Function to render products
function renderProducts(products) {
  const container = document.querySelector('.content-section');
  if (!products || products.length === 0) {
    container.innerHTML = "<p>No products available</p>";
    return;
  }

  container.innerHTML = `
    <div class="product-grid">
      ${products.map(renderProductCard).join("")}
    </div>
  `;
}

// Function to filter and render products
function filterAndRenderProducts() {
  const searchText = document.getElementById('searchInput').value.toLowerCase();
  const selectedCatalogue = document.getElementById('catalogueFilter').value;

  const filteredProducts = allProducts.filter(p => {
    const nameMatch = p.name.toLowerCase().includes(searchText);
    const catalogueMatch = !selectedCatalogue ||
      (p.catalogues || []).some(cat => cat.startsWith(selectedCatalogue + " -"));
    return nameMatch && catalogueMatch;
  });

  renderProducts(filteredProducts);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const catalogueFilter = document.getElementById('catalogueFilter');

  searchInput.addEventListener('input', filterAndRenderProducts);
  catalogueFilter.addEventListener('change', filterAndRenderProducts);
});

// Main fetch and render
fetch('/api/products')
  .then(res => {
    if (!res.ok) {
      throw new Error('Network response was not ok: ' + res.statusText);
    }
    return res.json();
  })
  .then(products => {
    if (!Array.isArray(products)) {
      throw new Error('Expected products array but got: ' + typeof products);
    }

    allProducts = products;

    // Extract unique catalogues
    catalogues.clear();
    products.forEach(p => {
      (p.catalogues || []).forEach(c => {
        const parts = c.split(" - ");
        const heading = parts[0] || "Category";
        catalogues.add(heading);
      });
    });

    populateCatalogueFilter();
    filterAndRenderProducts();
  })
  .catch(err => {
    console.error("Error fetching products:", err);
    document.querySelector('.content-section').innerHTML =
      `<p>Error loading products: ${err.message}</p>`;
  });