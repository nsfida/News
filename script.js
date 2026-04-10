/* ════════════════════════════════════════════════════════════
   LIVENEWS — script.js
   Powered by Nadeem Shahzad Fida
   ════════════════════════════════════════════════════════════ */

'use strict';

/* ─── STATE ───────────────────────────────────────────────── */
let allNews       = [];   // raw merged data
let filteredNews  = [];   // after category/search/date filter
let renderedCount = 0;
let currentCategory = 'all';
let isLoading     = false;
let isDark        = false;
let articleImages = [];   // images for current open article
let articleImgIdx = 0;    // current image index
let imgSliderTimer = null;
const LOAD_STEP   = 8;

/* ─── JSON SOURCES ────────────────────────────────────────── */
const DATA_FILES = [
  'https://livenews.live/World.json',
  'https://livenews.live/Politics.json',
  'https://livenews.live/Business.json',
  'https://livenews.live/Technology.json',
  'https://livenews.live/War.json',
  'https://livenews.live/Economy.json',
  'https://livenews.live/Energy.json',
];

/* ─── CATEGORY CONFIG ─────────────────────────────────────── */
const CAT_CONFIG = {
  all:        { label: 'All News',     icon: 'fa-house-chimney',    color: '#c0392b' },
  war:        { label: 'US-IRAN',      icon: 'fa-explosion',        color: '#e74c3c' },
  world:      { label: 'World',        icon: 'fa-globe',            color: '#2980b9' },
  politics:   { label: 'Politics',     icon: 'fa-landmark',         color: '#8e44ad' },
  business:   { label: 'Business',     icon: 'fa-briefcase',        color: '#27ae60' },
  technology: { label: 'Technology',   icon: 'fa-microchip',        color: '#2471a3' },
  economy:    { label: 'Economy',      icon: 'fa-chart-line',       color: '#d35400' },
  energy:     { label: 'Energy',       icon: 'fa-bolt',             color: '#f39c12' },
};

/* ─── DOM REFS ────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const newsGrid         = $('newsGrid');
const feedHero         = $('feedHero');
const loader           = $('loader');
const feedEnd          = $('feedEnd');
const feedCount        = $('feedCount');
const breakingTicker   = $('breakingTicker');
const searchInput      = $('searchInput');
const searchBar        = document.querySelector('.search-bar');
const searchClear      = $('searchClear');
const datePicker       = $('datePicker');
const datePopup        = $('datePopup');
const jumpDateBtn      = $('jumpDateBtn');
const clearDateBtn     = $('clearDate');
const themeToggle      = $('themeToggle');
const themeIcon        = $('themeIcon');
const articleOverlay   = $('articleOverlay');
const articleModal     = $('articleModal');
const expandedTitle    = $('expandedTitle');
const expandedDate     = document.querySelector('#expandedDate span');
const expandedCategory = $('expandedCategory');
const expandedImage    = $('expandedImage');
const expandedContent  = $('expandedContent');
const closeExpanded    = $('closeExpanded');
const imgPrev          = $('imgPrev');
const imgNext          = $('imgNext');
const imgCounter       = $('imgCounter');
const articleTags      = $('articleTags');
const shareBtn         = $('shareBtn');
const bookmarkBtn      = $('bookmarkBtn');
const projectsToggle   = $('projectsToggle');
const projectsDropdown = $('projectsDropdown');
const dateCtrl         = $('dateCtrl');
const trendingList     = $('trendingList');
const latestList       = $('latestList');
const sidebarCategories= $('sidebarCategories');
const toast            = $('toast');
const breakingClose    = $('breakingClose');
const viewGrid         = $('viewGrid');
const viewList         = $('viewList');
const mbnSearch        = $('mbnSearch');
const mobileSearchOverlay = $('mobileSearchOverlay');
const mobileSearchInput= $('mobileSearchInput');
const msoClose         = $('msoClose');
const navScrollRight   = $('navScrollRight');
const categoryList     = $('categoryList');

/* ─── UTILS ───────────────────────────────────────────────── */

/** Simple 6-char hash from string */
function generateHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36).substring(0, 6);
}

/** Parse various date formats to JS Date */
function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  // DD-MM-YYYY
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length <= 2) {
    return new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`);
  }
  return new Date(dateStr);
}

/** Format date for display */
function formatDate(dateStr) {
  const d = parseDate(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Time ago */
function timeAgo(dateStr) {
  const d   = parseDate(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateStr);
}

/** Category colour lookup */
function catColor(cat) {
  const c = (cat || '').toLowerCase();
  return (CAT_CONFIG[c] || CAT_CONFIG.all).color;
}

/** Category CSS class suffix */
function catClass(cat) {
  const c = (cat || '').toLowerCase();
  return `cat-color-${c}`;
}

/** Get images array from item */
function getImages(item) {
  if (item.images && item.images.length) return item.images;
  if (item.image) return [item.image];
  return ['https://via.placeholder.com/600x400/1a1d23/444?text=No+Image'];
}

/** Show toast notification */
function showToast(msg, duration = 2500) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/** Debounce */
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/* ─── THEME ───────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('ln-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  isDark = saved ? saved === 'dark' : prefersDark;
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  themeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

themeToggle.addEventListener('click', () => {
  isDark = !isDark;
  localStorage.setItem('ln-theme', isDark ? 'dark' : 'light');
  applyTheme();
  showToast(isDark ? '🌙 Dark mode on' : '☀️ Light mode on');
});

/* ─── BREAKING NEWS TICKER ────────────────────────────────── */
function renderBreaking(data) {
  breakingTicker.innerHTML = '';
  const items = data.slice(0, 12);
  items.forEach(n => {
    const span = document.createElement('span');
    span.className = 'tick-item';
    span.textContent = n.title;
    span.addEventListener('click', () => openArticle(n));
    breakingTicker.appendChild(span);
  });

  // Clone for seamless loop
  const clone = breakingTicker.cloneNode(true);
  clone.querySelectorAll('.tick-item').forEach((el, i) => {
    el.addEventListener('click', () => openArticle(items[i % items.length]));
  });
  breakingTicker.parentElement.appendChild(clone);
}

breakingClose.addEventListener('click', () => {
  $('breakingBar').style.display = 'none';
  document.documentElement.style.setProperty('--breaking-h', '0px');
});

/* ─── FETCH NEWS ──────────────────────────────────────────── */
async function fetchNews() {
  showSkeletons();
  try {
    const responses  = await Promise.all(DATA_FILES.map(url => fetch(url)));
    const dataArrays = await Promise.all(
      responses.map(res => res.ok ? res.json() : [])
    );
    allNews = dataArrays.flat().filter(Boolean);

    // Normalize & enrich
    allNews.forEach(item => {
      item.hash  = generateHash(item.title || '');
      item.urlId = item.hash;
      item._date = parseDate(item.date);
    });

    // Sort newest first
    allNews.sort((a, b) => b._date - a._date);

    renderSidebars();
    renderBreaking(allNews);
    applyFilters();
    openNewsFromURL();

  } catch (err) {
    console.error('LiveNews fetch error:', err);
    newsGrid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-muted);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:40px; margin-bottom:14px; display:block; color:var(--accent);"></i>
        <p style="font-weight:600; margin-bottom:6px;">Unable to load news</p>
        <p style="font-size:13px;">Please check your connection and try again.</p>
        <button onclick="fetchNews()" style="margin-top:16px; background:var(--accent); color:#fff; border:none; padding:9px 22px; border-radius:99px; font-weight:600; cursor:pointer; font-size:13px;">Retry</button>
      </div>`;
  }
}

function showSkeletons() {
  newsGrid.innerHTML = Array.from({ length: 6 }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-text" style="margin-top:14px;"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text short"></div>
      <div class="skeleton skeleton-text shorter" style="margin-bottom:14px;"></div>
    </div>`).join('');
}

/* ─── SIDEBAR WIDGETS ─────────────────────────────────────── */
function renderSidebars() {
  // Trending (first 7)
  trendingList.innerHTML = allNews.slice(0, 7).map((item, i) => `
    <li class="trending-item" data-hash="${item.hash}">
      <span class="trending-num">${i + 1}</span>
      <span class="trending-text">${escHtml(item.title)}</span>
    </li>`).join('');

  trendingList.querySelectorAll('.trending-item').forEach(el => {
    el.addEventListener('click', () => {
      const item = allNews.find(n => n.hash === el.dataset.hash);
      if (item) openArticle(item);
    });
  });

  // Category pills
  sidebarCategories.innerHTML = Object.entries(CAT_CONFIG)
    .filter(([k]) => k !== 'all')
    .map(([key, cfg]) => `
      <button class="cat-pill" data-cat="${key}"
        style="color:${cfg.color}; border-color:${cfg.color}33; background:${cfg.color}14;"
        onclick="filterByCategory('${key}')">
        <i class="fa-solid ${cfg.icon}" style="margin-right:5px;"></i>${cfg.label}
      </button>`).join('');

  // Latest (sidebar right — 6 items)
  const latest = allNews.slice(0, 8);
  latestList.innerHTML = latest.map(item => {
    const imgs = getImages(item);
    return `
    <div class="latest-item" data-hash="${item.hash}">
      <img class="latest-thumb" src="${imgs[0]}" alt="" loading="lazy" onerror="this.src='https://via.placeholder.com/60x50/1a1d23/444'">
      <div class="latest-info">
        <div class="latest-title">${escHtml(item.title)}</div>
        <div class="latest-date">${timeAgo(item.date)}</div>
      </div>
    </div>`;
  }).join('');

  latestList.querySelectorAll('.latest-item').forEach(el => {
    el.addEventListener('click', () => {
      const item = allNews.find(n => n.hash === el.dataset.hash);
      if (item) openArticle(item);
    });
  });
}

/* ─── FILTER LOGIC ────────────────────────────────────────── */
function applyFilters() {
  let result = [...allNews];

  // Category
  if (currentCategory !== 'all') {
    result = result.filter(n =>
      (n.category || '').toLowerCase() === currentCategory
    );
  }

  // Search
  const q = searchInput.value.trim().toLowerCase();
  if (q) {
    result = result.filter(n =>
      (n.title    || '').toLowerCase().includes(q) ||
      (n.content  || '').toLowerCase().includes(q) ||
      (n.category || '').toLowerCase().includes(q)
    );
  }

  // Date
  if (datePicker.value) {
    const picked = datePicker.value; // YYYY-MM-DD
    result = result.filter(n => {
      const d = n._date;
      if (!d || isNaN(d)) return false;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}` === picked;
    });
  }

  filteredNews = result;
  renderedCount = 0;
  newsGrid.innerHTML = '';
  feedEnd.style.display = 'none';

  // Update count
  feedCount.innerHTML = `Showing <strong>${filteredNews.length}</strong> stories`;

  // Feed hero (show top story)
  if (filteredNews.length > 0) {
    renderHero(filteredNews[0]);
  } else {
    feedHero.classList.remove('visible');
    feedHero.innerHTML = '';
  }

  loadMore();
}

/* ─── HERO ────────────────────────────────────────────────── */
function renderHero(item) {
  const imgs = getImages(item);
  feedHero.innerHTML = `
    <img class="feed-hero-img" src="${imgs[0]}" alt="${escAttr(item.title)}" loading="eager" onerror="this.src='https://via.placeholder.com/1200x400/1a1d23/555'">
    <div class="feed-hero-overlay">
      <span class="hero-cat">${escHtml(item.category || 'News')}</span>
      <h2 class="hero-title">${escHtml(item.title)}</h2>
      <div class="hero-meta">${formatDate(item.date)}</div>
    </div>`;
  feedHero.classList.add('visible');
  feedHero.onclick = () => openArticle(item);
}

/* ─── LOAD MORE ───────────────────────────────────────────── */
function loadMore() {
  if (isLoading) return;
  if (renderedCount >= filteredNews.length) {
    loader.classList.remove('active');
    if (renderedCount > 0) feedEnd.style.display = '';
    return;
  }

  isLoading = true;
  loader.classList.add('active');

  // Tiny delay for UX
  setTimeout(() => {
    // Skip index 0 (shown in hero) only on first load + "all" / single-cat view without search
    const startFrom = (renderedCount === 0 && filteredNews.length > 1 &&
                       !searchInput.value.trim() && !datePicker.value)
                      ? 1 : renderedCount;
    const items = filteredNews.slice(
      renderedCount === 0 ? startFrom : renderedCount,
      (renderedCount === 0 ? startFrom : renderedCount) + LOAD_STEP
    );

    items.forEach((item, idx) => {
      const card = createCard(item, idx, renderedCount === 0 && idx === 0 && startFrom === 1);
      newsGrid.appendChild(card);
    });

    renderedCount = (renderedCount === 0 ? startFrom : renderedCount) + items.length;

    loader.classList.remove('active');
    isLoading = false;

    if (renderedCount >= filteredNews.length) {
      feedEnd.style.display = '';
    }
  }, 180);
}

/* ─── CREATE CARD ─────────────────────────────────────────── */
function createCard(item, idx, isFeatured) {
  const imgs   = getImages(item);
  const catKey = (item.category || '').toLowerCase();
  const cat    = CAT_CONFIG[catKey] || CAT_CONFIG.all;

  const card = document.createElement('div');
  card.className = `news-card fade-in${isFeatured ? ' featured' : ''}`;
  card.style.animationDelay = `${Math.min(idx * 0.04, 0.3)}s`;

  const dotsHtml = imgs.length > 1
    ? `<div class="img-dots">${imgs.map((_,i) => `<span class="img-dot${i===0?' active':''}"></span>`).join('')}</div>`
    : '';

  card.innerHTML = `
    <div class="card-img-wrap">
      <span class="card-cat ${catClass(item.category)}">${escHtml(item.category || 'News')}</span>
      <img src="${imgs[0]}" alt="${escAttr(item.title)}" loading="lazy"
           class="card-img-fade"
           onerror="this.src='https://via.placeholder.com/600x400/1a1d23/444?text=No+Image'">
      ${dotsHtml}
    </div>
    <div class="card-body">
      <h3 class="card-title">${escHtml(item.title)}</h3>
      <div class="card-footer">
        <span class="card-date">
          <i class="fa-regular fa-clock"></i>
          ${timeAgo(item.date)}
        </span>
        <span class="card-read-more">
          Read <i class="fa-solid fa-arrow-right" style="font-size:10px;"></i>
        </span>
      </div>
    </div>`;

  // Lazy image load → fade in
  const imgEl = card.querySelector('img');
  imgEl.addEventListener('load', () => {
    imgEl.classList.remove('card-img-fade');
    imgEl.classList.add('card-img-loaded');
  });

  // Image slider for multi-image cards
  if (imgs.length > 1) {
    const dots = card.querySelectorAll('.img-dot');
    let sliderIdx = 0;
    setInterval(() => {
      sliderIdx = (sliderIdx + 1) % imgs.length;
      imgEl.style.opacity = '0';
      setTimeout(() => {
        imgEl.src = imgs[sliderIdx];
        imgEl.style.opacity = '1';
        dots.forEach((d, i) => d.classList.toggle('active', i === sliderIdx));
      }, 250);
    }, 2200);
  }

  card.addEventListener('click', () => openArticle(item));

  return card;
}

/* ─── OPEN ARTICLE ────────────────────────────────────────── */
function openArticle(item) {
  const imgs = getImages(item);
  articleImages = imgs;
  articleImgIdx = 0;

  // Populate
  expandedTitle.textContent = item.title || '';
  expandedDate.textContent  = formatDate(item.date);
  expandedCategory.textContent = (item.category || 'News').toUpperCase();
  expandedCategory.style.background = catColor(item.category);
  expandedContent.textContent = item.content || 'No content available.';
  expandedImage.src = imgs[0];
  expandedImage.alt = item.title;

  // Image navigation
  const hasMultiple = imgs.length > 1;
  imgPrev.style.display = hasMultiple ? '' : 'none';
  imgNext.style.display = hasMultiple ? '' : 'none';
  renderImgCounter();

  // Tags (category + words from title)
  const words = (item.title || '').split(' ').filter(w => w.length > 5).slice(0, 4);
  const tagList = [item.category, ...words].filter(Boolean);
  articleTags.innerHTML = tagList.map(t =>
    `<span class="article-tag">#${escHtml(t.replace(/[^a-zA-Z0-9]/g, ''))}</span>`
  ).join('');

  // URL
  window.history.replaceState({}, '', `?news=${item.urlId}`);

  // Open overlay
  articleOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  articleModal.scrollTop = 0;

  // Bookmark state
  const bookmarks = getBookmarks();
  bookmarkBtn.classList.toggle('active', bookmarks.includes(item.hash));

  // Share btn
  shareBtn.onclick = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: item.title, url });
    } else {
      navigator.clipboard?.writeText(url);
      showToast('🔗 Link copied to clipboard');
    }
  };

  // Bookmark btn
  bookmarkBtn.onclick = () => toggleBookmark(item);

  // Start auto-slide for article images
  clearInterval(imgSliderTimer);
  if (hasMultiple) {
    imgSliderTimer = setInterval(() => changeArticleImg(1), 3000);
  }
}

function closeArticleView() {
  articleOverlay.classList.remove('open');
  document.body.style.overflow = '';
  clearInterval(imgSliderTimer);
  window.history.replaceState({}, '', window.location.pathname);
}

function changeArticleImg(dir) {
  articleImgIdx = (articleImgIdx + dir + articleImages.length) % articleImages.length;
  expandedImage.style.opacity = '0';
  setTimeout(() => {
    expandedImage.src = articleImages[articleImgIdx];
    expandedImage.style.opacity = '1';
    renderImgCounter();
  }, 220);
  // Reset timer on manual nav
  clearInterval(imgSliderTimer);
  imgSliderTimer = setInterval(() => changeArticleImg(1), 3000);
}

function renderImgCounter() {
  imgCounter.innerHTML = articleImages.map((_, i) =>
    `<span class="img-counter-dot${i === articleImgIdx ? ' active' : ''}" data-i="${i}"></span>`
  ).join('');
  imgCounter.querySelectorAll('.img-counter-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      articleImgIdx = +dot.dataset.i;
      expandedImage.src = articleImages[articleImgIdx];
      renderImgCounter();
    });
  });
}

closeExpanded.addEventListener('click', closeArticleView);
articleOverlay.addEventListener('click', e => {
  if (e.target === articleOverlay) closeArticleView();
});
imgPrev.addEventListener('click', () => changeArticleImg(-1));
imgNext.addEventListener('click', () => changeArticleImg(1));

/* Keyboard navigation */
document.addEventListener('keydown', e => {
  if (!articleOverlay.classList.contains('open')) return;
  if (e.key === 'Escape')       closeArticleView();
  if (e.key === 'ArrowLeft')    changeArticleImg(-1);
  if (e.key === 'ArrowRight')   changeArticleImg(1);
});

/* ─── BOOKMARKS ───────────────────────────────────────────── */
function getBookmarks() {
  try { return JSON.parse(localStorage.getItem('ln-bookmarks') || '[]'); }
  catch { return []; }
}

function toggleBookmark(item) {
  let bookmarks = getBookmarks();
  if (bookmarks.includes(item.hash)) {
    bookmarks = bookmarks.filter(h => h !== item.hash);
    bookmarkBtn.classList.remove('active');
    showToast('Bookmark removed');
  } else {
    bookmarks.push(item.hash);
    bookmarkBtn.classList.add('active');
    showToast('📌 Bookmarked!');
  }
  localStorage.setItem('ln-bookmarks', JSON.stringify(bookmarks));
}

/* ─── SEARCH ──────────────────────────────────────────────── */
const debouncedFilter = debounce(applyFilters, 300);

searchInput.addEventListener('input', () => {
  const v = searchInput.value.trim();
  searchBar.classList.toggle('has-value', v.length > 0);
  debouncedFilter();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchBar.classList.remove('has-value');
  applyFilters();
  searchInput.focus();
});

mobileSearchInput.addEventListener('input', debounce(() => {
  searchInput.value = mobileSearchInput.value;
  searchBar.classList.toggle('has-value', mobileSearchInput.value.length > 0);
  applyFilters();
}, 300));

mbnSearch.addEventListener('click', () => {
  mobileSearchOverlay.classList.add('open');
  mobileSearchInput.focus();
});

msoClose.addEventListener('click', () => {
  mobileSearchOverlay.classList.remove('open');
  mobileSearchInput.value = '';
  searchInput.value = '';
  searchBar.classList.remove('has-value');
  applyFilters();
});

/* ─── CATEGORY NAV ────────────────────────────────────────── */
function filterByCategory(cat) {
  currentCategory = cat;

  // Desktop nav
  $$('.cat-item').forEach(el => {
    el.classList.toggle('active', el.dataset.category === cat);
  });

  // Mobile bottom nav
  $$('.mbn-btn[data-category]').forEach(el => {
    el.classList.toggle('active', el.dataset.category === cat);
  });

  applyFilters();
}

$$('.cat-item').forEach(el => {
  el.addEventListener('click', () => filterByCategory(el.dataset.category));
});

$$('.mbn-btn[data-category]').forEach(el => {
  el.addEventListener('click', () => filterByCategory(el.dataset.category));
});

navScrollRight.addEventListener('click', () => {
  categoryList.scrollBy({ left: 160, behavior: 'smooth' });
});

/* ─── DATE PICKER ─────────────────────────────────────────── */
jumpDateBtn.addEventListener('click', e => {
  e.stopPropagation();
  datePopup.classList.toggle('open');
  $('projectsDropdown').classList.remove('open');
});

datePicker.addEventListener('change', () => {
  applyFilters();
  if (datePicker.value) {
    showToast(`📅 Showing news from ${datePicker.value}`);
  }
});

clearDateBtn.addEventListener('click', () => {
  datePicker.value = '';
  applyFilters();
  datePopup.classList.remove('open');
  showToast('Date filter cleared');
});

/* ─── PROJECTS DROPDOWN ───────────────────────────────────── */
projectsToggle.addEventListener('click', e => {
  e.stopPropagation();
  projectsDropdown.classList.toggle('open');
  datePopup.classList.remove('open');
});

/* Close dropdowns on outside click */
document.addEventListener('click', e => {
  if (!e.target.closest('#projectsCtrl')) projectsDropdown.classList.remove('open');
  if (!e.target.closest('#dateCtrl'))     datePopup.classList.remove('open');
});

/* ─── VIEW TOGGLE ─────────────────────────────────────────── */
viewGrid.addEventListener('click', () => {
  newsGrid.classList.remove('list-view');
  viewGrid.classList.add('active');
  viewList.classList.remove('active');
});

viewList.addEventListener('click', () => {
  newsGrid.classList.add('list-view');
  viewList.classList.add('active');
  viewGrid.classList.remove('active');
});

/* ─── INFINITE SCROLL ─────────────────────────────────────── */
const scrollObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) loadMore();
}, { rootMargin: '200px' });

scrollObserver.observe(loader);

/* ─── HEADER SCROLL EFFECT ────────────────────────────────── */
const mainHeader = $('mainHeader');
window.addEventListener('scroll', () => {
  mainHeader.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

/* ─── OPEN FROM URL ───────────────────────────────────────── */
function openNewsFromURL() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('news');
  if (!id) return;
  const item = allNews.find(n => n.urlId === id || n.hash === id);
  if (item) openArticle(item);
}

/* ─── HTML ESCAPE ─────────────────────────────────────────── */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  return escHtml(str).replace(/"/g, '&quot;');
}

/* ─── AUTO REFRESH ────────────────────────────────────────── */
setInterval(fetchNews, 2 * 60 * 1000); // Every 2 min

/* ─── INIT ────────────────────────────────────────────────── */
initTheme();
fetchNews();
