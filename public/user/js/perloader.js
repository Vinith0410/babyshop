// Save original fetch
const originalFetch = window.fetch;

// Track active fetch calls
let activeRequests = 0;

window.fetch = async (...args) => {
  if (activeRequests === 0) {
    document.getElementById("preloader").style.display = "flex";
    document.getElementById("main-content").style.display = "none";
  }

  activeRequests++;

  try {
    const response = await originalFetch(...args);
    return response;
  } catch (err) {
    throw err;
  } finally {
    activeRequests--;
    if (activeRequests === 0) {
      // All fetches done → show main content
      document.getElementById("preloader").style.display = "none";
      document.getElementById("main-content").style.display = "block";
    }
  }
};

