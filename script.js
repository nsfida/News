/* ════════════════════════════════════════════════════════════
   LIVENEWS — script.js
   Powered by Nadeem Shahzad Fida
   FIXED: Infinite scrolling / page scrolling reliability
   ════════════════════════════════════════════════════════════ */

'use strict';

/* ─── STATE ───────────────────────────────────────────────── */
let allNews = [];
let filteredNews = [];
let renderedCount = 0;
let currentCategory = 'all';
let isLoading = false;
let isDark = false;

let articleImages = [];
let articleImgIdx = 0;
let imgSliderTimer = null;
let heroSliderTimer = null;

let feedStartIndex = 0;      // 0 = show from first card, 1 = skip hero story in feed
let scrollRafPending = false;

const LOAD_STEP = 8;

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
  all:        { label: 'All News',   icon: 'fa-house-chimney', color: '#c0392b' },
  war:        { label: 'US-IRAN',    icon: 'fa-explosion',      color: '#e74c3c' },
  world:      { label: 'World',      icon: 'fa-globe',          color: '#2980b9' },
  politics:   { label: 'Politics',   icon: 'fa-landmark',       color: '#8e44ad' },
  business:   { label: 'Business',   icon: 'fa-briefcase',      color: '#27ae60' },
  technology: { label: 'Technology', icon: 'fa-microchip',      color: '#2471a3' },
  economy:    { label: 'Economy',    icon: 'fa-chart-line',     color: '#d35400' },
  energy:     { label: 'Energy',     icon: 'fa-bolt',           color: '#f39c12' },
};

/* ─── DOM REFS ────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const newsGrid = $('newsGrid');
const feedHero = $('feedHero');
const loader = $('loader');
const feedEnd = $('feedEnd');
const feedCount = $('feedCount');
const breakingTicker = $('breakingTicker');
const searchInput = $('searchInput');
const searchBar = document.querySelector('.search-bar');
const searchClear = $('searchClear');
const datePicker = $('datePicker');
const datePopup = $('datePopup');
const jumpDateBtn = $('jumpDateBtn');
const clearDateBtn = $('clearDate');
const themeToggle = $('themeToggle');
const themeIcon = $('themeIcon');
const articleOverlay = $('articleOverlay');
const articleModal = $('articleModal');
const expandedTitle = $('expandedTitle');
const expandedDate = document.querySelector('#expandedDate span');
const expandedCategory = $('expandedCategory');
const expandedImage = $('expandedImage');
const expandedContent = $('expandedContent');
const closeExpanded = $('closeExpanded');
const imgPrev = $('imgPrev');
const imgNext = $('imgNext');
const imgCounter = $('imgCounter');
const articleTags = $('articleTags');
const shareBtn = $('shareBtn');
const bookmarkBtn = $('bookmarkBtn');
const projectsToggle = $('projectsToggle');
const projectsDropdown = $('projectsDropdown');
const dateCtrl = $('dateCtrl');
const trendingList = $('trendingList');
const latestList = $('latestList');
const sidebarCategories = $('sidebarCategories');
const toast = $('toast');
const breakingClose = $('breakingClose');
const viewGrid = $('viewGrid');
const viewList = $('viewList');
const mbnSearch = $('mbnSearch');
const mobileSearchOverlay = $('mobileSearchOverlay');
const mobileSearchInput = $('mobileSearchInput');
const msoClose = $('msoClose');
const navScrollRight = $('navScrollRight');
const categoryList = $('categoryList');

/* ─── UTILS ───────────────────────────────────────────────── */
function generateHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36).substring(0, 6);
}

function parseDate(dateStr) {
  if (!dateStr) return new Date(0);

  const raw = String(dateStr).trim();

  // DD-MM-YYYY or D-M-YYYY
  const dashParts = raw.split('-');
  if (dashParts.length === 3 && dashParts[0].length <= 2 && dashParts[2].length === 4) {
    const dd = dashParts[0].padStart(2, '0');
    const mm = dashParts[1].padStart(2, '0');
    const yyyy = dashParts[2];
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    if (!isNaN(d)) return d;
  }

  // Fallback
  const d = new Date(raw);
  if (!isNaN(d)) return d;

  return new Date(0);
}

function formatDate(dateStr) {
  const d = parseDate(dateStr);
  if (isNaN(d)) return dateStr || '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function timeAgo(dateStr) {
  const d = parseDate(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateStr);
}

function catColor(cat) {
  const c = (cat || '').toLowerCase();
  return (CAT_CONFIG[c] || CAT_CONFIG.all).color;
}

function catClass(cat) {
  const c = (cat || '').toLowerCase();
  return `cat-color-${c}`;
}

function getImages(item) {
  if (item && Array.isArray(item.images) && item.images.length) return item.images.filter(Boolean);
  if (item && item.image) return [item.image];
  return ['https://via.placeholder.com/600x400/1a1d23/444?text=No+Image'];
}

function showToast(msg, duration = 2500) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  return escHtml(str);
}

function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem('ln-bookmarks') || '[]');
  } catch {
    return [];
  }
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
  if (themeIcon) {
    themeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    isDark = !isDark;
    localStorage.setItem('ln-theme', isDark ? 'dark' : 'light');
    applyTheme();
    showToast(isDark ? '🌙 Dark mode on' : '☀️ Light mode on');
  });
}

/* ─── BREAKING NEWS TICKER ────────────────────────────────── */
function renderBreaking(data) {
  if (!breakingTicker) return;

  breakingTicker.innerHTML = '';
  const items = data.slice(0, 12);
  const sourceItems = items.length ? items : [{ title: 'No breaking news available right now.' }];

  // Duplicate items inside the same track for a smooth marquee loop
  const allItems = [...sourceItems, ...sourceItems];

  allItems.forEach(n => {
    const span = document.createElement('span');
    span.className = 'tick-item';
    span.textContent = n.title || 'Untitled';
    span.addEventListener('click', () => {
      if (n.hash || n.urlId || n.title) {
        const item = allNews.find(x => x.hash === n.hash || x.urlId === n.urlId || x.title === n.title);
        if (item) openArticle(item);
      }
    });
    breakingTicker.appendChild(span);
  });
}

if (breakingClose) {
  breakingClose.addEventListener('click', () => {
    const breakingBar = $('breakingBar');
    if (breakingBar) breakingBar.style.display = 'none';
    document.documentElement.style.setProperty('--breaking-h', '0px');
  });
}

/* ─── FETCH NEWS ──────────────────────────────────────────── */
async function fetchNews() {
  showSkeletons();

  try {
    const responses = await Promise.all(
      DATA_FILES.map(url => fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' }))
    );

    const dataArrays = await Promise.all(
      responses.map(res => (res.ok ? res.json() : []))
    );

    allNews = dataArrays.flat().filter(Boolean);

    allNews.forEach(item => {
      item.hash = generateHash(item.title || '');
      item.urlId = item.hash;
      item._date = parseDate(item.date);
    });

    allNews.sort((a, b) => b._date - a._date);

    renderSidebars();
    renderBreaking(allNews);
    applyFilters();
    openNewsFromURL();
  } catch (err) {
    console.error('LiveNews fetch error:', err);
    if (newsGrid) {
      newsGrid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-muted);">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:40px; margin-bottom:14px; display:block; color:var(--accent);"></i>
          <p style="font-weight:600; margin-bottom:6px;">Unable to load news</p>
          <p style="font-size:13px;">Please check your connection and try again.</p>
          <button id="retryFetchBtn" style="margin-top:16px; background:var(--accent); color:#fff; border:none; padding:9px 22px; border-radius:99px; font-weight:600; cursor:pointer; font-size:13px;">Retry</button>
        </div>`;
      const retry = $('retryFetchBtn');
      if (retry) retry.addEventListener('click', fetchNews);
    }
  }
}

function showSkeletons() {
  if (!newsGrid) return;

  newsGrid.innerHTML = Array.from({ length: 6 }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-text" style="margin-top:14px;"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text short"></div>
      <div class="skeleton skeleton-text shorter" style="margin-bottom:14px;"></div>
    </div>
  `).join('');
}

/* ─── SIDEBAR WIDGETS ─────────────────────────────────────── */
function renderSidebars() {
  if (trendingList) {
    trendingList.innerHTML = allNews.slice(0, 7).map((item, i) => `
      <li class="trending-item" data-hash="${escAttr(item.hash)}">
        <span class="trending-num">${i + 1}</span>
        <span class="trending-text">${escHtml(item.title)}</span>
      </li>
    `).join('');

    trendingList.querySelectorAll('.trending-item').forEach(el => {
      el.addEventListener('click', () => {
        const item = allNews.find(n => n.hash === el.dataset.hash);
        if (item) openArticle(item);
      });
    });
  }

  if (sidebarCategories) {
    sidebarCategories.innerHTML = Object.entries(CAT_CONFIG)
      .filter(([k]) => k !== 'all')
      .map(([key, cfg]) => `
        <button class="cat-pill" data-cat="${escAttr(key)}"
          style="color:${cfg.color}; border-color:${cfg.color}33; background:${cfg.color}14;">
          <i class="fa-solid ${cfg.icon}" style="margin-right:5px;"></i>${escHtml(cfg.label)}
        </button>
      `).join('');

    sidebarCategories.querySelectorAll('.cat-pill').forEach(btn => {
      btn.addEventListener('click', () => filterByCategory(btn.dataset.cat));
    });
  }

  if (latestList) {
    const latest = allNews.slice(0, 8);
    latestList.innerHTML = latest.map(item => {
      const imgs = getImages(item);
      return `
        <div class="latest-item" data-hash="${escAttr(item.hash)}">
          <img class="latest-thumb" src="${escAttr(imgs[0])}" alt="" loading="lazy"
               onerror="this.src='https://via.placeholder.com/60x50/1a1d23/444'">
          <div class="latest-info">
            <div class="latest-title">${escHtml(item.title)}</div>
            <div class="latest-date">${escHtml(timeAgo(item.date))}</div>
          </div>
        </div>
      `;
    }).join('');

    latestList.querySelectorAll('.latest-item').forEach(el => {
      el.addEventListener('click', () => {
        const item = allNews.find(n => n.hash === el.dataset.hash);
        if (item) openArticle(item);
      });
    });
  }
}

/* ─── FILTER LOGIC ────────────────────────────────────────── */
function applyFilters() {
  let result = [...allNews];

  if (currentCategory !== 'all') {
    result = result.filter(n => String(n.category || '').toLowerCase() === currentCategory);
  }

  const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
  if (q) {
    result = result.filter(n =>
      String(n.title || '').toLowerCase().includes(q) ||
      String(n.content || '').toLowerCase().includes(q) ||
      String(n.category || '').toLowerCase().includes(q)
    );
  }

  if (datePicker && datePicker.value) {
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

  // Show hero story only when there is no search/date filter and category is all
  const noTextFilter = !q && !(datePicker && datePicker.value);
  feedStartIndex = (currentCategory === 'all' && noTextFilter && filteredNews.length > 1) ? 1 : 0;

  renderedCount = feedStartIndex;
  isLoading = false;

  if (newsGrid) newsGrid.innerHTML = '';
  if (feedEnd) feedEnd.style.display = 'none';

  if (feedCount) {
    feedCount.innerHTML = `Showing <strong>${filteredNews.length}</strong> stories`;
  }

  if (filteredNews.length > 0) {
    renderHero(filteredNews[0]);
  } else {
    if (feedHero) {
      feedHero.classList.remove('visible');
      feedHero.innerHTML = '';
    }
  }

  loadMore();
}

/* ─── HERO ────────────────────────────────────────────────── */
function renderHero(item) {
  if (!feedHero) return;

  const imgs = getImages(item);
  const image = imgs[0] || 'https://via.placeholder.com/1200x400/1a1d23/555?text=LiveNews';

  feedHero.innerHTML = `
    <img class="feed-hero-img" src="${escAttr(image)}" alt="${escAttr(item.title)}" loading="eager"
         onerror="this.src='https://via.placeholder.com/1200x400/1a1d23/555?text=LiveNews'">
    <div class="feed-hero-overlay">
      <span class="hero-cat">${escHtml(item.category || 'News')}</span>
      <h2 class="hero-title">${escHtml(item.title || '')}</h2>
      <div class="hero-meta">${escHtml(formatDate(item.date))}</div>
    </div>
  `;

  feedHero.classList.add('visible');
  feedHero.onclick = () => openArticle(item);

  // keep hero image cycling if multiple images
  if (heroSliderTimer) clearInterval(heroSliderTimer);
  if (imgs.length > 1) {
    let idx = 0;
    heroSliderTimer = setInterval(() => {
      idx = (idx + 1) % imgs.length;
      const img = feedHero.querySelector('.feed-hero-img');
      if (!img) return;
      img.style.opacity = '0';
      setTimeout(() => {
        img.src = imgs[idx];
        img.style.opacity = '1';
      }, 220);
    }, 2500);
  }
}

/* ─── LOAD MORE ───────────────────────────────────────────── */
function loadMore() {
  if (isLoading) return;
  if (!filteredNews.length) {
    if (loader) loader.classList.remove('active');
    if (feedEnd) feedEnd.style.display = 'none';
    return;
  }

  if (renderedCount >= filteredNews.length) {
    if (loader) loader.classList.remove('active');
    if (feedEnd) feedEnd.style.display = '';
    return;
  }

  isLoading = true;
  if (loader) loader.classList.add('active');

  // Small delay for smoother UI
  setTimeout(() => {
    const start = renderedCount;
    const end = Math.min(renderedCount + LOAD_STEP, filteredNews.length);
    const items = filteredNews.slice(start, end);

    items.forEach((item, idx) => {
      const card = createCard(item, idx, false);
      if (newsGrid) newsGrid.appendChild(card);
    });

    renderedCount = end;

    if (loader) loader.classList.remove('active');
    isLoading = false;

    if (renderedCount >= filteredNews.length && feedEnd) {
      feedEnd.style.display = '';
    }
  }, 180);
}

function showFeedEndIfNeeded() {
  if (!feedEnd) return;
  feedEnd.style.display = (renderedCount >= filteredNews.length && filteredNews.length > 0) ? '' : 'none';
}

/* ─── CREATE CARD ─────────────────────────────────────────── */
function createCard(item, idx) {
  const imgs = getImages(item);
  const catKey = (item.category || '').toLowerCase();
  const cat = CAT_CONFIG[catKey] || CAT_CONFIG.all;

  const card = document.createElement('div');
  card.className = `news-card fade-in`;
  card.style.animationDelay = `${Math.min(idx * 0.04, 0.3)}s`;

  const dotsHtml = imgs.length > 1
    ? `<div class="img-dots">${imgs.map((_, i) => `<span class="img-dot${i === 0 ? ' active' : ''}"></span>`).join('')}</div>`
    : '';

  card.innerHTML = `
    <div class="card-img-wrap">
      <span class="card-cat ${catClass(item.category)}">${escHtml(item.category || 'News')}</span>
      <img src="${escAttr(imgs[0])}" alt="${escAttr(item.title)}" loading="lazy"
           class="card-img-fade"
           onerror="this.src='https://via.placeholder.com/600x400/1a1d23/444?text=No+Image'">
      ${dotsHtml}
    </div>
    <div class="card-body">
      <h3 class="card-title">${escHtml(item.title)}</h3>
      <div class="card-footer">
        <span class="card-date">
          <i class="fa-regular fa-clock"></i>
          ${escHtml(timeAgo(item.date))}
        </span>
        <span class="card-read-more">
          Read <i class="fa-solid fa-arrow-right" style="font-size:10px;"></i>
        </span>
      </div>
    </div>
  `;

  const imgEl = card.querySelector('img');
  if (imgEl) {
    imgEl.addEventListener('load', () => {
      imgEl.classList.remove('card-img-fade');
      imgEl.classList.add('card-img-loaded');
    });
  }

  // Multi-image slider
  if (imgs.length > 1 && imgEl) {
    const dots = card.querySelectorAll('.img-dot');
    let sliderIdx = 0;
    const timer = setInterval(() => {
      sliderIdx = (sliderIdx + 1) % imgs.length;
      imgEl.style.opacity = '0';
      setTimeout(() => {
        imgEl.src = imgs[sliderIdx];
        imgEl.style.opacity = '1';
        dots.forEach((d, i) => d.classList.toggle('active', i === sliderIdx));
      }, 250);
    }, 2200);
    // keep timer reference so it can be cleaned if needed later
    card._timer = timer;
  }

  card.addEventListener('click', () => openArticle(item));
  return card;
}

/* ─── OPEN ARTICLE ────────────────────────────────────────── */
function openArticle(item) {
  const imgs = getImages(item);
  articleImages = imgs;
  articleImgIdx = 0;

  if (expandedTitle) expandedTitle.textContent = item.title || '';
  if (expandedDate) expandedDate.textContent = formatDate(item.date);
  if (expandedCategory) {
    expandedCategory.textContent = (item.category || 'News').toUpperCase();
    expandedCategory.style.background = catColor(item.category);
  }
  if (expandedContent) expandedContent.textContent = item.content || 'No content available.';
  if (expandedImage) {
    expandedImage.src = imgs[0];
    expandedImage.alt = item.title || 'News image';
    expandedImage.style.opacity = '1';
  }

  const hasMultiple = imgs.length > 1;
  if (imgPrev) imgPrev.style.display = hasMultiple ? '' : 'none';
  if (imgNext) imgNext.style.display = hasMultiple ? '' : 'none';
  renderImgCounter();

  const words = String(item.title || '')
    .split(' ')
    .filter(w => w.length > 5)
    .slice(0, 4);

  const tagList = [item.category, ...words].filter(Boolean);
  if (articleTags) {
    articleTags.innerHTML = tagList.map(t =>
      `<span class="article-tag">#${escHtml(String(t).replace(/[^a-zA-Z0-9]/g, ''))}</span>`
    ).join('');
  }

  window.history.replaceState({}, '', `?news=${encodeURIComponent(item.urlId)}`);

  if (articleOverlay) {
    articleOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (articleModal) articleModal.scrollTop = 0;
  }

  const bookmarks = getBookmarks();
  if (bookmarkBtn) {
    bookmarkBtn.classList.toggle('active', bookmarks.includes(item.hash));
    bookmarkBtn.onclick = () => toggleBookmark(item);
  }

  if (shareBtn) {
    shareBtn.onclick = () => {
      const url = window.location.href;
      if (navigator.share) {
        navigator.share({ title: item.title, url }).catch(() => {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url);
        showToast('🔗 Link copied to clipboard');
      } else {
        prompt('Copy this link:', url);
      }
    };
  }

  clearInterval(imgSliderTimer);
  if (hasMultiple) {
    imgSliderTimer = setInterval(() => changeArticleImg(1), 3000);
  }
}

function closeArticleView() {
  if (articleOverlay) articleOverlay.classList.remove('open');
  document.body.style.overflow = '';
  clearInterval(imgSliderTimer);
  imgSliderTimer = null;
  window.history.replaceState({}, '', window.location.pathname);
}

function changeArticleImg(dir) {
  if (!articleImages.length) return;

  articleImgIdx = (articleImgIdx + dir + articleImages.length) % articleImages.length;

  if (expandedImage) {
    expandedImage.style.opacity = '0';
    setTimeout(() => {
      expandedImage.src = articleImages[articleImgIdx];
      expandedImage.style.opacity = '1';
      renderImgCounter();
    }, 220);
  }

  clearInterval(imgSliderTimer);
  imgSliderTimer = setInterval(() => changeArticleImg(1), 3000);
}

function renderImgCounter() {
  if (!imgCounter) return;

  imgCounter.innerHTML = articleImages.map((_, i) =>
    `<span class="img-counter-dot${i === articleImgIdx ? ' active' : ''}" data-i="${i}"></span>`
  ).join('');

  imgCounter.querySelectorAll('.img-counter-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      articleImgIdx = Number(dot.dataset.i || 0);
      if (expandedImage) {
        expandedImage.src = articleImages[articleImgIdx];
      }
      renderImgCounter();
      clearInterval(imgSliderTimer);
      imgSliderTimer = setInterval(() => changeArticleImg(1), 3000);
    });
  });
}

if (closeExpanded) closeExpanded.addEventListener('click', closeArticleView);

if (articleOverlay) {
  articleOverlay.addEventListener('click', e => {
    if (e.target === articleOverlay) closeArticleView();
  });
}

if (imgPrev) imgPrev.addEventListener('click', () => changeArticleImg(-1));
if (imgNext) imgNext.addEventListener('click', () => changeArticleImg(1));

document.addEventListener('keydown', e => {
  if (!articleOverlay || !articleOverlay.classList.contains('open')) return;
  if (e.key === 'Escape') closeArticleView();
  if (e.key === 'ArrowLeft') changeArticleImg(-1);
  if (e.key === 'ArrowRight') changeArticleImg(1);
});

/* ─── BOOKMARKS ───────────────────────────────────────────── */
function toggleBookmark(item) {
  let bookmarks = getBookmarks();

  if (bookmarks.includes(item.hash)) {
    bookmarks = bookmarks.filter(h => h !== item.hash);
    if (bookmarkBtn) bookmarkBtn.classList.remove('active');
    showToast('Bookmark removed');
  } else {
    bookmarks.push(item.hash);
    if (bookmarkBtn) bookmarkBtn.classList.add('active');
    showToast('📌 Bookmarked!');
  }

  localStorage.setItem('ln-bookmarks', JSON.stringify(bookmarks));
}

/* ─── SEARCH ──────────────────────────────────────────────── */
const debouncedFilter = debounce(applyFilters, 300);

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const v = searchInput.value.trim();
    if (searchBar) searchBar.classList.toggle('has-value', v.length > 0);
    debouncedFilter();
  });
}

if (searchClear) {
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    if (searchBar) searchBar.classList.remove('has-value');
    applyFilters();
    searchInput.focus();
  });
}

if (mobileSearchInput) {
  mobileSearchInput.addEventListener('input', debounce(() => {
    searchInput.value = mobileSearchInput.value;
    if (searchBar) searchBar.classList.toggle('has-value', mobileSearchInput.value.length > 0);
    applyFilters();
  }, 300));
}

if (mbnSearch) {
  mbnSearch.addEventListener('click', () => {
    if (mobileSearchOverlay) {
      mobileSearchOverlay.classList.add('open');
      mobileSearchInput.focus();
    }
  });
}

if (msoClose) {
  msoClose.addEventListener('click', () => {
    if (mobileSearchOverlay) mobileSearchOverlay.classList.remove('open');
    if (mobileSearchInput) mobileSearchInput.value = '';
    if (searchInput) searchInput.value = '';
    if (searchBar) searchBar.classList.remove('has-value');
    applyFilters();
  });
}

/* ─── CATEGORY NAV ────────────────────────────────────────── */
function filterByCategory(cat) {
  currentCategory = cat;

  $$('.cat-item').forEach(el => {
    el.classList.toggle('active', el.dataset.category === cat);
  });

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

if (navScrollRight && categoryList) {
  navScrollRight.addEventListener('click', () => {
    categoryList.scrollBy({ left: 160, behavior: 'smooth' });
  });
}

/* ─── DATE PICKER ─────────────────────────────────────────── */
if (jumpDateBtn) {
  jumpDateBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (datePopup) datePopup.classList.toggle('open');
    if (projectsDropdown) projectsDropdown.classList.remove('open');
  });
}

if (datePicker) {
  datePicker.addEventListener('change', () => {
    applyFilters();
    if (datePicker.value) {
      showToast(`📅 Showing news from ${datePicker.value}`);
    }
  });
}

if (clearDateBtn) {
  clearDateBtn.addEventListener('click', () => {
    datePicker.value = '';
    applyFilters();
    if (datePopup) datePopup.classList.remove('open');
    showToast('Date filter cleared');
  });
}

/* ─── PROJECTS DROPDOWN ───────────────────────────────────── */
if (projectsToggle) {
  projectsToggle.addEventListener('click', e => {
    e.stopPropagation();
    if (projectsDropdown) projectsDropdown.classList.toggle('open');
    if (datePopup) datePopup.classList.remove('open');
  });
}

/* Close dropdowns on outside click */
document.addEventListener('click', e => {
  if (!e.target.closest('#projectsCtrl') && projectsDropdown) projectsDropdown.classList.remove('open');
  if (!e.target.closest('#dateCtrl') && datePopup) datePopup.classList.remove('open');
});

/* ─── VIEW TOGGLE ─────────────────────────────────────────── */
if (viewGrid) {
  viewGrid.addEventListener('click', () => {
    if (newsGrid) newsGrid.classList.remove('list-view');
    viewGrid.classList.add('active');
    if (viewList) viewList.classList.remove('active');
  });
}

if (viewList) {
  viewList.addEventListener('click', () => {
    if (newsGrid) newsGrid.classList.add('list-view');
    viewList.classList.add('active');
    if (viewGrid) viewGrid.classList.remove('active');
  });
}

/* ─── INFINITE SCROLL FIX ─────────────────────────────────── */
/*
  The old observer approach could fail when the loader was hidden.
  This version checks the viewport position on scroll and resize,
  which is much more reliable.
*/
function checkInfiniteScroll() {
  if (isLoading) return;
  if (!filteredNews.length) return;

  const threshold = 260;
  const scrollBottom = window.innerHeight + window.scrollY;
  const pageBottom = document.documentElement.scrollHeight;

  if (scrollBottom >= pageBottom - threshold) {
    loadMore();
  }
}

function onScrollHandler() {
  if (scrollRafPending) return;

  scrollRafPending = true;
  requestAnimationFrame(() => {
    checkInfiniteScroll();
    scrollRafPending = false;
  });
}

window.addEventListener('scroll', onScrollHandler, { passive: true });
window.addEventListener('resize', onScrollHandler);

/* ─── HEADER SCROLL EFFECT ────────────────────────────────── */
const mainHeader = $('mainHeader');
window.addEventListener('scroll', () => {
  if (mainHeader) {
    mainHeader.classList.toggle('scrolled', window.scrollY > 20);
  }
}, { passive: true });

/* ─── OPEN FROM URL ───────────────────────────────────────── */
function openNewsFromURL() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('news');
  if (!id) return;

  const item = allNews.find(n => n.urlId === id || n.hash === id);
  if (item) openArticle(item);
}

/* ─── AUTO REFRESH ────────────────────────────────────────── */
setInterval(fetchNews, 2 * 60 * 1000);

/* ─── INIT ────────────────────────────────────────────────── */
initTheme();
fetchNews();
