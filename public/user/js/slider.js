const slidesData = [
      {
  img: "./image/slide/baby-product.jpg",
  title: "Baby Products",
  text: "Explore our collection of baby essentials! Safe, colorful, and fun items for your little ones—from toys to accessories and clothes. Every product is carefully selected to ensure joy and safety.",
  button: "Shop Baby Products"
},{
  img: "./image/slide/car-product.jpg",
  title: "Car & Bike Toys",
  text: "For the little speedsters! Exciting collection of toy cars, bikes, and ride-on vehicles. Bring the thrill of adventure and playtime excitement to your children’s world.",
  button: "Shop Vehicles"
}
,
{
  img: "./image/slide/doll-teddy.jpg",
  title: "Dolls & Soft Toys",
  text: "From cuddly companions to creative dolls, discover toys that spark imagination and comfort. Perfect for every child who loves a friend to play and dream with.",
  button: "Shop Dolls"
}
,
{
  img: "./image/slide/wedding-gift.jpeg",
  title: "Wedding Gifts",
  text: "Celebrate special occasions with our curated wedding gift collection. Elegant, fun, and memorable presents for loved ones and friends to make their day extra special.",
  button: "Shop Wedding Gifts"
}
,
{
  img: "./image/slide/fun-mall.jpeg",
  title: "Fun Mall🎉",
  text: "Where fun never ends! Enjoy games, rides, entertainment, and shopping all under one roof. A perfect place for families to relax, play, and create happy memories together.",
  button: "Explore Fun Mall"
}
,{
  img: "./image/slide/therkadai.jpg",
  title: "Therkadai Special",
  text: "Play and shop together in our vibrant bazaar. From handcrafted toys to delicious snacks, every corner is full of excitement. Perfect for a fun outing with family and friends.",
  button: "Visit Therkadai"
}
    ];

    const slider = document.getElementById("slider");
    const dotsContainer = document.getElementById("dots");

    let currentIndex = 0;
    let timer;

    // Create slides
// Create slides
slidesData.forEach((slide, index) => {
  const slideDiv = document.createElement("div");
  slideDiv.classList.add("slide");
  if (index === 0) slideDiv.classList.add("active");
  slideDiv.style.backgroundImage = `url(${slide.img})`;

  slideDiv.innerHTML = `
    <div class="overlay">
      <h2>${slide.title}</h2>
      <p>${slide.text}</p>
      <button class="slide-btn">${slide.button}</button>
    </div>
  `;

  slider.appendChild(slideDiv);

  // dots
  const dot = document.createElement("div");
  dot.classList.add("dot");
  if (index === 0) dot.classList.add("active");
  dot.addEventListener("click", () => showSlide(index));
  dotsContainer.appendChild(dot);
});

// ✅ Add click redirect for all slide buttons
// Add click redirect for all slide buttons
document.querySelectorAll(".slide-btn").forEach((btn, index) => {
  btn.addEventListener("click", () => {
    if (index === slidesData.length - 1 || index === slidesData.length - 2) {
      // last 2 slides -> mall
      window.location.href = "/user/mall";
    } else {
      // others -> shop
      window.location.href = "/user/shop";
    }
  });
});


    const slides = document.querySelectorAll(".slide");
    const dots = document.querySelectorAll(".dot");

   function showSlide(index) {
  slides.forEach(slide => slide.classList.remove("active"));
  dots.forEach(dot => dot.classList.remove("active"));

  currentIndex = index;

  slides[currentIndex].classList.add("active");
  dots[currentIndex].classList.add("active");

  // Animate text
  const overlay = slides[currentIndex].querySelector(".overlay");
  overlay.classList.remove("animate");
  void overlay.offsetWidth;
  overlay.classList.add("animate");

  resetTimer();
}

    function nextSlide() {
      let nextIndex = (currentIndex + 1) % slides.length;
      showSlide(nextIndex);
    }

    function resetTimer() {
      clearInterval(timer);
      timer = setInterval(nextSlide, 5000);
    }

    // Start first animation
    document.querySelector(".overlay").classList.add("animate");
    resetTimer();


     const track = document.getElementById("carousel-track");
    const cards = track.children;
    let currentIndexfeed = 0;

    function updateCarousel() {
      for (let i = 0; i < cards.length; i++) {
        let offset = (i - currentIndexfeed + cards.length) % cards.length;

        if (offset === 0) {
          cards[i].style.transform = "translate(-50%, -50%) scale(1)";
          cards[i].style.zIndex = 3;
          cards[i].style.opacity = 1;
        } else if (offset === 1) {
          cards[i].style.transform = "translate(calc(-50% + 350px), -50%) scale(0.85)";
          cards[i].style.zIndex = 2;
          cards[i].style.opacity = 0.7;
        } else if (offset === cards.length - 1) {
          cards[i].style.transform = "translate(calc(-50% - 350px), -50%) scale(0.85)";
          cards[i].style.zIndex = 2;
          cards[i].style.opacity = 0.7;
        } else {
          cards[i].style.transform = "translate(-50%, -50%) scale(0.6)";
          cards[i].style.zIndex = 1;
          cards[i].style.opacity = 0;
        }
      }
    }

    function nextCard() {
      currentIndexfeed = (currentIndexfeed + 1) % cards.length;
      updateCarousel();
    }

    setInterval(nextCard, 4000); // slightly slower
    updateCarousel();

    // Tilt effect
document.querySelectorAll('.arrival-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * 8; // tilt intensity
    const rotateY = ((x - centerX) / centerX) * -8;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateX(0) rotateY(0)';
  });
});

    (function () {
      const scroller = document.getElementById('scroller');
      const viewport = document.getElementById('viewport');

      let rafId = null;
      let lastTime = null;
      let px = 0;
      const SPEED = 90; // px per sec

      function imagesLoadedPromise(container) {
        const imgs = Array.from(container.querySelectorAll('img'));
        if (!imgs.length) return Promise.resolve();
        return Promise.all(imgs.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(res => img.addEventListener('load', res, { once: true }));
        }));
      }

      async function init() {
        await imagesLoadedPromise(scroller);

        scroller.innerHTML += scroller.innerHTML;
        let groupWidth = scroller.scrollWidth / 2;

        function step(now) {
          if (!lastTime) lastTime = now;
          const dt = (now - lastTime) / 1000;
          lastTime = now;

          px += SPEED * dt;
          if (px >= groupWidth) px -= groupWidth;

          scroller.style.transform = `translateX(${-px}px)`;
          rafId = requestAnimationFrame(step);
        }

        rafId = requestAnimationFrame(step);

        viewport.addEventListener('mouseenter', () => {
          if (rafId) { cancelAnimationFrame(rafId); rafId = null; lastTime = null; }
        });
        viewport.addEventListener('mouseleave', () => {
          if (!rafId) rafId = requestAnimationFrame(step);
        });

        window.addEventListener('resize', () => {
          groupWidth = scroller.scrollWidth / 2;
          px = px % groupWidth;
        });
      }

      if (document.readyState === 'complete') {
        init();
      } else {
        window.addEventListener('load', init, { once: true });
      }
    })();