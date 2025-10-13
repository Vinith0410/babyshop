function toggleMenu() {
    const navLinks = document.getElementById("navLinks");
    const hamburger = document.getElementById("hamburger").querySelector("i");

    navLinks.classList.toggle("show");

    if (navLinks.classList.contains("show")) {
      hamburger.classList.remove("fa-bars");
      hamburger.classList.add("fa-times"); // Close icon
    } else {
      hamburger.classList.remove("fa-times");
      hamburger.classList.add("fa-bars"); // Hamburger icon
    }
  }
