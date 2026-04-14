/* Astra Signal — full rewritten script.js
   Assumes your HTML contains these key IDs:
   loginScreen, app, passwordInput, loginBtn, loginError, loadingOverlay,
   themeToggle, searchInput, categoryFilter, sortSelect,
   navDashboard, navReports, navProfiles, navAlerts,
   metricTotal, metricAlerts, metricReports, metricUsers,
   dashboardGrid, reportGrid, profileGrid, alertList,
   detailDrawer, detailBackdrop, detailClose, detailBody,
   appTitle, appSubtitle, sessionBadge, emptyState,
   trendChart, notificationFeed, refreshBtn
*/

(() => {
  "use strict";

  const ZIP_URLS = [
    window.DATA_ZIP_URL || "data.zip",
    "./data.zip",
    "assets/data.zip",
  ];

  const STORAGE = {
    theme: "astra.theme",
    sessionUntil: "astra.session.until",
    dataCache: "astra.data.cache",
    activeView: "astra.active.view",
  };

  const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

  const state = {
    data: null,
    unlocked: false,
    loading: false,
    theme: "dark",
    view: "dashboard",
    query: "",
    category: "all",
    sortBy: "latest",
    selected: null,
    cacheLoaded: false,
  };

  const $ = (id) => document.getElementById(id);
  const bySel = (sel, root = document) => root.querySelector(sel);
  const all = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const dom = {
    loginScreen: $("loginScreen"),
    app: $("app"),
    passwordInput: $("passwordInput"),
    loginBtn: $("loginBtn"),
    loginError: $("loginError"),
    loadingOverlay: $("loadingOverlay"),
    themeToggle: $("themeToggle"),
    searchInput: $("searchInput"),
    categoryFilter: $("categoryFilter"),
    sortSelect: $("sortSelect"),
    navDashboard: $("navDashboard"),
    navReports: $("navReports"),
    navProfiles: $("navProfiles"),
    navAlerts: $("navAlerts"),
    metricTotal: $("metricTotal"),
    metricAlerts: $("metricAlerts"),
    metricReports: $("metricReports"),
    metricUsers: $("metricUsers"),
    dashboardGrid: $("dashboardGrid"),
    reportGrid: $("reportGrid"),
    profileGrid: $("profileGrid"),
    alertList: $("alertList"),
    detailDrawer: $("detailDrawer"),
    detailBackdrop: $("detailBackdrop"),
    detailClose: $("detailClose"),
    detailBody: $("detailBody"),
    appTitle: $("appTitle"),
    appSubtitle: $("appSubtitle"),
    sessionBadge: $("sessionBadge"),
    emptyState: $("emptyState"),
    trendChart: $("trendChart"),
    notificationFeed: $("notificationFeed"),
    refreshBtn: $("refreshBtn"),
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindGlobalEvents();
    bindUIEvents();
    loadTheme();
    restoreCachedDataIfAllowed();
    restoreSessionState();

    if (state.unlocked && state.data) {
      showApp();
      renderAll();
      return;
    }

    showLogin();
    setView("dashboard");
    updateThemeUI();
    setBusy(false);
  }

  function bindGlobalEvents() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDetail();
      if (e.key === "Enter" && document.activeElement === dom.passwordInput) {
        attemptUnlock();
      }
    });

    document.addEventListener("click", (e) => {
      const closeBtn = e.target.closest("[data-close-detail]");
      if (closeBtn) closeDetail();

      const openBtn = e.target.closest("[data-open-detail]");
      if (openBtn) {
        const id = openBtn.getAttribute("data-open-detail");
        const item = findItemById(id);
        if (item) openDetail(item);
      }

      const navItem = e.target.closest("[data-view]");
      if (navItem) {
        const view = navItem.getAttribute("data-view");
        setView(view);
      }

      const tag = e.target.closest("[data-category]");
      if (tag) {
        const value = tag.getAttribute("data-category");
        if (dom.categoryFilter) dom.categoryFilter.value = value;
        state.category = value;
        renderAll();
      }
    });
  }

  function bindUIEvents() {
    if (dom.loginBtn) dom.loginBtn.addEventListener("click", attemptUnlock);

    if (dom.passwordInput) {
      dom.passwordInput.addEventListener("input", clearError);
    }

    if (dom.themeToggle) {
      dom.themeToggle.addEventListener("click", toggleTheme);
    }

    if (dom.searchInput) {
      dom.searchInput.addEventListener("input", debounce((e) => {
        state.query = (e.target.value || "").trim().toLowerCase();
        renderAll();
      }, 120));
    }

    if (dom.categoryFilter) {
      dom.categoryFilter.addEventListener("change", (e) => {
        state.category = e.target.value;
        renderAll();
      });
    }

    if (dom.sortSelect) {
      dom.sortSelect.addEventListener("change", (e) => {
        state.sortBy = e.target.value;
        renderAll();
      });
    }

    if (dom.refreshBtn) {
      dom.refreshBtn.addEventListener("click", async () => {
        if (!state.data) return;
        renderAll(true);
      });
    }

    if (dom.detailBackdrop) {
      dom.detailBackdrop.addEventListener("click", closeDetail);
    }

    if (dom.detailClose) {
      dom.detailClose.addEventListener("click", closeDetail);
    }
  }

  function showLogin() {
    if (dom.loginScreen) dom.loginScreen.style.display = "grid";
    if (dom.app) dom.app.style.display = "none";
  }

  function showApp() {
    if (dom.loginScreen) dom.loginScreen.style.display = "none";
    if (dom.app) dom.app.style.display = "grid";
  }

  function setBusy(isBusy) {
    state.loading = isBusy;
    if (dom.loadingOverlay) dom.loadingOverlay.style.display = isBusy ? "grid" : "none";
    if (dom.loginBtn) dom.loginBtn.disabled = isBusy;
    if (dom.passwordInput) dom.passwordInput.disabled = isBusy;
  }

  function setError(message) {
    if (!dom.loginError) return;
    dom.loginError.textContent = message;
    dom.loginError.style.display = "block";
  }

  function clearError() {
    if (!dom.loginError) return;
    dom.loginError.textContent = "";
    dom.loginError.style.display = "none";
  }

  function setView(view) {
    state.view = view || "dashboard";
    localStorage.setItem(STORAGE.activeView, state.view);
    updateNavState();

    if (state.data) renderAll();
  }

  function updateNavState() {
    const items = all("[data-view]");
    items.forEach((item) => {
      const active = item.getAttribute("data-view") === state.view;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-current", active ? "page" : "false");
    });
  }

  function loadTheme() {
    const saved = localStorage.getItem(STORAGE.theme);
    if (saved === "light" || saved === "dark") {
      state.theme = saved;
    } else {
      state.theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    }
    applyTheme();
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE.theme, state.theme);
    applyTheme();
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    document.body.setAttribute("data-theme", state.theme);
    updateThemeUI();
  }

  function updateThemeUI() {
    if (!dom.themeToggle) return;
    dom.themeToggle.setAttribute("aria-pressed", state.theme === "light" ? "true" : "false");
    const icon = bySel("[data-theme-icon]", dom.themeToggle);
    const label = bySel("[data-theme-label]", dom.themeToggle);
    if (icon) icon.textContent = state.theme === "dark" ? "☾" : "☀";
    if (label) label.textContent = state.theme === "dark" ? "Dark" : "Light";
  }

  function restoreSessionState() {
    const until = Number(localStorage.getItem(STORAGE.sessionUntil) || 0);
    const cachedData = localStorage.getItem(STORAGE.dataCache);

    if (cachedData && Date.now() < until) {
      try {
        state.data = normalizeData(JSON.parse(cachedData));
        state.unlocked = true;
        state.cacheLoaded = true;
        state.view = localStorage.getItem(STORAGE.activeView) || "dashboard";
        showApp();
        updateSessionBadge();
      } catch {
        clearCachedSession();
      }
    }
  }

  function restoreCachedDataIfAllowed() {
    // handled in restoreSessionState; kept for clarity
  }

  function clearCachedSession() {
    localStorage.removeItem(STORAGE.sessionUntil);
    localStorage.removeItem(STORAGE.dataCache);
    state.cacheLoaded = false;
    state.unlocked = false;
  }

  async function attemptUnlock() {
    clearError();

    const password = (dom.passwordInput?.value || "").trim();
    if (!password) {
      setError("Enter the archive password.");
      return;
    }

    if (state.loading) return;

    setBusy(true);

    try {
      const data = await loadDataFromZip(password);
      state.data = normalizeData(data);
      state.unlocked = true;
      persistSession(state.data);
      showApp();
      renderAll(true);
    } catch (err) {
      console.error(err);
      state.unlocked = false;
      state.data = null;
      setError("Wrong password, missing archive, or unreadable ZIP file.");
      showLogin();
    } finally {
      setBusy(false);
      if (dom.passwordInput) {
        dom.passwordInput.value = "";
        dom.passwordInput.focus();
      }
    }
  }

  async function loadDataFromZip(password) {
    const zipLib = window.zip;
    if (!zipLib) {
      throw new Error("zip.js is not loaded.");
    }

    let lastError = null;

    for (const url of ZIP_URLS) {
      let reader = null;
      try {
        reader = new zipLib.ZipReader(new zipLib.HttpRangeReader(url));
        const entries = await reader.getEntries({ password });

        const dataEntry = entries.find((entry) => {
          const name = (entry.filename || entry.name || "").toLowerCase();
          return name.endsWith("data.json");
        });

        if (!dataEntry) {
          throw new Error("data.json not found inside the ZIP.");
        }

        const text = await dataEntry.getData(new zipLib.TextWriter(), {
          password,
        });

        return JSON.parse(text);
      } catch (err) {
        lastError = err;
      } finally {
        if (reader) {
          try {
            await reader.close();
          } catch {
            // ignore close failures
          }
        }
      }
    }

    throw lastError || new Error("Unable to read the ZIP archive.");
  }

  function persistSession(data) {
    const until = Date.now() + SESSION_TTL_MS;
    localStorage.setItem(STORAGE.sessionUntil, String(until));
    localStorage.setItem(STORAGE.dataCache, JSON.stringify(data));
    state.cacheLoaded = true;
    updateSessionBadge();
  }

  function updateSessionBadge() {
    if (!dom.sessionBadge) return;
    const until = Number(localStorage.getItem(STORAGE.sessionUntil) || 0);
    const remainingMs = until - Date.now();
    if (remainingMs <= 0) {
      dom.sessionBadge.textContent = "Locked";
      return;
    }

    const hours = Math.max(1, Math.round(remainingMs / 36e5));
    dom.sessionBadge.textContent = `Unlocked · ${hours}h cached`;
  }

  function normalizeData(raw) {
    const data = raw && typeof raw === "object" ? raw : {};

    const coerceArray = (value) => (Array.isArray(value) ? value : []);
    const metrics = data.metrics && typeof data.metrics === "object" ? data.metrics : {};

    return {
      meta: data.meta || {},
      metrics: {
        totalUsers: Number(metrics.totalUsers || metrics.users || 0),
        activeUsers: Number(metrics.activeUsers || metrics.active || 0),
        reports: Number(metrics.reports || 0),
        alerts: Number(metrics.alerts || 0),
        critical: Number(metrics.critical || 0),
        resolved: Number(metrics.resolved || 0),
        uptime: Number(metrics.uptime || 99.9),
        responseTime: Number(metrics.responseTime || 0),
        monthlyTrend: coerceArray(metrics.monthlyTrend),
        riskTrend: coerceArray(metrics.riskTrend),
      },
      users: coerceArray(data.users),
      profiles: coerceArray(data.profiles || data.users),
      reports: coerceArray(data.reports || data.articles),
      alerts: coerceArray(data.alerts),
      notifications: coerceArray(data.notifications),
      activity: coerceArray(data.activity),
      timeline: coerceArray(data.timeline),
      settings: data.settings || {},
    };
  }

  function renderAll(force = false) {
    if (!state.data) return;

    renderHeader();
    renderStats();
    renderTrendChart();
    renderNotifications();

    switch (state.view) {
      case "profiles":
        renderProfiles();
        break;
      case "alerts":
        renderAlerts();
        break;
      case "reports":
        renderReports();
        break;
      case "dashboard":
      default:
        renderDashboard();
        break;
    }

    updateEmptyState(force);
    updateSessionBadge();
  }

  function renderHeader() {
    if (dom.appTitle) {
      dom.appTitle.textContent = state.data.meta?.title || "Astra Signal";
    }

    if (dom.appSubtitle) {
      dom.appSubtitle.textContent =
        state.data.meta?.subtitle ||
        "Premium intelligence surface for monitoring reports, alerts, and live operational signals.";
    }

    updateNavState();
  }

  function renderStats() {
    const m = state.data.metrics || {};
    setText(dom.metricTotal, m.totalUsers ?? "0");
    setText(dom.metricUsers, m.activeUsers ?? "0");
    setText(dom.metricReports, m.reports ?? "0");
    setText(dom.metricAlerts, m.alerts ?? "0");
  }

  function renderTrendChart() {
    if (!dom.trendChart) return;

    const trend = Array.isArray(state.data.metrics.monthlyTrend)
      ? state.data.metrics.monthlyTrend
      : [];

    if (!trend.length) {
      dom.trendChart.innerHTML = "";
      return;
    }

    const max = Math.max(...trend.map((n) => Number(n.value || n || 0)), 1);

    dom.trendChart.innerHTML = trend
      .map((item, index) => {
        const value = Number(item.value || item || 0);
        const label = item.label || `M${index + 1}`;
        const height = Math.max(8, Math.round((value / max) * 100));
        return `
          <div class="mini-bar" title="${escapeHtml(label)}: ${value}">
            <div class="mini-bar__fill" style="height:${height}%"></div>
            <span class="mini-bar__label">${escapeHtml(label)}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderNotifications() {
    if (!dom.notificationFeed) return;

    const items = (state.data.notifications || []).slice(0, 6);
    if (!items.length) {
      dom.notificationFeed.innerHTML = "";
      return;
    }

    dom.notificationFeed.innerHTML = items
      .map((n) => `
        <article class="notice-card notice-card--${escapeHtml(n.level || "info")}">
          <div class="notice-card__head">
            <span class="notice-card__title">${escapeHtml(n.title || "Notification")}</span>
            <span class="notice-card__pill">${escapeHtml(n.level || "info")}</span>
          </div>
          <p class="notice-card__text">${escapeHtml(n.message || "")}</p>
        </article>
      `)
      .join("");
  }

  function renderDashboard() {
    const reports = getFilteredReports();
    const alerts = getFilteredAlerts();
    const profiles = getFilteredProfiles();

    renderCardGrid(dom.dashboardGrid, reports.slice(0, 4), "report");
    renderAlertStack(dom.alertList, alerts.slice(0, 5));
    renderProfileGrid(dom.profileGrid, profiles.slice(0, 6));
    renderReports(dom.reportGrid, reports.slice(0, 8));
  }

  function renderReports(target = dom.reportGrid, list = getFilteredReports()) {
    if (!target) return;

    if (!list.length) {
      target.innerHTML = emptyMarkup("No reports matched your current filters.");
      return;
    }

    target.innerHTML = list
      .map((item) => reportCardMarkup(item))
      .join("");
  }

  function renderProfiles() {
    if (!dom.profileGrid) return;
    const list = getFilteredProfiles();

    if (!list.length) {
      dom.profileGrid.innerHTML = emptyMarkup("No profiles matched your current filters.");
      return;
    }

    dom.profileGrid.innerHTML = list.map((item) => profileCardMarkup(item)).join("");
  }

  function renderAlerts() {
    if (!dom.alertList) return;
    const list = getFilteredAlerts();

    if (!list.length) {
      dom.alertList.innerHTML = emptyMarkup("No alerts matched your current filters.");
      return;
    }

    dom.alertList.innerHTML = list.map((item) => alertCardMarkup(item)).join("");
  }

  function renderCardGrid(target, items, type) {
    if (!target) return;
    if (!items.length) {
      target.innerHTML = emptyMarkup(`No ${type}s available.`);
      return;
    }
    target.innerHTML = items.map((item) => reportCardMarkup(item)).join("");
  }

  function renderProfileGrid(target, items) {
    if (!target) return;
    if (!items.length) {
      target.innerHTML = emptyMarkup("No profiles available.");
      return;
    }
    target.innerHTML = items.map((item) => profileCardMarkup(item)).join("");
  }

  function renderAlertStack(target, items) {
    if (!target) return;
    if (!items.length) {
      target.innerHTML = emptyMarkup("No alerts available.");
      return;
    }
    target.innerHTML = items.map((item) => alertCardMarkup(item)).join("");
  }

  function getFilteredReports() {
    const q = state.query;
    const cat = state.category;
    const sort = state.sortBy;

    let items = [...(state.data.reports || [])].map((item, index) => ({
      ...item,
      _index: index,
      _type: "report",
    }));

    if (cat !== "all") {
      items = items.filter((item) => normalizeCategory(item.category) === normalizeCategory(cat));
    }

    if (q) {
      items = items.filter((item) => matchesQuery(item, q));
    }

    return sortItems(items, sort);
  }

  function getFilteredProfiles() {
    const q = state.query;
    const cat = state.category;
    let items = [...(state.data.profiles || [])].map((item, index) => ({
      ...item,
      _index: index,
      _type: "profile",
    }));

    if (cat !== "all") {
      items = items.filter((item) => normalizeCategory(item.department || item.role || item.category) === normalizeCategory(cat));
    }

    if (q) {
      items = items.filter((item) => matchesQuery(item, q));
    }

    return items.sort((a, b) => {
      const priorityA = Number(b.priority || 0);
      const priorityB = Number(a.priority || 0);
      return priorityB - priorityA;
    });
  }

  function getFilteredAlerts() {
    const q = state.query;
    const cat = state.category;
    let items = [...(state.data.alerts || [])].map((item, index) => ({
      ...item,
      _index: index,
      _type: "alert",
    }));

    if (cat !== "all") {
      items = items.filter((item) => normalizeCategory(item.level || item.category) === normalizeCategory(cat));
    }

    if (q) {
      items = items.filter((item) => matchesQuery(item, q));
    }

    return items.sort((a, b) => severityRank(a.level) - severityRank(b.level));
  }

  function matchesQuery(item, query) {
    const haystack = [
      item.title,
      item.name,
      item.summary,
      item.description,
      item.content,
      item.category,
      item.level,
      item.role,
      item.department,
      ...(Array.isArray(item.tags) ? item.tags : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  }

  function sortItems(items, sort) {
    const cloned = [...items];

    switch (sort) {
      case "priority":
        return cloned.sort((a, b) => Number(b.priority || b.impact || 0) - Number(a.priority || a.impact || 0));
      case "impact":
        return cloned.sort((a, b) => Number(b.impact || b.score || 0) - Number(a.impact || a.score || 0));
      case "oldest":
        return cloned.sort((a, b) => toTime(a.publishedAt || a.date) - toTime(b.publishedAt || b.date));
      case "latest":
      default:
        return cloned.sort((a, b) => toTime(b.publishedAt || b.date) - toTime(a.publishedAt || a.date));
    }
  }

  function normalizeCategory(value) {
    return String(value || "all").trim().toLowerCase();
  }

  function severityRank(level) {
    const map = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return map[String(level || "").toLowerCase()] ?? 4;
  }

  function toTime(value) {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  }

  function reportCardMarkup(item) {
    const id = escapeAttr(item.id || item.slug || item.title || cryptoId());
    const title = escapeHtml(item.title || "Untitled report");
    const summary = escapeHtml(item.summary || item.description || "");
    const category = escapeHtml(item.category || "General");
    const date = prettyDate(item.publishedAt || item.date);
    const impact = Number(item.impact || item.priority || 0);
    const source = escapeHtml(item.source || "Internal feed");
    const tags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];

    return `
      <article class="glass-card report-card" data-open-detail="${id}" tabindex="0" role="button" aria-label="Open ${title}">
        <div class="report-card__top">
          <span class="badge badge--soft">${category}</span>
          <span class="report-card__impact">${impactLabel(impact)}</span>
        </div>

        <h3 class="report-card__title">${title}</h3>
        <p class="report-card__summary">${summary}</p>

        <div class="report-card__meta">
          <span>${date}</span>
          <span>${source}</span>
        </div>

        <div class="report-card__tags">
          ${tags.map((tag) => `<button class="chip" data-category="${escapeAttr(tag)}">${escapeHtml(tag)}</button>`).join("")}
        </div>
      </article>
    `;
  }

  function profileCardMarkup(item) {
    const id = escapeAttr(item.id || item.username || item.name || cryptoId());
    const name = escapeHtml(item.name || "Unknown profile");
    const role = escapeHtml(item.role || item.title || "Role not set");
    const dept = escapeHtml(item.department || item.category || "Team");
    const status = escapeHtml(item.status || "Active");
    const avatar = escapeHtml((item.avatar || item.initials || name.slice(0, 2)).toUpperCase());

    return `
      <article class="glass-card profile-card" data-open-detail="${id}" tabindex="0" role="button" aria-label="Open ${name}">
        <div class="profile-card__avatar">${avatar}</div>
        <div class="profile-card__body">
          <h3>${name}</h3>
          <p>${role}</p>
          <div class="profile-card__meta">
            <span>${dept}</span>
            <span>${status}</span>
          </div>
        </div>
      </article>
    `;
  }

  function alertCardMarkup(item) {
    const id = escapeAttr(item.id || item.code || item.title || cryptoId());
    const level = String(item.level || "info").toLowerCase();
    const title = escapeHtml(item.title || "Alert");
    const message = escapeHtml(item.message || item.summary || "");
    const date = prettyDate(item.createdAt || item.date);
    const status = escapeHtml(item.status || "open");

    return `
      <article class="glass-card alert-card alert-card--${escapeAttr(level)}" data-open-detail="${id}" tabindex="0" role="button" aria-label="Open ${title}">
        <div class="alert-card__head">
          <span class="badge badge--${escapeAttr(level)}">${level}</span>
          <span class="alert-card__status">${status}</span>
        </div>
        <h3 class="alert-card__title">${title}</h3>
        <p class="alert-card__message">${message}</p>
        <div class="alert-card__meta">
          <span>${date}</span>
        </div>
      </article>
    `;
  }

  function impactLabel(value) {
    const num = Number(value || 0);
    if (num >= 90) return "Critical";
    if (num >= 70) return "High";
    if (num >= 40) return "Medium";
    return "Low";
  }

  function findItemById(id) {
    if (!state.data || !id) return null;

    const pools = [
      ...(state.data.reports || []),
      ...(state.data.alerts || []),
      ...(state.data.profiles || []),
      ...(state.data.notifications || []),
      ...(state.data.activity || []),
    ];

    return pools.find((item) => String(item.id || item.slug || item.code || item.username || item.name) === String(id)) || null;
  }

  function openDetail(item) {
    state.selected = item;
    if (!dom.detailDrawer || !dom.detailBody) return;

    dom.detailBody.innerHTML = detailMarkup(item);
    dom.detailDrawer.classList.add("is-open");
    if (dom.detailBackdrop) dom.detailBackdrop.classList.add("is-open");

    const closeButton = bySel("[data-close-detail]", dom.detailDrawer);
    if (closeButton) closeButton.focus();
  }

  function closeDetail() {
    state.selected = null;
    if (dom.detailDrawer) dom.detailDrawer.classList.remove("is-open");
    if (dom.detailBackdrop) dom.detailBackdrop.classList.remove("is-open");
  }

  function detailMarkup(item) {
    const title = escapeHtml(item.title || item.name || "Details");
    const category = escapeHtml(item.category || item.department || item.level || "Overview");
    const body =
      item.content ||
      item.description ||
      item.summary ||
      "This item has no extended description in the dataset.";

    const tags = Array.isArray(item.tags) ? item.tags : [];
    const stats = [
      ["Priority", item.priority ?? item.impact ?? "—"],
      ["Status", item.status ?? item.level ?? "—"],
      ["Owner", item.owner ?? item.assignee ?? item.source ?? "—"],
      ["Updated", prettyDate(item.updatedAt || item.publishedAt || item.date)],
    ];

    const related = Array.isArray(item.related) ? item.related : [];
    const timeline = Array.isArray(item.timeline) ? item.timeline : [];

    return `
      <div class="detail-panel">
        <div class="detail-panel__head">
          <div>
            <span class="badge badge--soft">${category}</span>
            <h2>${title}</h2>
          </div>
          <button class="icon-btn" data-close-detail aria-label="Close detail">✕</button>
        </div>

        <p class="detail-panel__body">${escapeHtml(body)}</p>

        <div class="detail-stats">
          ${stats
            .map(
              ([label, value]) => `
                <div class="detail-stat">
                  <span>${escapeHtml(label)}</span>
                  <strong>${escapeHtml(String(value))}</strong>
                </div>
              `
            )
            .join("")}
        </div>

        ${
          tags.length
            ? `
          <div class="detail-section">
            <h3>Tags</h3>
            <div class="chip-row">
              ${tags.map((tag) => `<button class="chip" data-category="${escapeAttr(tag)}">${escapeHtml(tag)}</button>`).join("")}
            </div>
          </div>`
            : ""
        }

        ${
          related.length
            ? `
          <div class="detail-section">
            <h3>Related</h3>
            <div class="related-list">
              ${related
                .slice(0, 6)
                .map((name) => `<div class="related-item">${escapeHtml(String(name))}</div>`)
                .join("")}
            </div>
          </div>`
            : ""
        }

        ${
          timeline.length
            ? `
          <div class="detail-section">
            <h3>Timeline</h3>
            <div class="timeline">
              ${timeline
                .slice(0, 6)
                .map((step) => `
                  <div class="timeline__item">
                    <span class="timeline__dot"></span>
                    <div>
                      <strong>${escapeHtml(step.label || step.title || "Update")}</strong>
                      <p>${escapeHtml(step.note || step.description || "")}</p>
                    </div>
                  </div>
                `)
                .join("")}
            </div>
          </div>`
            : ""
        }
      </div>
    `;
  }

  function updateEmptyState(force = false) {
    if (!dom.emptyState) return;
    const isEmpty =
      (!getFilteredReports().length &&
        !getFilteredProfiles().length &&
        !getFilteredAlerts().length) || force;

    dom.emptyState.style.display = isEmpty ? "none" : "block";
  }

  function emptyMarkup(message) {
    return `
      <div class="empty-state">
        <h3>Nothing to show</h3>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function setText(node, value) {
    if (!node) return;
    node.textContent = value == null ? "—" : String(value);
  }

  function prettyDate(value) {
    const t = Date.parse(value);
    if (!Number.isFinite(t)) return "—";
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(t));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#96;");
  }

  function cryptoId() {
    return Math.random().toString(36).slice(2, 10);
  }

  function debounce(fn, wait = 120) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }
})();