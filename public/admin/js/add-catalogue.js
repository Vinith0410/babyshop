  // Populate dropdown with existing catalogues
  fetch("/api/catalogues")
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById("catalogueSelect");
      data.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.name;
        option.textContent = cat.name;
        select.appendChild(option);
      });
    });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("success") === "1") {
    alert("Catalogue saved successfully ✅");
  }