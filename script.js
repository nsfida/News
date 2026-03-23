let newsData = [];
let filteredNews = [];
let displayedNews = [];
let currentIndex = 0;
let currentCategory = "all";
const loadStep = 6;

const newsGrid = document.getElementById("newsGrid");
const searchInput = document.getElementById("searchInput");
const expandedSection = document.getElementById("newsExpanded");
const expandedContainer = document.getElementById("expandedContainer");
const expandedTitle = document.getElementById("expandedTitle");
const expandedDate = document.getElementById("expandedDate");
const expandedCategory = document.getElementById("expandedCategory");
const expandedImage = document.getElementById("expandedImage");
const expandedContent = document.getElementById("expandedContent");
const closeExpanded = document.getElementById("closeExpanded");
const navItems = document.querySelectorAll(".navbar li");
const breakingTicker = document.getElementById("breakingTicker");
const loader = document.getElementById("loader");
const searchToggle = document.getElementById("searchToggle");
const searchWrapper = document.querySelector(".search-wrapper");
const jumpDateBtn = document.getElementById("jumpDateBtn");
const datePicker = document.getElementById("datePicker");

const files = [
    "https://livenews.live/World.json",
    "https://livenews.live/Politics.json",
    "https://livenews.live/Business.json",
    "https://livenews.live/Technology.json",
    "https://livenews.live/War.json",
    "https://livenews.live/Economy.json",
    "https://livenews.live/Energy.json"
];

/* UNIQUE SHORT HASH (6 CHAR) */
function generateHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36).substring(0, 6); // Short 6-character hash
}

/* SLUG (optional, kept for internal use) */
function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/* FETCH ALL NEWS */
async function fetchNews() {
    try {
        const responses = await Promise.all(files.map(f => fetch(f)));
        const dataArrays = await Promise.all(responses.map(res => res.json()));
        newsData = dataArrays.flat();

        newsData.forEach(n => {
            n.slug = slugify(n.title);
            n.hash = generateHash(n.title);  // short hash
            n.urlId = n.hash;                // only hash in URL
        });

        // Sort news by date descending
        newsData.sort((a, b) => new Date(b.date.split("-").reverse().join("-")) - new Date(a.date.split("-").reverse().join("-")));

        applyFilters();
        renderBreaking(newsData);
        openNewsFromURL();
    } catch (err) {
        console.error(err);
        alert("Error loading news data.");
    }
}

/* APPLY FILTERS */
function applyFilters() {
    let temp = [...newsData];

    if (currentCategory !== "all") {
        temp = temp.filter(n => n.category.toLowerCase() === currentCategory);
    }

    const searchValue = searchInput.value.toLowerCase();
    if (searchValue) {
        temp = temp.filter(n =>
            n.title.toLowerCase().includes(searchValue) ||
            n.category.toLowerCase().includes(searchValue) ||
            n.content.toLowerCase().includes(searchValue)
        );
    }

    if (datePicker.value) {
        const selected = datePicker.value.split("-").reverse().join("-");
        temp = temp.filter(n => n.date === selected);
    }

    filteredNews = temp;
    resetAndRender();
}

/* RESET & RENDER */
function resetAndRender() {
    displayedNews = [];
    currentIndex = 0;
    newsGrid.innerHTML = "";
    loadMoreNews();
}

/* LOAD MORE NEWS */
function loadMoreNews() {
    if (currentIndex >= filteredNews.length) return;

    loader.style.display = "block";

    setTimeout(() => {
        const nextItems = filteredNews.slice(currentIndex, currentIndex + loadStep);
        displayedNews = displayedNews.concat(nextItems);
        currentIndex += loadStep;

        renderNews(displayedNews);

        loader.style.display = "none";
    }, 300);
}

/* RENDER NEWS CARDS */
function renderNews(data) {
    newsGrid.innerHTML = "";

    data.forEach(item => {
        const card = document.createElement("div");
        card.className = "news-card";

        const images = (item.images && item.images.length > 0) ? item.images : [item.image];

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
            }, 1800);
        }

        /* CLICK TO OPEN EXPANDED */
        card.addEventListener("click", () => {
            openExpanded(item, card);
        });

        newsGrid.appendChild(card);
    });
}

/* EXPANDED VIEW */
function openExpanded(item, card) {
    expandedTitle.innerText = item.title;
    expandedDate.innerText = item.date;
    expandedCategory.innerText = item.category;

    const images = (item.images && item.images.length > 0) ? item.images : [item.image];

    let index = 0;
    expandedImage.src = images[0];

    if (images.length > 1) {
        setInterval(() => {
            index = (index + 1) % images.length;
            expandedImage.src = images[index];
        }, 2000);
    }

    expandedContent.innerText = item.content;

    const rect = card.getBoundingClientRect();
    expandedContainer.style.transform = `translate(${rect.left}px, ${rect.top}px) scale(0.3)`;
    expandedContainer.style.opacity = "0";

    expandedSection.classList.add("active");

    setTimeout(() => {
        expandedContainer.style.transform = "translate(0,0) scale(1)";
        expandedContainer.style.opacity = "1";
    }, 50);

    document.body.style.overflow = "hidden";

    /* SHORT URL ONLY */
    window.history.replaceState({}, "", `?news=${item.urlId}`);
}

/* CLOSE EXPANDED */
function closeExpandedView() {
    expandedSection.classList.remove("active");
    document.body.style.overflow = "auto";
}

closeExpanded.addEventListener("click", closeExpandedView);
window.addEventListener("click", e => {
    if (e.target === expandedSection) closeExpandedView();
});

/* NAV FILTER */
navItems.forEach(item => {
    item.addEventListener("click", () => {
        navItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        currentCategory = item.dataset.category.toLowerCase();
        applyFilters();
    });
});

/* SEARCH */
searchInput.addEventListener("input", applyFilters);

/* SEARCH TOGGLE */
searchToggle.addEventListener("click", () => {
    searchWrapper.classList.toggle("active");
    searchInput.focus();
});

/* DATE PICKER */
jumpDateBtn.addEventListener("click", () => {
    document.querySelector(".jump-date-wrapper").classList.toggle("active");
    datePicker.focus();
});
datePicker.addEventListener("change", applyFilters);

/* BREAKING NEWS TICKER */
function renderBreaking(data) {
    breakingTicker.innerHTML = "";
    data.slice(0, 10).forEach(n => {
        const span = document.createElement("span");
        span.innerText = n.title;
        breakingTicker.appendChild(span);
    });
}

/* INFINITE SCROLL */
window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 120) {
        loadMoreNews();
    }
});

/* PROJECTS MENU */
const projectsToggle = document.getElementById("projectsToggle");
const projectsDropdown = document.getElementById("projectsDropdown");

projectsToggle.addEventListener("click", () => {
    projectsDropdown.classList.toggle("active");
});

window.addEventListener("click", e => {
    if (!e.target.closest(".projects-menu-wrapper")) {
        projectsDropdown.classList.remove("active");
    }
});

/* OPEN NEWS FROM URL */
function openNewsFromURL() {
    const params = new URLSearchParams(window.location.search);
    const newsId = params.get("news");
    if (!newsId) return;

    const newsItem = newsData.find(n => n.urlId === newsId);
    if (newsItem) {
        openExpanded(newsItem, document.createElement("div"));
    }
}

/* AUTO REFRESH NEWS EVERY 2 MINUTES */
setInterval(fetchNews, 120000);
fetchNews();
