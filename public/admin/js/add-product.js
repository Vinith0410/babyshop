 function previewImage(event) {
    const reader = new FileReader();
    reader.onload = () => {
      const preview = document.getElementById("preview");
      preview.src = reader.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(event.target.files[0]);
  }

  function addColorField() {
  const div = document.createElement("div");
  div.innerHTML = `
    <input type="text" name="colors[]" placeholder="Enter color" />
    <button type="button" onclick="this.parentElement.remove()">Remove</button>
  `;
  document.getElementById("colorSection").appendChild(div);
}
  let cataloguesData = [];

  // Fetch catalogues + models
  async function fetchCatalogues() {
    const res = await fetch("/api/catalogues");
    cataloguesData = await res.json();
  }

  // Generate dropdowns
  async function generateModelSelectors() {
    if (cataloguesData.length === 0) await fetchCatalogues();

    const count = document.getElementById("modelCount").value;
    const container = document.getElementById("modelSelectors");
    container.innerHTML = ""; // clear old

    for (let i = 0; i < count; i++) {
      let select = document.createElement("select");
      select.name = "catalogues[]"; // important: array field
      select.className = "form-select mb-2";
      select.required = true;

      // Build options: catalogue - model
      cataloguesData.forEach(catalogue => {
        catalogue.models.forEach(model => {
          let option = document.createElement("option");
          option.value = `${catalogue.name} - ${model}`;
          option.textContent = `${catalogue.name} → ${model}`;
          select.appendChild(option);
        });
      });

      container.appendChild(select);
    }
  }

  // Load catalogues immediately
  fetchCatalogues();