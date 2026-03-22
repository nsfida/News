let newsData = [];

/* =========================
   NEW VARIABLES (INFINITE SCROLL)
========================= */
let displayedNews = [];
let currentIndex = 0;
const loadStep = 6;

/* =========================
   ELEMENTS
========================= */
const newsGrid = document.getElementById("newsGrid");
const searchInput = document.getElementById("searchInput");
const expandedSection = document.getElementById("newsExpanded");
const expandedTitle = document.getElementById("expandedTitle");
const expandedDate = document.getElementById("expandedDate");
const expandedCategory = document.getElementById("expandedCategory");
const expandedImage = document.getElementById("expandedImage");
const expandedContent = document.getElementById("expandedContent");
const closeExpanded = document.getElementById("closeExpanded");
const navItems = document.querySelectorAll(".navbar li");
const breakingTicker = document.getElementById("breakingTicker");
const loader = document.getElementById("loader");

/* =========================
   FILES
========================= */
const files = [
  "https://livenews.live/World.json",
  "https://livenews.live/Politics.json",
  "https://livenews.live/Business.json",
  "https://livenews.live/Technology.json",
  "https://livenews.live/War.json",
  "https://livenews.live/Economy.json",
  "https://livenews.live/Energy.json"
];

/* =========================
   FETCH NEWS
========================= */
async function fetchNews() {
  try {
    const responses = await Promise.all(files.map(f => fetch(f)));
    const dataArrays = await Promise.all(responses.map(res => res.json()));
    newsData = dataArrays.flat();

    // Sort by date descending
    newsData.sort((a, b) => {
      const d1 = new Date(a.date.split("-").reverse().join("-"));
      const d2 = new Date(b.date.split("-").reverse().join("-"));
      return d2 - d1;
    });

    // NEW: prepare initial limited data
    prepareInitialNews();

    // Breaking ticker
    renderBreaking(newsData);

  } catch (err) {
    console.error("Error loading news JSON:", err);
    alert("Error loading news data. Please check JSON format.");
  }
}

/* =========================
   INITIAL LOAD (1 PER CATEGORY)
========================= */
function prepareInitialNews() {
  const seenCategories = new Set();
  displayedNews = [];

  for (let item of newsData) {
    const cat = item.category.toLowerCase();

    if (!seenCategories.has(cat)) {
      displayedNews.push(item);
      seenCategories.add(cat);
    }
  }

  currentIndex = displayedNews.length;

  renderNews(displayedNews);
}

/* =========================
   LOAD MORE (INFINITE SCROLL)
========================= */
function loadMoreNews() {
  if (currentIndex >= newsData.length) return;

  loader.style.display = "block";

  setTimeout(() => {
    const nextItems = newsData.slice(currentIndex, currentIndex + loadStep);

    displayedNews = displayedNews.concat(nextItems);
    currentIndex += loadStep;

    renderNews(displayedNews);

    loader.style.display = "none";
  }, 400);
}

/* =========================
   RENDER NEWS
========================= */
function renderNews(data) {
  newsGrid.innerHTML = "";

  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "news-card";

    // SAFE IMAGE HANDLING
    const images = (item.images && item.images.length > 0)
      ? item.images
      : [item.image];

    card.innerHTML = `
      <div class="news-image">
        <img src="${images[0]}" class="slider-img">
      </div>
      <div class="news-content">
        <div class="news-category">${item.category}</div>
        <div class="news-title">${item.title}</div>
        <div class="news-date">${item.date}</div>
      </div>
    `;

    /* IMAGE SLIDER */
    if (images.length > 1) {
      let index = 0;
      const imgEl = card.querySelector(".slider-img");

      setInterval(() => {
        index = (index + 1) % images.length;

        imgEl.style.opacity = 0;

        setTimeout(() => {
          imgEl.src = images[index];
          imgEl.style.opacity = 1;
        }, 200);

      }, 1500);
    }

    card.addEventListener("click", () => openExpanded(item));
    newsGrid.appendChild(card);
  });
}

/* =========================
   EXPANDED VIEW
========================= */
function openExpanded(item) {
  expandedTitle.innerText = item.title;
  expandedDate.innerText = item.date;
  expandedCategory.innerText = item.category;

  const images = (item.images && item.images.length > 0)
    ? item.images
    : [item.image];

  let index = 0;
  expandedImage.src = images[0];

  if (images.length > 1) {
    setInterval(() => {
      index = (index + 1) % images.length;
      expandedImage.src = images[index];
    }, 2000);
  }

  expandedContent.innerText = item.content;
  expandedSection.classList.add("active");
  document.body.style.overflow = "hidden";
}

/* =========================
   CLOSE EXPANDED
========================= */
function closeExpandedView() {
  expandedSection.classList.remove("active");
  document.body.style.overflow = "auto";
}

closeExpanded.addEventListener("click", closeExpandedView);

window.addEventListener("click", e => {
  if (e.target === expandedSection) closeExpandedView();
});

/* =========================
   SEARCH
========================= */
searchInput.addEventListener("input", e => {
  const value = e.target.value.toLowerCase();

  const filtered = newsData.filter(n =>
    n.title.toLowerCase().includes(value) ||
    n.category.toLowerCase().includes(value) ||
    n.content.toLowerCase().includes(value)
  );

  renderNews(filtered);
});

/* =========================
   CATEGORY FILTER
========================= */
navItems.forEach(item => {
  item.addEventListener("click", () => {
    navItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");

    const category = item.dataset.category.toLowerCase();

    if (category === "all") {
      renderNews(newsData);
    } else {
      const filtered = newsData.filter(n =>
        n.category.toLowerCase() === category
      );
      renderNews(filtered);
    }
  });
});

/* =========================
   BREAKING NEWS
========================= */
function renderBreaking(data) {
  breakingTicker.innerHTML = "";

  const latest = data.slice(0, 10);

  latest.forEach(n => {
    const span = document.createElement("span");
    span.innerText = n.title;
    breakingTicker.appendChild(span);
  });
}

/* =========================
   SCROLL LISTENER
========================= */
window.addEventListener("scroll", () => {
  const scrollBottom =
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;

  if (scrollBottom) {
    loadMoreNews();
  }
});

/* =========================
   AUTO REFRESH
========================= */
setInterval(fetchNews, 120000);

/* =========================
   INITIAL LOAD
========================= */
fetchNews();

/* =========================
   PROJECT MENU
========================= */
const projectsToggle = document.getElementById("projectsToggle");
const projectsDropdown = document.getElementById("projectsDropdown");

projectsToggle.addEventListener("click", () => {
  projectsDropdown.classList.toggle("active");
});

window.addEventListener("click", (e) => {
  if (!e.target.closest(".projects-menu-wrapper")) {
    projectsDropdown.classList.remove("active");
  }
});
