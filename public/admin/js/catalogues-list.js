 async function fetchCatalogues() {
    const res = await fetch("/api/catalogues");
    const catalogues = await res.json();
    const tbody = document.querySelector("#catalogueTable tbody");
    tbody.innerHTML = "";

    catalogues.forEach(cat => {
      const tr = document.createElement("tr");

      // Models column HTML with edit/delete for each model
      const modelsHTML = cat.models.map(model => `
        <span class="model-name" data-model="${model}">${model}</span>
        <button class="model-edit-btn model-btn" data-catalogue="${cat.name}" data-model="${model}">Edit</button>
        <button class="model-delete-btn model-btn" data-catalogue="${cat.name}" data-model="${model}">Delete</button>
      `).join(" ");

      tr.innerHTML = `
        <td>${cat.name}</td>
        <td>${modelsHTML}</td>
        <td>
          <button class="edit-btn" data-id="${cat._id}">Edit Catalogue</button>
          <button class="delete-btn" data-id="${cat._id}">Delete Catalogue</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Catalogue-level delete
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const tr = btn.closest("tr");
        const catalogueName = tr.children[0].textContent;
        if (confirm(`Delete catalogue "${catalogueName}" and all models?`)) {
          await fetch("/admin/remove-catalogue-model", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ catalogueName })
          });
          fetchCatalogues();
        }
      });
    });

    // Catalogue-level edit
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const tr = btn.closest("tr");
        const oldName = tr.children[0].textContent;
        const newName = prompt("Edit Catalogue Name:", oldName);
        if (!newName) return;
        await fetch("/admin/edit-catalogue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldName, newName })
        });
        fetchCatalogues();
      });
    });

    // Model-level edit
    document.querySelectorAll(".model-edit-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const oldModel = btn.getAttribute("data-model");
        const catalogueName = btn.getAttribute("data-catalogue");
        const newModel = prompt(`Edit model name "${oldModel}"`, oldModel);
        if (!newModel) return;
        await fetch("/admin/edit-catalogue-model", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ catalogueName, oldModel, newModel })
        });
        fetchCatalogues();
      });
    });

    // Model-level delete
    document.querySelectorAll(".model-delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const modelName = btn.getAttribute("data-model");
        const catalogueName = btn.getAttribute("data-catalogue");
        if (confirm(`Delete model "${modelName}" from catalogue "${catalogueName}"?`)) {
          await fetch("/admin/remove-catalogue-model", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ catalogueName, modelName })
          });
          fetchCatalogues();
        }
      });
    });
  }

  // Initial load
  fetchCatalogues();