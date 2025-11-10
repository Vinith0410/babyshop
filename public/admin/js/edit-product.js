let cataloguesData = [];

  // Fetch catalogues
  async function fetchCatalogues() {
    const res = await fetch("/api/catalogues");
    cataloguesData = await res.json();
  }

  function addColorInput(value = "") {
  const container = document.getElementById("colorContainer");

  let wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.marginBottom = "8px";

  let input = document.createElement("input");
  input.type = "text";
  input.name = "colors[]";   // ✅ array field
  input.value = value;
  input.placeholder = "Enter color";
  input.className = "form-control";
  input.style.flex = "1";

  let removeBtn = document.createElement("span");
  removeBtn.textContent = " ×";
  removeBtn.style.cursor = "pointer";
  removeBtn.style.color = "red";
  removeBtn.style.fontWeight = "bold";
  removeBtn.style.marginLeft = "10px";
  removeBtn.onclick = () => wrapper.remove();

  wrapper.appendChild(input);
  wrapper.appendChild(removeBtn);
  container.appendChild(wrapper);
}

  // Generate a catalogue-model dropdown
// Generate a catalogue-model dropdown + close button
function generateModelSelector(value = "") {
  const container = document.getElementById("catalogueContainer");

  // wrapper div for select + close btn
  let wrapper = document.createElement("div");
  wrapper.className = "catalogue-select-wrapper";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.marginBottom = "8px";

  let select = document.createElement("select");
  select.name = "catalogues[]";
  select.className = "form-select";
  select.required = true;
  select.style.flex = "1";

  // Build options: catalogue → model
  cataloguesData.forEach(catalogue => {
    catalogue.models.forEach(model => {
      let option = document.createElement("option");
      option.value = `${catalogue.name} - ${model}`;
      option.textContent = `${catalogue.name} → ${model}`;

      if (value && option.value === value) {
        option.selected = true;
      }

      select.appendChild(option);
    });
  });

  // ❌ close button
  let removeBtn = document.createElement("span");
  removeBtn.textContent = " ×";
  removeBtn.style.cursor = "pointer";
  removeBtn.style.color = "red";
  removeBtn.style.fontWeight = "bold";
  removeBtn.style.marginLeft = "10px";
  removeBtn.onclick = async () => {
    const [catalogueName, modelName] = select.value.split(" - ");
    if (!confirm(`Remove model "${modelName}" from catalogue "${catalogueName}"?`)) return;

    try {
      const res = await fetch("/admin/remove-catalogue-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogueName, modelName })
      });
      const data = await res.json();

      if (data.success) {
        alert("Model removed ✅");
        wrapper.remove(); // remove select+btn from DOM
      } else {
        alert("Error: " + (data.error || "Failed to remove model"));
      }
    } catch (err) {
      alert("Request failed ❌");
    }
  };

  wrapper.appendChild(select);
  wrapper.appendChild(removeBtn);
  container.appendChild(wrapper);
}

  const urlParams = new URLSearchParams(window.location.search);
  const form = document.getElementById('editForm');
  const productId = urlParams.get('id');

  // Load product + catalogues
async function loadProduct() {
  try {
    if (cataloguesData.length === 0) await fetchCatalogues();

    const res = await fetch(`/api/products/${productId}`);
    const data = await res.json();

    document.getElementById('productId').value = data._id;
    document.getElementById('name').value = data.name;
  document.getElementById('price').value = data.price;
  document.getElementById('mrp').value = data.mrp || '';
    document.getElementById('description').value = data.description ;
    document.getElementById('about').value = data.about;

    document.getElementById('currentImage').src = data.image;
    document.getElementById('stockStatus').value = data.stockStatus || "In Stock";

  // Delivery charge
  const dcEl = document.getElementById('deliveryCharge');
  if (dcEl) dcEl.value = typeof data.deliveryCharge !== 'undefined' ? data.deliveryCharge : 0;

    // Catalogues
    const container = document.getElementById("catalogueContainer");
    container.innerHTML = "";
    if (data.catalogues && data.catalogues.length) {
      data.catalogues.forEach(c => generateModelSelector(c));
    } else {
      generateModelSelector();
    }

    // ✅ Colors
    const colorContainer = document.getElementById("colorContainer");
    colorContainer.innerHTML = "";
    if (data.colors && data.colors.length) {
      data.colors.forEach(color => addColorInput(color));
    } else {
      addColorInput();
    }

    // Form action
    form.action = `/admin/edit-product/${data._id}`;

  } catch (err) {
    console.error("Error fetching product:", err);
    alert("Failed to load product details.");
  }
}

  loadProduct();