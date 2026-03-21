let newsData = [];

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

const files = [
  "https://livenews.live/World.json",
  "https://livenews.live/Politics.json",
  "https://livenews.live/Business.json",
  "https://livenews.live/Technology.json",
  "https://livenews.live/War.json",
  "https://livenews.live/Economy.json",
  "https://livenews.live/Energy.json"
];

// Fetch multiple JSON files
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

    // Render news and breaking ticker
    renderNews(newsData);
    renderBreaking(newsData);
  } catch (err) {
    console.error("Error loading news JSON:", err);
  }
}

// Render news cards
function renderNews(data) {
  newsGrid.innerHTML = "";
  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "news-card";
    card.innerHTML = `
      <div class="news-image">
        <img src="${item.image}" alt="">
      </div>
      <div class="news-content">
        <div class="news-category">${item.category}</div>
        <div class="news-title">${item.title}</div>
        <div class="news-date">${item.date}</div>
      </div>
    `;
    card.addEventListener("click", () => openExpanded(item));
    newsGrid.appendChild(card);
  });
}

// Expanded view
function openExpanded(item) {
  expandedTitle.innerText = item.title;
  expandedDate.innerText = item.date;
  expandedCategory.innerText = item.category;
  expandedImage.src = item.image;
  expandedContent.innerText = item.content;
  expandedSection.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeExpandedView() {
  expandedSection.classList.remove("active");
  document.body.style.overflow = "auto";
}

closeExpanded.addEventListener("click", closeExpandedView);
window.addEventListener("click", e => {
  if (e.target === expandedSection) closeExpandedView();
});

// Search functionality
searchInput.addEventListener("input", e => {
  const value = e.target.value.toLowerCase();
  const filtered = newsData.filter(n =>
    n.title.toLowerCase().includes(value) ||
    n.category.toLowerCase().includes(value) ||
    n.content.toLowerCase().includes(value)
  );
  renderNews(filtered);
});

// Category filter
navItems.forEach(item => {
  item.addEventListener("click", () => {
    navItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");
    const category = item.dataset.category.toLowerCase();
    if (category === "all") {
      renderNews(newsData);
    } else {
      const filtered = newsData.filter(n => n.category.toLowerCase() === category);
      renderNews(filtered);
    }
  });
});

// Breaking news ticker
function renderBreaking(data) {
  breakingTicker.innerHTML = "";
  const latest = data.slice(0, 10); // top 10
  latest.forEach(n => {
    const span = document.createElement("span");
    span.innerText = n.title;
    breakingTicker.appendChild(span);
  });
}

// Auto refresh every 2 minutes
setInterval(fetchNews, 120000);

// Initial fetch
fetchNews();
