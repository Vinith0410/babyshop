document.getElementById("cartBtn").addEventListener("click", () => {
  window.location.href = "/user/cart"; // goes to your new cart page
});

 document.getElementById("orderbtn").addEventListener("click", () => {
  window.location.href = "/user/orders"; // goes to your new cart page
});

const viewMoreBtn = document.getElementById("view-more");
if (viewMoreBtn) {
  viewMoreBtn.addEventListener("click", () => {
    window.location.href = "/user/shop";
  });
}

const shopallbtns = document.querySelectorAll(".shop-all-btn"); // note the dot for class
shopallbtns.forEach(btn => {
  btn.addEventListener("click", () => {
    window.location.href = "/user/shop";
  });
});

// add to cart number count
async function updateCartCount() {
  try {
    const userRes = await fetch("/get-user");
    const user = await userRes.json();

    const res = await fetch(`/api/cart/count?user=${encodeURIComponent(user.email)}`);
    const data = await res.json();

    const cartCount = document.getElementById("cartCount");
    if (data.count > 0) {
      cartCount.textContent = data.count;
      cartCount.style.display = "inline-block";
    } else {
      cartCount.style.display = "none";
    }
  } catch (err) {
    console.error("Error fetching cart count:", err);
  }
}

// add to cart content
// On page load
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
});

