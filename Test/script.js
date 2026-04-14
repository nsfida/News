const ZIP_PATH = 'data-secure.zip';
const SESSION_KEY = 'aether-signal-session';
const THEME_KEY = 'aether-signal-theme';

const els = {
  authOverlay: document.getElementById('authOverlay'),
  unlockForm: document.getElementById('unlockForm'),
  passwordInput: document.getElementById('passwordInput'),
  rememberSession: document.getElementById('rememberSession'),
  unlockButton: document.getElementById('unlockButton'),
  togglePassword: document.getElementById('togglePassword'),
  authMessage: document.getElementById('authMessage'),
  appShell: document.getElementById('appShell'),
  themeToggle: document.getElementById('themeToggle'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  reportsGrid: document.getElementById('reportsGrid'),
  reportDetail: document.getElementById('reportDetail'),
  categoryChips: document.getElementById('categoryChips'),
  trendChart: document.getElementById('trendChart'),
  regionList: document.getElementById('regionList'),
  profileList: document.getElementById('profileList'),
  notificationList: document.getElementById('notificationList'),
  activityList: document.getElementById('activityList'),
  heroTitle: document.getElementById('heroTitle'),
  heroSubtitle: document.getElementById('heroSubtitle'),
  coverageValue: document.getElementById('coverageValue'),
  refreshValue: document.getElementById('refreshValue'),
  heroCoverage: document.getElementById('heroCoverage'),
  heroRefresh: document.getElementById('heroRefresh'),
  productTitle: document.getElementById('productTitle'),
  riskIndexBig: document.getElementById('riskIndexBig'),
  riskDeltaBig: document.getElementById('riskDeltaBig'),
  confidenceBig: document.getElementById('confidenceBig'),
  metricAlerts: document.getElementById('metricAlerts'),
  metricReports: document.getElementById('metricReports'),
  metricWatchlist: document.getElementById('metricWatchlist'),
  metricResponse: document.getElementById('metricResponse'),
  regionsUnderReview: document.getElementById('regionsUnderReview')
};

const state = {
  data: null,
  selectedCategory: 'all',
  selectedReportId: null,
  query: '',
  sort: 'latest',
  theme: localStorage.getItem(THEME_KEY) || 'dark',
  password: sessionStorage.getItem(SESSION_KEY) || ''
};

const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };

document.addEventListener('DOMContentLoaded', boot);

function boot() {
  applyTheme(state.theme);
  wireUi();
  showAuth('Enter the vault password to load the encrypted dataset.');
  if (state.password) {
    unlock(state.password, { silent: true });
  }
}

function wireUi() {
  els.unlockForm.addEventListener('submit', (event) => {
    event.preventDefault();
    unlock(els.passwordInput.value.trim());
  });

  els.togglePassword.addEventListener('click', () => {
    const isPassword = els.passwordInput.type === 'password';
    els.passwordInput.type = isPassword ? 'text' : 'password';
    els.togglePassword.textContent = isPassword ? '🙈' : '👁';
    els.togglePassword.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    els.passwordInput.focus();
  });

  els.themeToggle.addEventListener('click', () => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    state.theme = next;
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  els.searchInput.addEventListener('input', () => {
    state.query = els.searchInput.value.trim().toLowerCase();
    renderReports();
  });

  els.sortSelect.addEventListener('change', () => {
    state.sort = els.sortSelect.value;
    renderReports();
  });

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-report-id]');
    if (target) {
      state.selectedReportId = target.dataset.reportId;
      renderReports();
      renderDetail();
    }

    const chip = event.target.closest('[data-category]');
    if (chip) {
      state.selectedCategory = chip.dataset.category;
      renderChips();
      renderReports();
      renderDetail();
    }

    const jump = event.target.closest('[data-jump]');
    if (jump) {
      const id = jump.dataset.jump;
      const section = document.getElementById(id);
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('.nav-item').forEach((btn) => btn.classList.toggle('active', btn === jump));
    }
  });
}

async function unlock(password, { silent = false } = {}) {
  clearAuthMessage();
  setLoading(true);
  if (!password) {
    showAuth('Please enter the access password.');
    setLoading(false);
    return;
  }

  try {
    const response = await fetch(ZIP_PATH, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Unable to load ${ZIP_PATH}`);
    }

    const blob = await response.blob();
    const reader = new zip.ZipReader(new zip.BlobReader(blob));
    const entries = await reader.getEntries();
    const entry = entries.find((item) => item.filename.endsWith('data.json')) || entries[0];

    if (!entry) {
      throw new Error('Encrypted bundle does not contain data.json.');
    }

    const raw = await entry.getData(new zip.TextWriter(), { password, checkSignature: true });
    await reader.close();

    state.data = JSON.parse(raw);
    state.selectedReportId = state.data.reports?.[0]?.id || null;

    if (els.rememberSession.checked) {
      sessionStorage.setItem(SESSION_KEY, password);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }

    showApp();
    renderAll();
    if (!silent) clearAuthMessage();
  } catch (error) {
    sessionStorage.removeItem(SESSION_KEY);
    state.data = null;
    state.selectedReportId = null;
    showAuth(normalizeZipError(error));
    shakeAuth();
    els.passwordInput.focus();
    els.passwordInput.select();
  } finally {
    setLoading(false);
  }
}

function normalizeZipError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('invalid password') || message.includes('err_invalid_password') || message.includes('password')) {
    return 'Incorrect password. Please try again.';
  }
  if (message.includes('failed to fetch') || message.includes('load')) {
    return 'The encrypted bundle could not be loaded.';
  }
  return 'The vault could not be opened. Please retry.';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function showApp() {
  els.authOverlay.classList.add('hidden');
  els.appShell.classList.remove('hidden');
  document.body.style.overflow = 'auto';
}

function showAuth(message) {
  els.authOverlay.classList.remove('hidden');
  els.appShell.classList.add('hidden');
  document.body.style.overflow = 'hidden';
  if (message) els.authMessage.textContent = message;
}

function clearAuthMessage() { els.authMessage.textContent = ''; }

function shakeAuth() {
  const card = els.authOverlay.querySelector('.auth-card');
  card.classList.remove('shake');
  void card.offsetWidth;
  card.classList.add('shake');
}

function setLoading(isLoading) {
  els.unlockButton.disabled = isLoading;
  els.unlockButton.classList.toggle('loading', isLoading);
}

function renderAll() {
  const { organization, stats, reports, regions, users, notifications, activity, timeline } = state.data;

  els.productTitle.textContent = organization.name;
  els.heroTitle.textContent = organization.tagline;
  els.heroSubtitle.textContent = organization.subtitle;
  els.coverageValue.textContent = organization.coverage;
  els.refreshValue.textContent = `Refreshes every ${organization.refreshInterval}`;
  els.heroCoverage.textContent = organization.coverage;
  els.heroRefresh.textContent = `Refreshes every ${organization.refreshInterval}`;
  els.riskIndexBig.textContent = stats.riskIndex;
  els.riskDeltaBig.textContent = `${stats.riskDelta > 0 ? '+' : ''}${stats.riskDelta}% since yesterday`;
  els.confidenceBig.textContent = `${stats.confidence}%`;
  els.metricAlerts.textContent = stats.activeAlerts;
  els.metricReports.textContent = stats.openReports;
  els.metricWatchlist.textContent = stats.watchlistEntities;
  els.metricResponse.textContent = `${stats.responseTimeMinutes}m`;
  els.regionsUnderReview.textContent = `${stats.regionsUnderReview} regions under review`;

  renderChart(timeline);
  renderRegionList(regions);
  renderChips(reports);
  renderReports();
  renderDetail();
  renderProfiles(users);
  renderNotifications(notifications);
  renderActivity(activity);
}

function renderChart(points) {
  const width = 760;
  const height = 240;
  const padding = 24;
  const values = points.map((point) => point.score);
  const min = Math.min(...values) - 4;
  const max = Math.max(...values) + 4;
  const xStep = (width - padding * 2) / (values.length - 1);

  const coords = values.map((value, index) => {
    const x = padding + xStep * index;
    const y = height - padding - ((value - min) / (max - min)) * (height - padding * 2);
    return { x, y, value, label: points[index].date };
  });

  const area = [
    `M ${coords[0].x} ${height - padding}`,
    `L ${coords[0].x} ${coords[0].y}`,
    ...coords.slice(1).map((point) => `L ${point.x} ${point.y}`),
    `L ${coords[coords.length - 1].x} ${height - padding}`,
    'Z'
  ].join(' ');

  const line = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const grid = [0, 1, 2, 3, 4].map((lineIndex) => {
    const y = padding + ((height - padding * 2) / 4) * lineIndex;
    return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" class="chart-grid"></line>`;
  }).join('');
  const ticks = coords.map((point) => `
    <g>
      <circle cx="${point.x}" cy="${point.y}" r="5.5" class="chart-dot"></circle>
      <text x="${point.x}" y="${height - 8}" class="chart-label">${formatDate(point.label)}</text>
    </g>`).join('');

  els.trendChart.innerHTML = `
    <defs>
      <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="rgba(120,240,215,.35)" />
        <stop offset="100%" stop-color="rgba(120,240,215,0)" />
      </linearGradient>
      <linearGradient id="lineStroke" x1="0" x2="1">
        <stop offset="0%" stop-color="#78f0d7" />
        <stop offset="100%" stop-color="#8aa7ff" />
      </linearGradient>
    </defs>
    ${grid}
    <path d="${area}" fill="url(#lineFill)" opacity="0.7"></path>
    <path d="${line}" fill="none" stroke="url(#lineStroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
    ${ticks}
  `;
}

function renderRegionList(regions) {
  els.regionList.innerHTML = regions.sort((a, b) => b.score - a.score).map((region) => `
    <article class="region-item">
      <div class="region-top">
        <div>
          <strong>${region.name}</strong>
          <div class="region-meta">${region.note}</div>
        </div>
        <span class="level ${region.score > 80 ? 'critical' : region.score > 65 ? 'high' : region.score > 50 ? 'medium' : 'low'}">${region.score}</span>
      </div>
      <div class="meter" aria-hidden="true"><span style="width:${region.score}%"></span></div>
      <div class="region-meta">${region.focus} • ${region.trend > 0 ? '+' : ''}${region.trend} trend</div>
    </article>
  `).join('');
}

function renderChips(reports = state.data.reports) {
  const categories = ['all', ...new Set(reports.map((report) => report.category))];
  els.categoryChips.innerHTML = categories.map((category) => `
    <button class="chip ${state.selectedCategory === category ? 'active' : ''}" data-category="${category}">
      ${category === 'all' ? 'All briefs' : capitalize(category)}
    </button>
  `).join('');
}

function renderReports() {
  const reports = filterReports();
  if (!reports.length) {
    els.reportsGrid.innerHTML = `<div class="report-card"><strong>No results found.</strong><div class="region-meta">Try a different search term or category.</div></div>`;
    return;
  }

  els.reportsGrid.innerHTML = reports.map((report) => {
    const selected = report.id === state.selectedReportId;
    const level = report.severity;
    return `
      <article class="report-card ${selected ? 'selected' : ''}" data-report-id="${report.id}">
        <div class="report-top">
          <div>
            <span class="level ${level}">${level}</span>
            <div class="report-meta">${report.region} • ${formatDateTime(report.updatedAt)} • ${report.readingTime} min read</div>
          </div>
          <div class="report-meta">${report.confidence}% confidence</div>
        </div>
        <h4 class="report-title">${report.title}</h4>
        <div class="report-meta">${report.summary}</div>
        <div class="tag-row">${report.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}</div>
      </article>
    `;
  }).join('');
}

function renderDetail() {
  const report = state.data.reports.find((item) => item.id === state.selectedReportId) || state.data.reports[0];
  state.selectedReportId = report.id;
  const author = state.data.users.find((person) => person.id === report.authorId);

  els.reportDetail.innerHTML = `
    <p class="eyebrow">Detailed view</p>
    <div class="report-top">
      <div>
        <span class="level ${report.severity}">${report.severity}</span>
        <div class="report-meta">${report.category} • ${report.region}</div>
      </div>
      <div class="report-meta">Updated ${formatDateTime(report.updatedAt)}</div>
    </div>
    <h3 class="detail-title">${report.title}</h3>
    <p class="detail-copy">${report.summary}</p>
    <div class="metric-row">
      <div class="metric-box"><span>Impact</span><strong>${report.metrics.impact}</strong></div>
      <div class="metric-box"><span>Urgency</span><strong>${report.metrics.urgency}</strong></div>
      <div class="metric-box"><span>Volatility</span><strong>${report.metrics.volatility}</strong></div>
    </div>
    <div class="detail-section">
      <h4>Executive summary</h4>
      ${report.body.map((paragraph) => `<p class="detail-copy">${paragraph}</p>`).join('')}
    </div>
    <div class="detail-section">
      <h4>Key findings</h4>
      <ul class="bullet-list">${report.findings.map((item) => `<li>${item}</li>`).join('')}</ul>
    </div>
    <div class="detail-section">
      <h4>Recommended actions</h4>
      <ul class="bullet-list">${report.actions.map((item) => `<li>${item}</li>`).join('')}</ul>
    </div>
    <div class="detail-section">
      <h4>Ownership</h4>
      <div class="profile-item">
        <div class="profile-top">
          <div style="display:flex;gap:12px;align-items:center;">
            <div class="avatar">${author?.avatar || 'AS'}</div>
            <div>
              <strong>${author?.name || 'Aether Intelligence'}</strong>
              <div class="profile-meta">${author?.role || 'Automated summary'} • ${report.readingTime} min read</div>
            </div>
          </div>
          <span class="badge">${report.status}</span>
        </div>
      </div>
    </div>
  `;
}

function renderProfiles(users) {
  els.profileList.innerHTML = users.map((user) => `
    <article class="profile-item">
      <div class="profile-top">
        <div style="display:flex;gap:12px;align-items:center;">
          <div class="avatar">${user.avatar}</div>
          <div>
            <strong>${user.name}</strong>
            <div class="profile-meta">${user.role}</div>
          </div>
        </div>
        <span class="badge">${user.status}</span>
      </div>
      <div class="profile-meta">${user.team} • ${user.location}</div>
      <div class="profile-meta">Last active ${formatRelative(user.lastActive)}</div>
    </article>
  `).join('');
}

function renderNotifications(notifications) {
  els.notificationList.innerHTML = notifications.map((note) => `
    <article class="notification-item ${note.read ? '' : 'unread'}">
      <strong>${capitalize(note.type)}</strong>
      <div class="notification-meta">${note.message}</div>
      <div class="notification-meta">${note.time}</div>
    </article>
  `).join('');
}

function renderActivity(activity) {
  els.activityList.innerHTML = activity.map((item) => `
    <article class="activity-item">
      <strong>${item.who}</strong>
      <div class="activity-meta">${item.action}</div>
      <div class="activity-meta">${item.time}</div>
    </article>
  `).join('');
}

function filterReports() {
  let reports = [...state.data.reports];
  if (state.selectedCategory !== 'all') reports = reports.filter((report) => report.category === state.selectedCategory);
  if (state.query) {
    reports = reports.filter((report) => {
      const haystack = [report.title, report.summary, report.category, report.region, ...(report.tags || [])].join(' ').toLowerCase();
      return haystack.includes(state.query);
    });
  }

  reports.sort((a, b) => {
    if (state.sort === 'severity') return severityRank[b.severity] - severityRank[a.severity] || new Date(b.updatedAt) - new Date(a.updatedAt);
    if (state.sort === 'confidence') return b.confidence - a.confidence || new Date(b.updatedAt) - new Date(a.updatedAt);
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  return reports;
}

function formatDate(iso) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

function formatDateTime(iso) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
