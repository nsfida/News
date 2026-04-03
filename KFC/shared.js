/**
 * SHARED.JS — Khawrai Falahi Committee UAE
 * Unified: Auth · Theme · Translation · Header · Notifications
 * Include this on every page. Call KFC.init() after DOM ready.
 */

window.KFC = (() => {

  /* ============================================================
     CONSTANTS
  ============================================================ */
  const API_BASE       = "https://livenews.live/KFC";
  const PHOTOS_BASE    = `${API_BASE}/static/images/photos/`;
  const DEFAULT_PHOTO  = `${PHOTOS_BASE}default.png`;

  const THEME_KEY      = "kfcTheme";
  const LANG_KEY       = "kfcPageLanguage";
  const SESSION_KEY    = "kfcUser";

  const BANNER_TEXT    = "🕭 Dear members: The Khawrai Falahi Committee can now send personal messages to all members privately. Please log in to your Committee account to view your messages and recent alerts. Stay updated.";

  /* ============================================================
     STATE
  ============================================================ */
  let users            = [];
  let currentUser      = null;
  let currentLang      = localStorage.getItem(LANG_KEY) === "ur" ? "ur" : "en";

  let googleTranslateLoadPromise = null;
  let translatePending           = null;
  let translationRefreshTimer    = null;
  let translationMutationObs     = null;
  let translationFixRunning      = false;

  /* ============================================================
     UTILITY
  ============================================================ */
  const norm = v => (v || "").toString().trim();

  function isCancelled(status) {
    const s = norm(status).toLowerCase();
    return s === "cancel" || s === "cancelled";
  }

  function generateUsername(name) {
    const parts = norm(name).toLowerCase().split(/\s+/).filter(Boolean);
    if (parts.length < 2) return norm(name).toLowerCase();
    return parts[0] + parts[parts.length - 1];
  }

  function generatePassword(card) {
    if (!card) return "";
    const parts = String(card).split("-");
    return parts[parts.length - 1] || "";
  }

  function escapeHTML(str) {
    return String(str || "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildCenteredMsg(text) {
    return `<p style="text-align:center;padding:18px;color:#888;">${escapeHTML(text)}</p>`;
  }

  function safeEncode(v) { return encodeURIComponent(String(v || "")); }

  /* ============================================================
     PROFILE IMAGE
  ============================================================ */
  function getImageCandidates(cardNo) {
    const c = safeEncode(cardNo);
    return [`${PHOTOS_BASE}${c}.png`, `${PHOTOS_BASE}${c}.jpg`, DEFAULT_PHOTO];
  }

  function setImageWithFallback(img, sources, fallbackIcon) {
    if (!img) return;
    let idx = 0;
    const tryNext = () => {
      if (idx >= sources.length) {
        img.style.display = "none";
        if (fallbackIcon) fallbackIcon.style.display = "block";
        return;
      }
      img.src = sources[idx++];
    };
    img.onerror  = tryNext;
    img.onload   = () => { img.style.display = "block"; if (fallbackIcon) fallbackIcon.style.display = "none"; };
    tryNext();
  }

  /* ============================================================
     THEME
  ============================================================ */
  function applyTheme(mode) {
    const dark = mode === "dark";
    document.body.classList.toggle("dark-mode", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    const icon = document.getElementById("themeToggleIcon");
    if (icon) icon.className = dark ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") { applyTheme(saved); return; }
    applyTheme(window.matchMedia?.("(prefers-color-scheme:dark)").matches ? "dark" : "light");
  }

  function toggleTheme() {
    applyTheme(document.body.classList.contains("dark-mode") ? "light" : "dark");
  }

  /* ============================================================
     TRANSLATION
  ============================================================ */
  const REPLACEMENTS_UR = [
    ["خواری فلاحی کمیٹی", "خاورئی فلاحی کمیٹی"],
    ["Khawrai Falahi Committee", "خاورئی فلاحی کمیٹی"],
    ["Khawarai Welfare Committee", "خاورئی فلاحی کمیٹی"],
    ["Khawrai", "خاورئی"],
    ["Constitution", "دستور"]
  ];

  const REPLACEMENTS_EN = [
    ["Khawarai Welfare Committee UAE", "Khawrai Falahi Committee UAE"],
    ["Khawarai Welfare Committee", "Khawrai Falahi Committee"],
    ["Recipe (English)", "Constitution (English)"],
    ["Order (Translated)", "Constitution (Translated)"]
  ];

  function applyTextFixes(root = document.body) {
    if (!root || translationFixRunning) return;
    translationFixRunning = true;
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      const list = currentLang === "ur" ? REPLACEMENTS_UR : REPLACEMENTS_EN;
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        let t = node.nodeValue; if (!t) return;
        let u = t;
        list.forEach(([from, to]) => { if (u.includes(from)) u = u.split(from).join(to); });
        if (u !== t) node.nodeValue = u;
      });
    } finally {
      setTimeout(() => { translationFixRunning = false; }, 0);
    }
  }

  function scheduleTransFix() {
    clearTimeout(translationRefreshTimer);
    translationRefreshTimer = setTimeout(() => applyTextFixes(document.body), 130);
  }

  function startTranslationObserver() {
    if (translationMutationObs || !window.MutationObserver) return;
    translationMutationObs = new MutationObserver(() => { if (!translationFixRunning) scheduleTransFix(); });
    translationMutationObs.observe(document.body, { subtree: true, childList: true, characterData: true });
  }

  function setDocDir() {
    const rtl = currentLang === "ur";
    document.documentElement.lang = rtl ? "ur" : "en";
    document.documentElement.dir  = rtl ? "rtl" : "ltr";
    document.body.classList.toggle("page-rtl", rtl);
    const btn  = document.getElementById("translateToggleBtn");
    if (btn) {
      btn.classList.toggle("active", rtl);
      btn.title = rtl ? "Switch to English" : "Translate to Urdu";
    }
  }

  function applyGoogleTranslation(lang) {
    const combo = document.querySelector(".goog-te-combo");
    if (!combo) return false;
    combo.value = lang;
    combo.dispatchEvent(new Event("change"));
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    setDocDir();
    return true;
  }

  function applyGoogleTranslationRetry(lang, attempt = 0) {
    if (applyGoogleTranslation(lang)) { setTimeout(() => applyTextFixes(document.body), 250); return; }
    if (attempt < 20) setTimeout(() => applyGoogleTranslationRetry(lang, attempt + 1), 200);
    else translatePending = lang;
  }

  function ensureGoogleWidget() {
    if (googleTranslateLoadPromise) return googleTranslateLoadPromise;
    googleTranslateLoadPromise = new Promise((res, rej) => {
      if (window.google?.translate && document.querySelector(".goog-te-combo")) { res(); return; }
      window.googleTranslateElementInit = function () {
        try {
          const host = document.getElementById("google_translate_element");
          if (host) host.innerHTML = "";
          new google.translate.TranslateElement(
            { pageLanguage: "en", includedLanguages: "ur,en", autoDisplay: false },
            "google_translate_element"
          );
          res();
          if (translatePending) { const p = translatePending; translatePending = null; setTimeout(() => applyGoogleTranslationRetry(p), 250); }
        } catch (e) { rej(e); }
      };
      if (document.getElementById("kfc-gt-script")) return;
      const s = document.createElement("script");
      s.id    = "kfc-gt-script";
      s.src   = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      s.async = true;
      s.onerror = () => rej(new Error("Translate load fail"));
      document.head.appendChild(s);
    });
    return googleTranslateLoadPromise;
  }

  async function toggleTranslation() {
    const target = currentLang === "ur" ? "en" : "ur";
    translatePending = target;
    try {
      await ensureGoogleWidget();
      applyGoogleTranslationRetry(target);
    } catch (e) { console.error("Translation error:", e); }
  }

  /* ============================================================
     SESSION
  ============================================================ */
  function saveSession(user) { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
  function clearSession()    { localStorage.removeItem(SESSION_KEY); }

  function getCurrentUser()  { return currentUser; }
  function getUserData()     { return users; }

  /* ============================================================
     HEADER HTML INJECTION
     Call injectHeader(containerId?) to put the shared header into page
  ============================================================ */
  function injectHeader(targetId) {
    const target = targetId ? document.getElementById(targetId) : document.body;
    if (!target) return;

    const headerHTML = `
      <div class="floating-circles" aria-hidden="true">
        <div class="circle"></div><div class="circle"></div><div class="circle"></div>
        <div class="circle"></div><div class="circle"></div><div class="circle"></div>
        <div class="circle"></div><div class="circle"></div><div class="circle"></div>
      </div>

      <header class="top-header">
        <div class="logo-area">
          <a href="${API_BASE}/index.html" aria-label="Home">
            <img src="${API_BASE}/logo.png" alt="KFC Logo">
          </a>
          <div class="logo-area-title">
            <h1>Khawrai Falahi Committee</h1>
            <p>United Arab Emirates</p>
          </div>
        </div>

        <div class="user-area" id="userArea">
          <button class="notification-wrapper theme-toggle-btn" id="themeToggleBtn" type="button" aria-label="Toggle dark mode">
            <i class="fa-solid fa-moon" id="themeToggleIcon"></i>
          </button>
          <button class="notification-wrapper translate-toggle-btn" id="translateToggleBtn" type="button" aria-label="Translate">
            <i class="fa-solid fa-language"></i>
          </button>

          <div class="notification-wrapper" id="msgBtn" style="display:none;">
            <i class="fa-solid fa-envelope"></i>
            <span class="notification-badge" id="msgBadge" style="display:none;">!</span>
            <div class="notification-dropdown" id="msgDropdown">
              <div class="noti-header">Personal Messages</div>
              <div id="msgList" class="noti-list"><p class="noti-loading">Loading…</p></div>
            </div>
          </div>

          <div class="notification-wrapper" id="notificationBtn" style="display:none;">
            <i class="fa-solid fa-bell"></i>
            <span class="notification-badge" id="notiBadge" style="display:none;">!</span>
            <div class="notification-dropdown" id="notiDropdown">
              <div class="noti-header">Recent Alerts</div>
              <div id="notiList" class="noti-list"><p class="noti-loading">Loading…</p></div>
            </div>
          </div>

          <div class="header-profile-img-container">
            <img id="headerProfileImg" src="${DEFAULT_PHOTO}" alt="User" class="header-profile-img" style="display:none;">
            <i class="fa-solid fa-user-circle" id="headerUserIcon"></i>
          </div>
          <span id="usernameSpan">Welcome, Guest</span>
          <i class="fa-solid fa-chevron-down dropdown-arrow"></i>
        </div>
      </header>

      <div id="infoBanner" class="info-banner">
        <div class="marquee">${BANNER_TEXT}</div>
      </div>

      <!-- USER DROPDOWN -->
      <div id="userDropdown" class="user-dropdown">
        <div id="guestView">
          <h3>Welcome, Guest</h3>
          <p>Please sign in to access your account</p>
          <button id="openLoginBtn" type="button">
            <i class="fa-solid fa-right-to-bracket"></i> Sign In
          </button>
        </div>
        <div id="userView" style="display:none;flex-direction:column;align-items:center;gap:6px;">
          <div class="dropdown-photo-area">
            <img id="dropdownProfileImg" src="${DEFAULT_PHOTO}" alt="Profile" class="dropdown-profile-img">
          </div>
          <h3 id="userFullName"></h3>
          <div class="user-info">
            <p id="userCard"></p>
            <p id="userDesg"></p>
            <p id="userBlood"></p>
            <p id="userMobile"></p>
          </div>
          <div class="user-buttons">
            <button id="viewPhotoBtn" type="button"><i class="fa-solid fa-image"></i> View Photo</button>
            <a id="viewCardBtn" href="#" target="_blank" rel="noopener"><i class="fa-solid fa-id-card"></i> View e-Card</a>
            <button id="logoutBtn" type="button"><i class="fa-solid fa-right-from-bracket"></i> Sign Out</button>
          </div>
        </div>
      </div>

      <!-- PHOTO OVERLAY -->
      <div id="photoOverlay" class="overlay">
        <div class="photo-viewer-box glass">
          <div class="leaders-header">
            <h2>Profile Photo</h2>
            <i class="fa-solid fa-xmark" id="closePhotoOverlay"></i>
          </div>
          <img id="fullProfileImg" src="${DEFAULT_PHOTO}" alt="User Photo" style="width:100%;border-radius:15px;">
        </div>
      </div>

      <!-- LOGIN OVERLAY -->
      <div id="loginOverlay" class="login-overlay">
        <div class="login-box">
          <h2><i class="fa-solid fa-user-lock"></i> Secure Login</h2>
          <input type="text" id="loginUsername" placeholder="Enter Username" autocomplete="username">
          <input type="password" id="loginPassword" placeholder="Enter Password" autocomplete="current-password">
          <button id="loginBtn" type="button">Login</button>
          <p id="loginError" aria-live="polite"></p>
        </div>
      </div>

      <!-- WELCOME POPUP -->
      <div id="welcomePopup" class="welcome-popup"><p id="welcomeText"></p></div>

      <!-- TRANSLATE HOST -->
      <div id="google_translate_element" class="translate-host"></div>
    `;

    target.insertAdjacentHTML("afterbegin", headerHTML);
  }

  /* ============================================================
     UI HELPERS
  ============================================================ */
  function applyProfileImage(cardNo) {
    const src = getImageCandidates(cardNo);
    setImageWithFallback(document.getElementById("headerProfileImg"),   src, document.getElementById("headerUserIcon"));
    setImageWithFallback(document.getElementById("dropdownProfileImg"), src, null);
    setImageWithFallback(document.getElementById("fullProfileImg"),     src, null);
  }

  function showWelcome(name) {
    const popup = document.getElementById("welcomePopup");
    const txt   = document.getElementById("welcomeText");
    if (!popup || !txt) return;
    txt.innerText = `Welcome, ${name} 👋`;
    popup.classList.add("show");
    setTimeout(() => popup.classList.remove("show"), 2800);
  }

  function renderUserToHeader(user) {
    if (!user) return;
    const firstName = norm(user.name).split(" ")[0] || "User";
    const span = document.getElementById("usernameSpan");
    if (span) span.innerText = `Welcome, ${firstName}`;

    const fn   = document.getElementById("userFullName");
    const card = document.getElementById("userCard");
    const desg = document.getElementById("userDesg");
    const bg   = document.getElementById("userBlood");
    const mob  = document.getElementById("userMobile");
    if (fn)   fn.innerText   = `Welcome, ${user.name}`;
    if (card) card.innerText = `Card: ${user.CNo}`;
    if (desg) desg.innerText = `Role: ${user.Desg}`;
    if (bg)   bg.innerText   = `Blood: ${user.BG || "N/A"}`;
    if (mob)  mob.innerText  = `Mobile: ${user.mobile || "N/A"}`;

    applyProfileImage(user.CNo);

    const vcBtn = document.getElementById("viewCardBtn");
    if (vcBtn) vcBtn.href = `${API_BASE}/viewcard.html?card=${btoa(String(user.CNo))}`;

    // show logged-in parts
    ["msgBtn","notificationBtn"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "flex";
    });
    const gv = document.getElementById("guestView");
    const uv = document.getElementById("userView");
    if (gv) gv.style.display = "none";
    if (uv) uv.style.display = "flex";

    scheduleTransFix();
  }

  function showLoggedOutHeader() {
    const span = document.getElementById("usernameSpan");
    if (span) span.innerText = "Welcome, Guest";
    const hi = document.getElementById("headerProfileImg");
    const hic = document.getElementById("headerUserIcon");
    if (hi)  hi.style.display  = "none";
    if (hic) hic.style.display = "block";
    ["msgBtn","notificationBtn"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    const gv = document.getElementById("guestView");
    const uv = document.getElementById("userView");
    if (gv) gv.style.display = "block";
    if (uv) uv.style.display = "none";
  }

  /* ============================================================
     AUTH
  ============================================================ */
  function login() {
    const errEl = document.getElementById("loginError");
    if (errEl) errEl.innerText = "";

    const uname = norm(document.getElementById("loginUsername")?.value).toLowerCase();
    const pass  = norm(document.getElementById("loginPassword")?.value);

    if (!uname || !pass) { if (errEl) errEl.innerText = "Enter username and password"; return; }

    const user = users.find(u => generateUsername(u.name) === uname && generatePassword(u.CNo) === pass);

    if (!user)               { if (errEl) errEl.innerText = "Invalid credentials"; return; }
    if (isCancelled(user.Status)) { if (errEl) errEl.innerText = "This account is cancelled"; return; }

    currentUser = user;
    saveSession(user);
    renderUserToHeader(user);
    showWelcome(user.name);

    const lo = document.getElementById("loginOverlay");
    if (lo) lo.classList.remove("show");
    scheduleTransFix();
  }

  function checkSession() {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) { showLoggedOutHeader(); return; }
    try {
      const parsed = JSON.parse(saved);
      if (parsed && !isCancelled(parsed.Status)) {
        currentUser = parsed;
        renderUserToHeader(parsed);
      } else {
        clearSession(); showLoggedOutHeader();
      }
    } catch { clearSession(); showLoggedOutHeader(); }
  }

  /* ============================================================
     ALERTS FETCH
  ============================================================ */
  async function fetchAlerts() {
    const notiList = document.getElementById("notiList");
    if (!notiList) return;
    try {
      const res    = await fetch(`${API_BASE}/message/alerts.json`, { cache: "no-store" });
      const alerts = await res.json();
      notiList.innerHTML = "";

      if (!Array.isArray(alerts) || alerts.length === 0) {
        notiList.innerHTML = buildCenteredMsg("No alerts found."); return;
      }

      const sorted = [...alerts].reverse().slice(0, 3);
      sorted.forEach(a => {
        const item = document.createElement("div");
        item.className = "noti-item";

        const title = a.title_en || a.title || "Alert";
        const date  = a.date || "";
        const body  = a.body_en || a.body || "";

        item.innerHTML = `
          <div class="noti-top-row">
            <span style="font-weight:bold;color:var(--brand);font-size:14px;">${escapeHTML(title)}</span>
            <span style="font-size:11px;color:#888;">${escapeHTML(date)}</span>
          </div>
          <div class="noti-body">${escapeHTML(body)}</div>
        `;

        item.addEventListener("click", () => {
          const wasExpanded = item.classList.contains("expanded");
          document.querySelectorAll(".noti-item").forEach(el => el.classList.remove("expanded"));
          if (!wasExpanded) item.classList.add("expanded");
        });

        notiList.appendChild(item);
      });

      const btnWrap = document.createElement("div");
      btnWrap.style.cssText = "text-align:center;margin-top:10px;";
      btnWrap.innerHTML = `<button onclick="window.location.href='${API_BASE}/message/alerts.html'"
        style="width:100%;padding:9px;border:none;border-radius:50px;background:linear-gradient(90deg,#ff6ec4,#7873f5);color:#fff;font-weight:bold;cursor:pointer;font-size:13px;">
        See all alerts →</button>`;
      notiList.appendChild(btnWrap);

      scheduleTransFix();
    } catch (e) {
      if (notiList) notiList.innerHTML = buildCenteredMsg("Error loading alerts.");
    }
  }

  /* ============================================================
     MESSAGES FETCH
  ============================================================ */
  async function fetchMessages() {
    const msgList = document.getElementById("msgList");
    if (!msgList) return;
    if (!currentUser) { msgList.innerHTML = buildCenteredMsg("Please sign in to view messages."); return; }

    try {
      const res  = await fetch(`${API_BASE}/messages.json`, { cache: "no-store" });
      const msgs = await res.json();
      msgList.innerHTML = "";

      const mine = (Array.isArray(msgs) ? msgs : []).filter(m => {
        const cn = norm(m.cardNumber).toLowerCase();
        return cn === norm(currentUser.CNo).toLowerCase() || cn === "all";
      }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      if (mine.length === 0) { msgList.innerHTML = buildCenteredMsg("No messages found."); return; }

      mine.forEach(msg => {
        const item  = document.createElement("div");
        item.className = "noti-item msg-item";
        const isGlobal = norm(msg.cardNumber).toLowerCase() === "all";
        const tag = isGlobal
          ? `<span style="color:#ff6ec4;font-size:10px;">[Public]</span>`
          : `<span style="color:#7873f5;font-size:10px;">[Private]</span>`;
        const title = msg.title_en || msg.title || "Message";
        const body  = msg.body_en  || msg.body  || "";
        const date  = msg.date || "";

        item.innerHTML = `
          <div class="noti-top-row" style="flex-direction:column;align-items:flex-start;gap:4px;">
            <span style="font-size:11px;color:#888;">${escapeHTML(date)} ${tag}</span>
            <strong style="color:var(--brand);font-size:14px;">${escapeHTML(title)}</strong>
          </div>
          <div class="noti-body">${escapeHTML(body)}</div>
        `;

        item.addEventListener("click", () => {
          const was = item.classList.contains("expanded");
          document.querySelectorAll(".msg-item").forEach(el => el.classList.remove("expanded"));
          if (!was) item.classList.add("expanded");
        });

        msgList.appendChild(item);
      });

      scheduleTransFix();
    } catch (e) {
      if (msgList) msgList.innerHTML = buildCenteredMsg("Error loading messages.");
    }
  }

  /* ============================================================
     LOAD USERS
  ============================================================ */
  async function loadUsers() {
    try {
      const res = await fetch(`${API_BASE}/cards.json`, { cache: "no-store" });
      users = await res.json();
    } catch (e) { console.error("Failed to load users:", e); }
  }

  /* ============================================================
     CLOSE ALL DROPDOWNS
  ============================================================ */
  function closeAllDropdowns() {
    ["userDropdown","notiDropdown","msgDropdown"].forEach(id => {
      document.getElementById(id)?.classList.remove("show");
    });
  }

  /* ============================================================
     BIND HEADER EVENTS
  ============================================================ */
  function bindHeaderEvents() {
    // User area toggle
    document.getElementById("userArea")?.addEventListener("click", e => {
      e.stopPropagation();
      document.getElementById("notiDropdown")?.classList.remove("show");
      document.getElementById("msgDropdown")?.classList.remove("show");
      document.getElementById("userDropdown")?.classList.toggle("show");
    });

    // Theme
    document.getElementById("themeToggleBtn")?.addEventListener("click", e => {
      e.stopPropagation(); toggleTheme();
    });

    // Translate
    document.getElementById("translateToggleBtn")?.addEventListener("click", e => {
      e.stopPropagation(); toggleTranslation();
    });

    // Bell / Alerts
    document.getElementById("notificationBtn")?.addEventListener("click", e => {
      e.stopPropagation();
      document.getElementById("userDropdown")?.classList.remove("show");
      document.getElementById("msgDropdown")?.classList.remove("show");
      const nd = document.getElementById("notiDropdown");
      if (!nd) return;
      nd.classList.toggle("show");
      if (nd.classList.contains("show")) {
        if (!currentUser) {
          const nl = document.getElementById("notiList");
          if (nl) nl.innerHTML = buildCenteredMsg("Please sign in to view alerts.");
          return;
        }
        fetchAlerts();
      }
    });

    // Envelope / Messages
    document.getElementById("msgBtn")?.addEventListener("click", e => {
      e.stopPropagation();
      document.getElementById("userDropdown")?.classList.remove("show");
      document.getElementById("notiDropdown")?.classList.remove("show");
      const md = document.getElementById("msgDropdown");
      if (!md) return;
      md.classList.toggle("show");
      if (md.classList.contains("show")) fetchMessages();
    });

    // View Photo
    document.getElementById("viewPhotoBtn")?.addEventListener("click", () => {
      document.getElementById("photoOverlay")?.classList.add("show");
      closeAllDropdowns();
    });

    document.getElementById("closePhotoOverlay")?.addEventListener("click", () => {
      document.getElementById("photoOverlay")?.classList.remove("show");
    });

    document.getElementById("photoOverlay")?.addEventListener("click", e => {
      if (e.target === document.getElementById("photoOverlay"))
        document.getElementById("photoOverlay").classList.remove("show");
    });

    // Open login
    document.getElementById("openLoginBtn")?.addEventListener("click", () => {
      document.getElementById("loginOverlay")?.classList.add("show");
      closeAllDropdowns();
    });

    // Login overlay
    const lo = document.getElementById("loginOverlay");
    if (lo) {
      lo.addEventListener("click", e => { if (e.target === lo) lo.classList.remove("show"); });
    }

    // Login button
    document.getElementById("loginBtn")?.addEventListener("click", login);

    // Enter key
    document.addEventListener("keydown", e => {
      if (e.key === "Enter" && document.getElementById("loginOverlay")?.classList.contains("show")) login();
    });

    // Logout
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      clearSession(); currentUser = null; location.reload();
    });

    // Close on outside click
    document.addEventListener("click", () => closeAllDropdowns());

    // Prevent dropdown close when clicking inside
    ["userDropdown","notiDropdown","msgDropdown"].forEach(id => {
      document.getElementById(id)?.addEventListener("click", e => e.stopPropagation());
    });

    // Loaded animation
    window.addEventListener("load", () => document.body.classList.add("loaded"));
  }

  /* ============================================================
     INIT (call this from each page)
  ============================================================ */
  async function init(options = {}) {
    const {
      injectInto   = null,   // id of element to prepend header into, null = body
      onUsersLoaded = null,  // callback(users) after cards.json loads
    } = options;

    injectHeader(injectInto);
    initTheme();
    setDocDir();
    bindHeaderEvents();
    startTranslationObserver();

    if (currentLang === "ur") {
      ensureGoogleWidget().then(() => applyGoogleTranslationRetry("ur")).catch(console.error);
    }

    await loadUsers();
    checkSession();
    scheduleTransFix();

    if (onUsersLoaded) onUsersLoaded(users);
  }

  /* ============================================================
     PUBLIC API
  ============================================================ */
  return {
    init,
    injectHeader,
    toggleTheme,
    toggleTranslation,
    getCurrentUser,
    getUserData,
    login,
    clearSession,
    closeAllDropdowns,
    applyProfileImage,
    getImageCandidates,
    setImageWithFallback,
    buildCenteredMsg,
    escapeHTML,
    norm,
    isCancelled,
    generateUsername,
    generatePassword,
    scheduleTransFix,
    API_BASE,
    PHOTOS_BASE,
    DEFAULT_PHOTO,
  };

})();