
/* Market Intelligence & Prediction Dashboard
   Static-only client-side engine with JSON loading, analysis, and rendering. */

const FALLBACK_DATA = window.__FALLBACK_DATA__ || {};

const STORAGE_KEYS = {
  data: 'mi-dashboard:data',
  settings: 'mi-dashboard:settings',
  session: 'mi-dashboard:session',
  watchlist: 'mi-dashboard:watchlist'
};

const DATA_PATHS = {
  assets: 'data/assets.json',
  prices: 'data/prices.json',
  news: 'data/news.json',
  indicators: 'data/indicators.json',
  predictions: 'data/predictions.json',
  watchlist: 'data/watchlist.json',
  settings: 'data/settings.json',
  history: 'data/history.json',
  alerts: 'data/alerts.json'
};

const SECTION_IDS = ['dashboard', 'explorer', 'news', 'prediction', 'watchlist', 'data', 'settings', 'about'];

const state = {
  datasets: null,
  selectedAssetId: 'NVDA',
  activeSection: 'dashboard',
  filters: {
    search: '',
    type: 'all',
    exchange: 'all',
    sentiment: 'all',
    signal: 'all',
    sortBy: 'confidence-desc'
  },
  settings: null,
  lastLoadSource: 'sample',
  lastUpdated: null,
  autoRefreshTimer: null
};

const els = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheElements();
  bindNav();
  bindTopbar();
  loadSessionState();
  await loadAllData();
  applyStateToUI();
  bindDynamicActions();
  renderAll();
  startAutoRefresh();
}

function cacheElements() {
  const ids = [
    'connectionDot','sessionStatus','freshnessSummary','reliabilitySummary','activeModeChip','lastUpdateChip',
    'assetSearch','typeFilter','exchangeFilter','sentimentFilter','signalFilter','sortBy','refreshBtn',
    'saveStorageBtn','overviewStats','selectedAssetSummary','marketOverviewSummary','marketChart','dashboardNews',
    'topMovers','topSetups','conflictingSignals','assetCountHint','assetGrid','detailTitle','toggleWatchBtn',
    'exportSelectedBtn','assetDetail','detailChart','newsFeed','predictionList','watchlistView','exportControls',
    'importControls','saveAllBtn','clearCacheBtn','restoreSampleBtn','sourceReliabilityBox','settingsForm',
    'toast','marketClock','openExplorerFromDashboard','exportNewsBtn','exportPredictionsBtn','exportWatchlistBtn'
  ];
  ids.forEach(id => els[id] = document.getElementById(id));
}

function bindNav() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeSection = btn.dataset.section;
      setActiveSection(state.activeSection);
      saveSessionState();
    });
  });
}

function bindTopbar() {
  els.assetSearch.addEventListener('input', (e) => {
    state.filters.search = e.target.value.trim().toLowerCase();
    saveSessionState();
    renderAll();
  });
  ['typeFilter','exchangeFilter','sentimentFilter','signalFilter','sortBy'].forEach(id => {
    els[id].addEventListener('change', (e) => {
      state.filters[id.replace('Filter','')] = e.target.value;
      if (id === 'sortBy') state.filters.sortBy = e.target.value;
      saveSessionState();
      renderAll();
    });
  });
  els.refreshBtn.addEventListener('click', async () => {
    await loadAllData(true);
    renderAll();
    toast('Data refreshed.');
  });
  els.saveStorageBtn.addEventListener('click', () => {
    saveAllToStorage();
    toast('Current data saved to browser storage.');
  });
  els.openExplorerFromDashboard.addEventListener('click', () => {
    state.activeSection = 'explorer';
    setActiveSection('explorer');
    saveSessionState();
  });
}

function bindDynamicActions() {
  els.toggleWatchBtn?.addEventListener('click', toggleSelectedWatchlist);
  els.exportSelectedBtn?.addEventListener('click', () => exportSelectedAsset());
  els.exportNewsBtn?.addEventListener('click', () => exportDataset('news'));
  els.exportPredictionsBtn?.addEventListener('click', () => exportDataset('predictions'));
  els.exportWatchlistBtn?.addEventListener('click', () => exportDataset('watchlist'));
  els.saveAllBtn?.addEventListener('click', () => {
    saveAllToStorage();
    toast('Saved datasets, settings, and watchlist.');
  });
  els.clearCacheBtn?.addEventListener('click', clearStorage);
  els.restoreSampleBtn?.addEventListener('click', async () => {
    localStorage.removeItem(STORAGE_KEYS.data);
    localStorage.removeItem(STORAGE_KEYS.settings);
    localStorage.removeItem(STORAGE_KEYS.watchlist);
    sessionStorage.removeItem(STORAGE_KEYS.session);
    state.selectedAssetId = 'NVDA';
    await loadAllData(false, true);
    renderAll();
    toast('Bundled sample data restored.');
  });
  document.addEventListener('click', (e) => {
    const assetBtn = e.target.closest('[data-asset-id]');
    if (assetBtn) {
      state.selectedAssetId = assetBtn.dataset.assetId;
      saveSessionState();
      renderAll();
    }
    const watchBtn = e.target.closest('[data-watch-toggle]');
    if (watchBtn) {
      state.selectedAssetId = watchBtn.dataset.assetId;
      toggleWatchlist(watchBtn.dataset.assetId);
      renderAll();
    }
    const exportBtn = e.target.closest('[data-export-dataset]');
    if (exportBtn) {
      exportDataset(exportBtn.dataset.exportDataset);
    }
  });

  const fileInputs = document.querySelectorAll('input[type="file"][data-import-target]');
  fileInputs.forEach(input => {
    input.addEventListener('change', async (e) => {
      const target = e.target.dataset.importTarget;
      const file = e.target.files?.[0];
      if (!file) return;
      await importDatasetFromFile(target, file);
      e.target.value = '';
    });
  });

  const settingInputs = document.querySelectorAll('[data-setting-path]');
  settingInputs.forEach(input => {
    input.addEventListener('change', handleSettingsChange);
    input.addEventListener('input', handleSettingsChange);
  });
}

function loadSessionState() {
  try {
    const session = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.session) || '{}');
    if (session.activeSection) state.activeSection = session.activeSection;
    if (session.selectedAssetId) state.selectedAssetId = session.selectedAssetId;
    if (session.filters) state.filters = { ...state.filters, ...session.filters };
  } catch (err) {
    console.warn('Session state could not be loaded.', err);
  }
}

function saveSessionState() {
  sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify({
    activeSection: state.activeSection,
    selectedAssetId: state.selectedAssetId,
    filters: state.filters
  }));
}

function normalizeDataShape(raw) {
  const output = {
    assets: raw.assets || [],
    prices: raw.prices || {},
    news: raw.news || { items: [] },
    indicators: raw.indicators || {},
    predictions: raw.predictions || {},
    watchlist: raw.watchlist || { assets: [] },
    settings: raw.settings || {},
    history: raw.history || { updates: [] },
    alerts: raw.alerts || { items: [] }
  };
  return output;
}

async function loadAllData(forceFetch = false, useSampleFallback = false) {
  const cached = loadCachedData();
  const sources = {};

  if (!forceFetch && cached) {
    state.datasets = cached;
    state.settings = { ...FALLBACK_DATA.settings, ...cached.settings };
    state.lastLoadSource = 'browser cache';
    state.lastUpdated = getLatestUpdated(cached);
    updateHeaderState();
    return;
  }

  const keys = Object.keys(DATA_PATHS);
  const fetches = keys.map(async (key) => {
    const url = DATA_PATHS[key];
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      sources[key] = await res.json();
      return true;
    } catch (err) {
      sources[key] = useSampleFallback ? FALLBACK_DATA[key] : (cached?.[key] ?? FALLBACK_DATA[key]);
      return false;
    }
  });

  const results = await Promise.all(fetches);
  const data = normalizeDataShape(sources);
  state.datasets = data;
  state.settings = { ...FALLBACK_DATA.settings, ...data.settings };
  state.lastLoadSource = results.every(Boolean) ? 'remote JSON' : (cached ? 'browser cache + fallback' : 'sample JSON');
  state.lastUpdated = getLatestUpdated(data);
  saveAllToStorage(false);
  updateHeaderState();
}

function loadCachedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.data);
    return raw ? normalizeDataShape(JSON.parse(raw)) : null;
  } catch (err) {
    console.warn('Unable to read cached data.', err);
    return null;
  }
}

function saveAllToStorage(showToast = true) {
  if (!state.datasets) return;
  localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(state.datasets));
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings || {}));
  localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(state.datasets.watchlist || { assets: [] }));
  saveSessionState();
  if (showToast) toast('Browser storage updated.');
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEYS.data);
  localStorage.removeItem(STORAGE_KEYS.settings);
  localStorage.removeItem(STORAGE_KEYS.watchlist);
  sessionStorage.removeItem(STORAGE_KEYS.session);
  toast('Browser cache cleared for this app.');
}

function handleSettingsChange(e) {
  const path = e.target.dataset.settingPath;
  const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  setNestedValue(state.settings, path, coerceSettingValue(value));
  state.datasets.settings = state.settings;
  saveAllToStorage(false);
  renderAll();
}

function coerceSettingValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === '' || value === null || value === undefined) return value;
  const num = Number(value);
  return Number.isFinite(num) && String(num) === String(value).replace(/\.0+$/, '') ? num : value;
}

function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  while (parts.length > 1) {
    const key = parts.shift();
    if (!cur[key] || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key];
  }
  cur[parts[0]] = value;
}

function getLatestUpdated(data) {
  const timestamps = [];
  Object.values(data.prices || {}).forEach(p => p?.lastUpdated && timestamps.push(new Date(p.lastUpdated).getTime()));
  Object.values(data.predictions || {}).forEach(p => p?.updatedAt && timestamps.push(new Date(p.updatedAt).getTime()));
  (data.news?.items || []).forEach(n => n?.publishedAt && timestamps.push(new Date(n.publishedAt).getTime()));
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : new Date().toISOString();
}

function updateHeaderState() {
  const freshness = calcFreshnessSummary();
  const reliability = calcReliabilityScore();
  els.connectionDot.style.background = freshness.level === 'fresh' ? 'var(--success)' : freshness.level === 'mixed' ? 'var(--warn)' : 'var(--danger)';
  els.connectionDot.style.boxShadow = freshness.level === 'fresh' ? '0 0 0 4px rgba(52,211,153,.12)' : freshness.level === 'mixed' ? '0 0 0 4px rgba(251,191,36,.12)' : '0 0 0 4px rgba(248,113,113,.12)';
  els.sessionStatus.textContent = `${state.lastLoadSource} • ${state.datasets?.assets?.length || 0} assets loaded`;
  els.freshnessSummary.textContent = freshness.label;
  els.reliabilitySummary.textContent = `${reliability}%`;
  els.activeModeChip.textContent = `Mode: ${(state.settings?.mode || 'live').replace(/^./, s => s.toUpperCase())}`;
  els.lastUpdateChip.textContent = `Updated ${formatRelativeTime(state.lastUpdated)}`;
  els.marketClock.textContent = `Last refresh: ${formatDateTime(state.lastUpdated)}`;
}

function calcFreshnessSummary() {
  const items = [];
  const data = state.datasets;
  if (!data) return { label: '—', level: 'stale' };
  Object.values(data.prices || {}).forEach(x => x?.lastUpdated && items.push(ageMinutes(x.lastUpdated)));
  (data.news?.items || []).forEach(x => x?.publishedAt && items.push(ageMinutes(x.publishedAt)));
  const avg = items.length ? items.reduce((a,b) => a+b, 0) / items.length : 999;
  const level = avg <= 30 ? 'fresh' : avg <= 180 ? 'mixed' : 'stale';
  return { label: `${Math.round(avg)}m avg`, level };
}

function calcReliabilityScore() {
  const data = state.datasets;
  if (!data) return 0;
  const sources = 9;
  let score = 100;
  const dataCoverage = [
    data.assets?.length,
    Object.keys(data.prices || {}).length,
    (data.news?.items || []).length,
    Object.keys(data.indicators || {}).length,
    Object.keys(data.predictions || {}).length,
    data.watchlist?.assets?.length,
    data.settings ? 1 : 0,
    data.history?.updates?.length,
    data.alerts?.items?.length
  ].filter(Boolean).length / sources;
  score *= dataCoverage;
  const stalePenalty = averageStalenessPenalty();
  score = Math.max(12, Math.min(100, score - stalePenalty));
  return Math.round(score);
}

function averageStalenessPenalty() {
  const data = state.datasets;
  if (!data) return 100;
  const items = [];
  Object.values(data.prices || {}).forEach(x => x?.lastUpdated && items.push(ageMinutes(x.lastUpdated)));
  (data.news?.items || []).forEach(x => x?.publishedAt && items.push(ageMinutes(x.publishedAt)));
  if (!items.length) return 30;
  const avg = items.reduce((a,b) => a+b, 0) / items.length;
  return Math.min(45, avg * 0.35);
}

function ageMinutes(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, ms / 60000);
}

function formatRelativeTime(iso) {
  if (!iso) return '—';
  const mins = Math.round(ageMinutes(iso));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatNumber(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (Math.abs(v) >= 1e12) return `$${(v/1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v/1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v/1e6).toFixed(2)}M`;
  return new Intl.NumberFormat().format(v);
}

function formatCurrency(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: Number(v) < 10 ? 4 : 2 })}`;
}

function formatPct(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v > 0 ? '+' : ''}${Number(v).toFixed(2)}%`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function movingAverage(values, period) {
  if (!values.length) return 0;
  const slice = values.slice(-period);
  return slice.reduce((a,b) => a + b, 0) / slice.length;
}

function stdDev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((a,b) => a+b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function ema(values, period) {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  let current = values[0];
  for (let i = 1; i < values.length; i++) {
    current = values[i] * k + current * (1 - k);
  }
  return current;
}

function calculateRsi(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  const gains = [];
  const losses = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }
  const avgGain = movingAverage(gains, period);
  const avgLoss = movingAverage(losses, period);
  if (!avgLoss) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMacd(closes) {
  const ema12 = [];
  const ema26 = [];
  let e12 = closes[0];
  let e26 = closes[0];
  const k12 = 2 / (12 + 1);
  const k26 = 2 / (26 + 1);
  closes.forEach(price => {
    e12 = price * k12 + e12 * (1 - k12);
    e26 = price * k26 + e26 * (1 - k26);
    ema12.push(e12);
    ema26.push(e26);
  });
  const line = ema12[ema12.length - 1] - ema26[ema26.length - 1];
  const histSeries = ema12.map((v, i) => v - ema26[i]);
  const signal = ema(histSeries.slice(-9), 9);
  return { line, signal, histogram: line - signal };
}

function dedupeNews(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.title || ''}|${(item.assetIds || []).join(',')}`.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getAssetNews(assetId) {
  const items = dedupeNews(state.datasets?.news?.items || []);
  return items.filter(n => (n.assetIds || []).includes(assetId))
    .sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function aggregateNewsScore(assetId) {
  const news = getAssetNews(assetId);
  if (!news.length) return { score: 0, label: 'Neutral', impact: 'low', freshness: 999 };
  let score = 0;
  let impact = 0;
  let latestAge = 999;
  news.forEach(item => {
    const s = item.sentiment === 'positive' ? 1 : item.sentiment === 'negative' ? -1 : 0;
    const w = item.impact === 'high' ? 3 : item.impact === 'medium' ? 2 : 1;
    score += s * w;
    impact += w;
    latestAge = Math.min(latestAge, ageMinutes(item.publishedAt));
  });
  const normalized = clamp((score / Math.max(1, impact)) * 100, -100, 100);
  return {
    score: normalized,
    label: normalized > 20 ? 'Positive' : normalized < -20 ? 'Negative' : 'Neutral',
    impact: impact >= 7 ? 'high' : impact >= 4 ? 'medium' : 'low',
    freshness: latestAge
  };
}

function computeAssetAnalysis(asset) {
  const price = state.datasets.prices[asset.id];
  const indicator = state.datasets.indicators[asset.id] || {};
  const prediction = state.datasets.predictions[asset.id] || {};
  const closes = (price.ohlc || []).map(p => p.c);
  const volumes = (price.ohlc || []).map(p => p.v);
  const current = price.currentPrice;
  const rsi = indicator.rsi ?? calculateRsi(closes);
  const macd = indicator.macd || calculateMacd(closes);
  const ma20 = indicator.movingAverages?.ma20 ?? movingAverage(closes, 20);
  const ma50 = indicator.movingAverages?.ma50 ?? movingAverage(closes, 50);
  const ma200 = indicator.movingAverages?.ma200 ?? movingAverage(closes, 80);
  const support = indicator.support ?? Math.min(...price.ohlc.slice(-20).map(p => p.l));
  const resistance = indicator.resistance ?? Math.max(...price.ohlc.slice(-20).map(p => p.h));
  const atr = indicator.atr ?? stdDev(closes.slice(-14).map((v,i,arr)=> i ? Math.abs(v-arr[i-1]) : 0));
  const volAvg = indicator.volumeAverage20d ?? movingAverage(volumes, 20);
  const volSpike = indicator.volumeSpike ?? (price.volume24h / Math.max(1, volAvg));
  const news = aggregateNewsScore(asset.id);
  const trendScore = clamp(((current > ma20 ? 1 : -1) * 30) + ((ma20 > ma50 ? 1 : -1) * 20) + ((current > ma50 ? 1 : -1) * 15), -100, 100);
  const momentumScore = clamp(((closes.at(-1) - closes.at(-5)) / closes.at(-5)) * 320, -100, 100);
  const technicalScore = clamp((trendScore * 0.45) + ((50 - Math.abs(rsi - 50)) * 0.4) + ((macd.histogram > 0 ? 1 : -1) * 10), -100, 100);
  const sentimentScore = clamp(news.score, -100, 100);
  const newsScore = clamp((news.score * (news.freshness < 180 ? 1 : 0.72)), -100, 100);
  const volatilityScore = clamp(100 - Math.min(100, stdDev(closes.slice(-20).map((v,i,arr)=> i ? (v-arr[i-1])/arr[i-1] * 100 : 0).filter(Number.isFinite)) * 8), 0, 100);
  const liquidityScore = clamp(100 - Math.max(0, 100 - Math.log10(Math.max(1, price.volume24h)) * 18), 0, 100);
  const riskScore = clamp((100 - volatilityScore) * 0.45 + (price.change7d < 0 ? 8 : 0) + (news.freshness > 720 ? 14 : 0), 0, 100);
  const freshnessPenalty = clamp((Math.max(ageMinutes(price.lastUpdated), news.freshness)) / 10, 0, 25);
  const composite = clamp(
    technicalScore * 0.33 +
    sentimentScore * 0.17 +
    newsScore * 0.12 +
    momentumScore * 0.16 +
    liquidityScore * 0.1 -
    riskScore * 0.12 -
    freshnessPenalty,
    -100,
    100
  );
  let bias = 'neutral';
  if (composite > 18) bias = 'bullish';
  if (composite < -18) bias = 'bearish';
  let signal = 'hold';
  if (composite > 65) signal = 'strong buy';
  else if (composite > 28) signal = 'buy';
  else if (composite < -65) signal = 'strong sell';
  else if (composite < -28) signal = 'sell';
  else if (Math.abs(composite) < 12) signal = 'caution';
  const confidence = clamp(Math.round(52 + Math.abs(composite) * 0.38 + (Math.min(volSpike, 3) - 1) * 4 - freshnessPenalty * 0.9), 18, 97);
  const entryLow = current * (bias === 'bearish' ? 1.005 : 0.995);
  const entryHigh = current * (bias === 'bearish' ? 0.992 : 1.015);
  const targetBase = bias === 'bearish' ? current - Math.max(atr * 2.2, current * 0.05) : current + Math.max(atr * 2.2, current * 0.05);
  const targetLow = bias === 'bearish' ? targetBase * 0.985 : targetBase * 0.98;
  const targetHigh = bias === 'bearish' ? targetBase * 0.965 : targetBase * 1.02;
  const stopLoss = bias === 'bearish' ? current * 1.035 : current * 0.97;
  const rr = Math.max(0.2, Math.abs((targetBase - current) / Math.max(0.01, current - stopLoss)));
  const contradictions = [];
  if ((current > ma20 && rsi > 70) || (current < ma20 && rsi < 30)) contradictions.push('Trend and oscillator signal a stretched setup.');
  if (news.score > 20 && bias === 'bearish') contradictions.push('Positive news conflicts with weak price structure.');
  if (news.score < -20 && bias === 'bullish') contradictions.push('Negative news conflicts with bullish momentum.');
  if (volSpike < 0.85) contradictions.push('No significant volume confirmation.');
  const reasons = [
    `${current > ma20 ? 'Price trades above' : 'Price trades below'} the 20-day average.`,
    `${ma20 > ma50 ? 'Medium-term trend is constructive.' : 'Medium-term trend remains weak.'}`,
    `${news.label} sentiment and ${news.impact} impact headlines.`,
    `Volume ratio is ${volSpike.toFixed(2)}x versus recent average.`,
    `RSI is ${rsi.toFixed(1)}, MACD histogram is ${macd.histogram >= 0 ? 'positive' : 'negative'}.`
  ];
  const warnings = [];
  if (ageMinutes(price.lastUpdated) > 720) warnings.push('Price data is stale.');
  if (news.freshness > 720) warnings.push('News feed is stale.');
  if (confidence < 55) warnings.push('Confidence is limited because inputs are mixed.');
  if (riskScore > 62) warnings.push('Risk is elevated relative to the expected move.');
  return {
    assetId: asset.id,
    price,
    indicator,
    prediction,
    current,
    rsi,
    macd,
    ma20,
    ma50,
    ma200,
    support,
    resistance,
    atr,
    volSpike,
    trendScore: Math.round(trendScore),
    technicalScore: Math.round(technicalScore),
    sentimentScore: Math.round(sentimentScore),
    newsScore: Math.round(newsScore),
    momentumScore: Math.round(momentumScore),
    liquidityScore: Math.round(liquidityScore),
    volatilityScore: Math.round(volatilityScore),
    riskScore: Math.round(riskScore),
    composite: Math.round(composite),
    bias,
    signal,
    confidence,
    entryZone: [round(entryLow), round(entryHigh)],
    targetZone: [round(targetLow), round(targetHigh)],
    stopLoss: round(stopLoss),
    riskReward: round(rr, 2),
    reasons,
    contradictions,
    warnings,
    news,
    freshnessLabel: freshnessLabel(Math.max(ageMinutes(price.lastUpdated), news.freshness)),
    probabilityBands: {
      up: round(clamp(0.5 + composite / 220, 0.08, 0.9), 2),
      flat: round(clamp(0.3 - Math.abs(composite) / 350, 0.08, 0.48), 2),
      down: round(clamp(1 - clamp(0.5 + composite / 220, 0.08, 0.9) - clamp(0.3 - Math.abs(composite) / 350, 0.08, 0.48), 0.08, 0.84), 2)
    },
    changedSinceLast: getSignalChange(asset.id, signal),
    selectedNews: getAssetNews(asset.id).slice(0, 3)
  };
}

function freshnessLabel(minutes) {
  if (minutes <= 30) return 'Fresh';
  if (minutes <= 180) return 'Recent';
  if (minutes <= 720) return 'Aging';
  return 'Stale';
}

function getSignalChange(assetId, currentSignal) {
  const updates = state.datasets.history?.updates || [];
  let last = null;
  for (let i = updates.length - 1; i >= 0; i--) {
    if (updates[i].assetId === assetId) {
      last = updates[i];
      break;
    }
  }
  if (!last) return 'Initial signal';
  if (last.currentSignal === currentSignal) return 'Signal unchanged since last logged update';
  return `Changed from ${last.currentSignal} to ${currentSignal}`;
}

function round(v, digits = 2) {
  const p = Math.pow(10, digits);
  return Math.round(v * p) / p;
}

function setActiveSection(section) {
  SECTION_IDS.forEach(id => {
    document.getElementById(`section-$<built-in function id>`).classList.toggle('active', id === section);
  });
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.section === section));
}

function applyStateToUI() {
  setActiveSection(state.activeSection);
  els.assetSearch.value = state.filters.search || '';
  els.typeFilter.value = state.filters.type || 'all';
  els.exchangeFilter.value = state.filters.exchange || 'all';
  els.sentimentFilter.value = state.filters.sentiment || 'all';
  els.signalFilter.value = state.filters.signal || 'all';
  els.sortBy.value = state.filters.sortBy || 'confidence-desc';
  populateFilterOptions();
  renderSettingsForm();
}

function populateFilterOptions() {
  const exchanges = new Set((state.datasets?.assets || []).map(a => a.exchange).filter(Boolean));
  const existing = Array.from(els.exchangeFilter.options).map(o => o.value);
  [...exchanges].sort().forEach(exchange => {
    if (!existing.includes(exchange)) {
      const opt = document.createElement('option');
      opt.value = exchange;
      opt.textContent = exchange;
      els.exchangeFilter.appendChild(opt);
    }
  });
}

function renderAll() {
  if (!state.datasets) return;
  const analyses = getAnalyses();
  updateHeaderState();
  renderDashboard(analyses);
  renderExplorer(analyses);
  renderNews();
  renderPredictions(analyses);
  renderWatchlist(analyses);
  renderDataManager();
  renderSettingsForm();
  renderAboutData(analyses);
  drawChart('marketChart', state.selectedAssetId, analyses);
  drawChart('detailChart', state.selectedAssetId, analyses);
  if (state.activeSection === 'explorer') {
    const selected = analyses.find(a => a.asset.id === state.selectedAssetId) || analyses[0];
    if (selected) {
      state.selectedAssetId = selected.asset.id;
      renderAssetDetail(selected);
      renderSelectedWatchToggle(selected.asset.id);
      document.getElementById('detailTitle').textContent = `${selected.asset.symbol} • ${selected.asset.name}`;
    }
  }
  saveSessionState();
}

function getAnalyses() {
  const assets = state.datasets.assets || [];
  const analyses = assets.map(asset => computeAssetAnalysis(asset));

  const search = state.filters.search;
  let filtered = analyses.filter(a => {
    const matchesSearch = !search || [a.asset.symbol, a.asset.name, a.asset.sector, a.asset.exchange, a.asset.industry]
      .filter(Boolean).join(' ').toLowerCase().includes(search);
    const matchesType = state.filters.type === 'all' || a.asset.type === state.filters.type;
    const matchesExchange = state.filters.exchange === 'all' || a.asset.exchange === state.filters.exchange;
    const matchesSentiment = state.filters.sentiment === 'all' || a.news.label.toLowerCase() === state.filters.sentiment;
    const matchesSignal = state.filters.signal === 'all' || a.signal === state.filters.signal;
    return matchesSearch && matchesType && matchesExchange && matchesSentiment && matchesSignal;
  });

  const s = state.filters.sortBy;
  const sorters = {
    'confidence-desc': (a,b) => b.confidence - a.confidence,
    'confidence-asc': (a,b) => a.confidence - b.confidence,
    'volatility-desc': (a,b) => (b.volatilityScore - a.volatilityScore),
    'sentiment-desc': (a,b) => (b.sentimentScore - a.sentimentScore),
    'volume-desc': (a,b) => (b.price.volume24h - a.price.volume24h),
    'updated-desc': (a,b) => new Date(b.price.lastUpdated) - new Date(a.price.lastUpdated)
  };
  filtered.sort(sorters[s] || sorters['confidence-desc']);
  return filtered;
}

function renderDashboard(analyses) {
  renderOverviewStats(analyses);
  renderSelectedSummary(analyses);
  renderMarketSummary(analyses);
  renderNewsSection('#dashboardNews', analyses);
  renderList('#topMovers', analyses.slice().sort((a,b) => Math.abs(b.price.change24h) - Math.abs(a.price.change24h)).slice(0,5), a => assetCardMarkup(a, true));
  renderList('#topSetups', analyses.slice().sort((a,b) => b.confidence - a.confidence).slice(0,5), a => setupMarkup(a));
  renderList('#conflictingSignals', analyses.filter(a => a.contradictions.length).slice(0,5), a => contradictionMarkup(a));
}

function renderOverviewStats(analyses) {
  const bullish = analyses.filter(a => a.bias === 'bullish').length;
  const bearish = analyses.filter(a => a.bias === 'bearish').length;
  const strong = analyses.filter(a => a.confidence >= 70).length;
  const volatile = analyses.filter(a => a.volatilityScore >= 70).length;
  const up24 = analyses.filter(a => a.price.change24h > 0).length;
  const avgConf = analyses.length ? analyses.reduce((s,a) => s+a.confidence, 0) / analyses.length : 0;
  const cards = [
    ['Assets tracked', analyses.length, `${up24} positive 24h changes`],
    ['Bullish bias', bullish, 'Scenario leaning higher'],
    ['Bearish bias', bearish, 'Scenario leaning lower'],
    ['High confidence', strong, 'Signals above threshold'],
    ['Most volatile', volatile, 'Volatility breakout watch'],
    ['Avg confidence', `${avgConf.toFixed(0)}%`, 'Composite forecast quality']
  ];
  els.overviewStats.innerHTML = cards.map(([label, value, sub]) => `
    <article class="stats-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${sub}</small>
    </article>
  `).join('');
}

function renderSelectedSummary(analyses) {
  const selected = analyses.find(a => a.asset.id === state.selectedAssetId) || analyses[0];
  if (!selected) return;
  state.selectedAssetId = selected.asset.id;
  els.selectedAssetSummary.innerHTML = assetDetailSummaryMarkup(selected);
  renderAssetDetail(selected);
  renderSelectedWatchToggle(selected.asset.id);
}

function renderMarketSummary(analyses) {
  const avgChange = analyses.length ? analyses.reduce((s,a) => s + a.price.change24h, 0) / analyses.length : 0;
  const trend = avgChange > 0 ? 'Risk appetite is constructive across the sample.' : 'Risk appetite is soft across the sample.';
  const alignment = analyses.filter(a => Math.sign(a.composite) === Math.sign(avgChange)).length;
  const highestNews = analyses.slice().sort((a,b) => b.newsScore - a.newsScore)[0];
  els.marketOverviewSummary.innerHTML = `
    <div class="stack">
      <div class="metric-card">
        <span>Market tone</span>
        <strong>${avgChange >= 0 ? 'Positive' : 'Negative'}</strong>
      </div>
      <div class="metric-card">
        <span>Signal alignment</span>
        <strong>${alignment} / ${analyses.length}</strong>
      </div>
      <div class="metric-card">
        <span>Most news-driven asset</span>
        <strong>${highestNews?.asset.symbol || '—'}</strong>
      </div>
      <p class="long-copy">${trend} Predictions are derived from combined trend, momentum, news, and risk scoring rather than certainty.</p>
    </div>
  `;
}

function renderNewsSection(selector, analyses) {
  const container = document.querySelector(selector);
  const allNews = dedupeNews(state.datasets.news?.items || []);
  const assetsById = Object.fromEntries((state.datasets.assets || []).map(a => [a.id, a]));
  container.innerHTML = allNews.slice(0, 6).map(item => {
    const primary = item.assetIds?.[0];
    const a = assetsById[primary];
    return `
      <article class="news-card">
        <div class="row">
          <strong>${item.title}</strong>
          <span class="badge ${item.sentiment === 'positive' ? 'up' : item.sentiment === 'negative' ? 'down' : 'neutral'}">${item.sentiment}</span>
        </div>
        <p>${item.summary}</p>
        <div class="badges">
          <span class="badge info">${a ? a.symbol : 'General'}</span>
          <span class="badge">${item.impact} impact</span>
          ${item.urgent ? '<span class="badge warn">Breaking</span>' : ''}
          <span class="badge">${formatRelativeTime(item.publishedAt)}</span>
        </div>
      </article>
    `;
  }).join('') || '<div class="list-item">No news items available.</div>';
}

function renderNews() {
  const allNews = dedupeNews(state.datasets.news?.items || []);
  const grouped = allNews.slice().sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  els.newsFeed.innerHTML = grouped.map(item => newsCardMarkup(item)).join('');
}

function newsCardMarkup(item) {
  const sentimentClass = item.sentiment === 'positive' ? 'up' : item.sentiment === 'negative' ? 'down' : 'neutral';
  return `
    <article class="news-card">
      <div class="row">
        <strong>${item.title}</strong>
        <span class="badge ${sentimentClass}">${item.sentiment}</span>
      </div>
      <p>${item.summary}</p>
      <div class="badges">
        ${(item.assetIds || []).map(id => `<span class="badge info">${id}</span>`).join('')}
        <span class="badge">${item.impact} impact</span>
        ${item.urgent ? '<span class="badge warn">Urgent</span>' : ''}
        <span class="badge">${item.source}</span>
        <span class="badge">${formatRelativeTime(item.publishedAt)}</span>
      </div>
    </article>
  `;
}

function renderPredictions(analyses) {
  const sorted = [...analyses].sort((a,b) => b.confidence - a.confidence);
  els.predictionList.innerHTML = sorted.map(a => `
    <article class="pred-card">
      <div class="pred-head">
        <div>
          <strong>${a.asset.symbol} • ${a.asset.name}</strong>
          <div class="muted">${a.bias.toUpperCase()} • ${a.signal.toUpperCase()} • ${a.freshnessLabel}</div>
        </div>
        <div class="big">${a.confidence}%</div>
      </div>
      <div class="score">Score ${a.composite} • RR 1:${a.riskReward} • Risk ${a.riskScore}/100</div>
      <div class="badges">
        <span class="badge">${formatCurrency(a.current)}</span>
        <span class="badge">${formatPct(a.price.change24h)} 24h</span>
        <span class="badge">${a.entryZone[0]}–${a.entryZone[1]} entry</span>
        <span class="badge">${a.targetZone[0]}–${a.targetZone[1]} target</span>
        <span class="badge">${a.stopLoss} stop</span>
      </div>
      <div class="pred-reasons">
        <strong>Why it reads this way:</strong>
        <ul>
          ${a.reasons.map(r => `<li>${r}</li>`).join('')}
        </ul>
        ${a.contradictions.length ? `<p class="negative"><strong>Contradictions:</strong> ${a.contradictions.join(' ')}</p>` : ''}
        ${a.warnings.length ? `<p class="neutral"><strong>Warnings:</strong> ${a.warnings.join(' ')}</p>` : ''}
      </div>
    </article>
  `).join('');
}

function renderWatchlist(analyses) {
  const watch = new Set(state.datasets.watchlist?.assets || []);
  const items = analyses.filter(a => watch.has(a.asset.id));
  els.watchlistView.innerHTML = `
    <div class="watch-controls">
      <button class="action-btn" id="addSelectedToWatch">Add selected</button>
      <button class="action-btn secondary" id="removeSelectedFromWatch">Remove selected</button>
      <button class="action-btn secondary" id="exportWatchlistFromView">Export watchlist</button>
    </div>
    <div class="list">
      ${items.map(a => `
        <article class="watch-card">
          <div class="row">
            <strong>${a.asset.symbol} • ${a.asset.name}</strong>
            <span class="badge ${a.bias === 'bullish' ? 'up' : a.bias === 'bearish' ? 'down' : 'neutral'}">${a.signal}</span>
          </div>
          <div class="badges">
            <span class="badge">${formatCurrency(a.current)}</span>
            <span class="badge">${formatPct(a.price.change24h)} 24h</span>
            <span class="badge">${a.confidence}% confidence</span>
            <span class="badge">${a.freshnessLabel}</span>
          </div>
        </article>
      `).join('') || '<div class="list-item">No assets in watchlist.</div>'}
    </div>
  `;
  document.getElementById('addSelectedToWatch').onclick = () => {
    addToWatchlist(state.selectedAssetId);
    renderAll();
  };
  document.getElementById('removeSelectedFromWatch').onclick = () => {
    removeFromWatchlist(state.selectedAssetId);
    renderAll();
  };
  document.getElementById('exportWatchlistFromView').onclick = () => exportDataset('watchlist');
}

function renderSelectedWatchToggle(assetId) {
  if (!els.toggleWatchBtn) return;
  const watch = new Set(state.datasets.watchlist?.assets || []);
  els.toggleWatchBtn.textContent = watch.has(assetId) ? 'Remove from Watchlist' : 'Add to Watchlist';
  els.toggleWatchBtn.dataset.assetId = assetId;
  els.toggleWatchBtn.onclick = () => {
    toggleWatchlist(assetId);
    renderAll();
  };
}

function toggleSelectedWatchlist() {
  toggleWatchlist(state.selectedAssetId);
  renderAll();
}

function toggleWatchlist(assetId) {
  const watch = new Set(state.datasets.watchlist?.assets || []);
  if (watch.has(assetId)) watch.delete(assetId); else watch.add(assetId);
  state.datasets.watchlist.assets = Array.from(watch);
  state.datasets.watchlist.updatedAt = new Date().toISOString();
  saveAllToStorage();
}

function addToWatchlist(assetId) {
  const watch = new Set(state.datasets.watchlist?.assets || []);
  watch.add(assetId);
  state.datasets.watchlist.assets = Array.from(watch);
  saveAllToStorage();
}

function removeFromWatchlist(assetId) {
  const watch = new Set(state.datasets.watchlist?.assets || []);
  watch.delete(assetId);
  state.datasets.watchlist.assets = Array.from(watch);
  saveAllToStorage();
}

function renderExplorer(analyses) {
  els.assetCountHint.textContent = `${analyses.length} assets shown`;
  els.assetGrid.innerHTML = analyses.map(a => assetCardMarkup(a)).join('');
  const selected = analyses.find(a => a.asset.id === state.selectedAssetId) || analyses[0];
  if (selected) {
    state.selectedAssetId = selected.asset.id;
    renderAssetDetail(selected);
    document.getElementById('detailTitle').textContent = `${selected.asset.symbol} • ${selected.asset.name}`;
    renderSelectedWatchToggle(selected.asset.id);
  }
}

function assetCardMarkup(a) {
  return `
    <article class="asset-card" data-asset-id="${a.asset.id}" tabindex="0" role="button" aria-label="View details for ${a.asset.symbol}">
      <div class="row">
        <div>
          <strong>${a.asset.symbol}</strong>
          <div class="muted">${a.asset.name}</div>
        </div>
        <span class="badge ${a.bias === 'bullish' ? 'up' : a.bias === 'bearish' ? 'down' : 'neutral'}">${a.signal}</span>
      </div>
      <div class="badges">
        <span class="badge">${a.asset.type}</span>
        <span class="badge">${a.asset.exchange}</span>
        <span class="badge">${formatCurrency(a.current)}</span>
        <span class="badge ${a.price.change24h >= 0 ? 'up' : 'down'}">${formatPct(a.price.change24h)}</span>
      </div>
      <div class="badges">
        <span class="badge info">${a.confidence}% confidence</span>
        <span class="badge">${a.news.label} news</span>
        <span class="badge">${a.freshnessLabel}</span>
      </div>
    </article>
  `;
}

function assetCardMarkupMini(a) {
  return `
    <div class="list-item">
      <div class="title">
        <h4>${a.asset.symbol}</h4>
        <span class="badge ${a.price.change24h >= 0 ? 'up' : 'down'}">${formatPct(a.price.change24h)}</span>
      </div>
      <small>${a.asset.name}</small>
    </div>
  `;
}

function setupMarkup(a) {
  return `
    <div class="list-item">
      <div class="title">
        <h4>${a.asset.symbol}</h4>
        <span class="badge info">${a.confidence}%</span>
      </div>
      <small>${a.bias} • ${a.signal} • RR 1:${a.riskReward}</small>
    </div>
  `;
}

function contradictionMarkup(a) {
  return `
    <div class="list-item">
      <div class="title">
        <h4>${a.asset.symbol}</h4>
        <span class="badge warn">${a.contradictions.length} issue(s)</span>
      </div>
      <small>${a.contradictions.join(' ') || 'No contradictions'}</small>
    </div>
  `;
}

function renderList(selector, items, renderItem) {
  const el = document.querySelector(selector);
  el.innerHTML = items.map(renderItem).join('');
}

function renderAssetDetail(a) {
  els.assetDetail.innerHTML = assetDetailMarkup(a);
}

function assetDetailSummaryMarkup(a) {
  return `
    <div class="detail-grid">
      <div class="metric-card"><span>Current Price</span><strong>${formatCurrency(a.current)}</strong></div>
      <div class="metric-card"><span>24h Change</span><strong class="${a.price.change24h >= 0 ? 'positive' : 'negative'}">${formatPct(a.price.change24h)}</strong></div>
      <div class="metric-card"><span>7d Change</span><strong class="${a.price.change7d >= 0 ? 'positive' : 'negative'}">${formatPct(a.price.change7d)}</strong></div>
      <div class="metric-card"><span>Bias</span><strong>${a.bias}</strong></div>
      <div class="metric-card"><span>Confidence</span><strong>${a.confidence}%</strong></div>
      <div class="metric-card"><span>Signal</span><strong>${a.signal}</strong></div>
    </div>
  `;
}

function assetDetailMarkup(a) {
  return `
    <div class="detail-grid">
      <div class="metric-card"><span>Current Price</span><strong>${formatCurrency(a.current)}</strong></div>
      <div class="metric-card"><span>24h Change</span><strong class="${a.price.change24h >= 0 ? 'positive' : 'negative'}">${formatPct(a.price.change24h)}</strong></div>
      <div class="metric-card"><span>7d Change</span><strong class="${a.price.change7d >= 0 ? 'positive' : 'negative'}">${formatPct(a.price.change7d)}</strong></div>
      <div class="metric-card"><span>Market Cap</span><strong>${formatNumber(a.price.marketCap)}</strong></div>
      <div class="metric-card"><span>Volume 24h</span><strong>${formatNumber(a.price.volume24h)}</strong></div>
      <div class="metric-card"><span>Risk Score</span><strong>${a.riskScore}/100</strong></div>
    </div>
    <div class="badges" style="margin-top:12px;">
      <span class="badge ${a.bias === 'bullish' ? 'up' : a.bias === 'bearish' ? 'down' : 'neutral'}">${a.bias.toUpperCase()}</span>
      <span class="badge">${a.signal.toUpperCase()}</span>
      <span class="badge info">${a.confidence}% confidence</span>
      <span class="badge">${a.freshnessLabel} data</span>
      <span class="badge">${a.asset.exchange}</span>
      <span class="badge">${a.asset.sector}</span>
    </div>
    <div class="panel" style="margin-top:14px; background: rgba(255,255,255,.02);">
      <strong>Decision-support summary</strong>
      <p class="long-copy">Entry zone: ${a.entryZone[0]}–${a.entryZone[1]} • Target zone: ${a.targetZone[0]}–${a.targetZone[1]} • Stop-loss: ${a.stopLoss} • Risk/Reward: 1:${a.riskReward}</p>
      <p class="long-copy">${a.reasons.join(' ')}</p>
      ${a.contradictions.length ? `<p class="negative"><strong>Contradictions:</strong> ${a.contradictions.join(' ')}</p>` : ''}
      ${a.warnings.length ? `<p class="neutral"><strong>Warnings:</strong> ${a.warnings.join(' ')}</p>` : ''}
      <p class="muted">Last updated: ${formatDateTime(a.price.lastUpdated)} • News freshness: ${formatRelativeTime(state.datasets.news?.items?.[0]?.publishedAt)}</p>
    </div>
    <div class="detail-grid">
      <div class="metric-card"><span>RSI</span><strong>${a.rsi.toFixed(1)}</strong></div>
      <div class="metric-card"><span>MACD</span><strong>${a.macd.histogram >= 0 ? '+' : ''}${a.macd.histogram.toFixed(2)}</strong></div>
      <div class="metric-card"><span>Volume spike</span><strong>${a.volSpike.toFixed(2)}x</strong></div>
      <div class="metric-card"><span>Support</span><strong>${formatCurrency(a.support)}</strong></div>
      <div class="metric-card"><span>Resistance</span><strong>${formatCurrency(a.resistance)}</strong></div>
      <div class="metric-card"><span>Freshness</span><strong>${a.freshnessLabel}</strong></div>
    </div>
    <div class="panel" style="margin-top:14px; background: rgba(255,255,255,.02);">
      <strong>Probability bands</strong>
      <div class="badges" style="margin-top:10px;">
        <span class="badge up">Up: ${(a.probabilityBands.up * 100).toFixed(0)}%</span>
        <span class="badge neutral">Flat: ${(a.probabilityBands.flat * 100).toFixed(0)}%</span>
        <span class="badge down">Down: ${(a.probabilityBands.down * 100).toFixed(0)}%</span>
      </div>
      <p class="muted">Scenario-based output only. This is not certainty, and it should be checked against your own research.</p>
    </div>
  `;
}

function renderDataManager() {
  const dataKeys = Object.keys(DATA_PATHS);
  els.exportControls.innerHTML = dataKeys.map(key => `
    <div class="list-item">
      <div class="title">
        <h4>${key}.json</h4>
        <button class="action-btn secondary" data-export-dataset="${key}">Export</button>
      </div>
      <small>Download the current in-browser dataset.</small>
    </div>
  `).join('') + `
    <div class="list-item">
      <div class="title">
        <h4>All data</h4>
        <button class="action-btn" data-export-dataset="all">Export bundle</button>
      </div>
      <small>Exports every major dataset as a browser download sequence.</small>
    </div>
  `;

  els.importControls.innerHTML = dataKeys.map(key => `
    <div class="list-item">
      <div class="title">
        <h4>Import ${key}.json</h4>
      </div>
      <input type="file" accept=".json,application/json" data-import-target="${key}" />
      <small>Replace only this dataset from a JSON file.</small>
    </div>
  `).join('');
  renderSourceReliability();
}

function renderSourceReliability() {
  const score = calcReliabilityScore();
  const freshness = calcFreshnessSummary();
  els.sourceReliabilityBox.innerHTML = `
    <div class="stack">
      <div class="metric-card">
        <span>Reliability score</span>
        <strong>${score}/100</strong>
      </div>
      <div class="reliability-bar"><div class="reliability-fill" style="width:${score}%"></div></div>
      <div class="metric-card">
        <span>Freshness</span>
        <strong>${freshness.label}</strong>
      </div>
      <p class="muted">Lower scores indicate missing sources, stale timestamps, or conflicting inputs.</p>
    </div>
  `;
}

function renderSettingsForm() {
  const s = state.settings || {};
  els.settingsForm.innerHTML = `
    <div class="form-grid">
      <div class="form-row">
        <label for="modeSel">Mode</label>
        <select id="modeSel" data-setting-path="mode">
          <option value="live" ${s.mode === 'live' ? 'selected' : ''}>Live mode</option>
          <option value="offline" ${s.mode === 'offline' ? 'selected' : ''}>Offline/manual mode</option>
        </select>
      </div>
      <div class="form-row">
        <label for="refreshSel">Auto refresh (minutes)</label>
        <input id="refreshSel" type="number" min="1" max="240" value="${s.autoRefreshMinutes || 5}" data-setting-path="autoRefreshMinutes" />
      </div>
      <div class="form-row">
        <label for="thresholdSel">Confidence threshold</label>
        <input id="thresholdSel" type="number" min="1" max="99" value="${s.confidenceThreshold || 60}" data-setting-path="confidenceThreshold" />
      </div>
      <div class="form-row">
        <label for="staleSel">Show stale data</label>
        <select id="staleSel" data-setting-path="showStaleData">
          <option value="true" ${s.showStaleData ? 'selected' : ''}>Yes</option>
          <option value="false" ${!s.showStaleData ? 'selected' : ''}>No</option>
        </select>
      </div>
      <div class="form-row">
        <label for="newsWindowSel">News freshness window (hours)</label>
        <input id="newsWindowSel" type="number" min="1" max="720" value="${s.newsWindowHours || 72}" data-setting-path="newsWindowHours" />
      </div>
      <div class="form-row">
        <label for="refreshLoadSel">Refresh on load</label>
        <select id="refreshLoadSel" data-setting-path="refreshOnLoad">
          <option value="true" ${s.refreshOnLoad ? 'selected' : ''}>Yes</option>
          <option value="false" ${!s.refreshOnLoad ? 'selected' : ''}>No</option>
        </select>
      </div>
      <div class="form-row">
        <label>Remote JSON endpoints</label>
        <div class="stack">
          ${Object.keys(DATA_PATHS).map(key => `
            <input type="url" placeholder="${DATA_PATHS[key]}" value="${s.remoteEndpoints?.[key] || ''}" data-setting-path="remoteEndpoints.${key}" />
          `).join('')}
        </div>
      </div>
      <div class="form-actions">
        <button class="action-btn" id="saveSettingsBtn" type="button">Save Settings</button>
        <button class="action-btn secondary" id="resetSettingsBtn" type="button">Reset Settings</button>
      </div>
    </div>
  `;
  document.getElementById('saveSettingsBtn').onclick = () => {
    saveAllToStorage();
    toast('Settings saved.');
  };
  document.getElementById('resetSettingsBtn').onclick = () => {
    state.settings = JSON.parse(JSON.stringify(FALLBACK_DATA.settings));
    state.datasets.settings = state.settings;
    saveAllToStorage();
    renderAll();
    toast('Settings reset to bundled defaults.');
  };
}

function renderAboutData(analyses) {
  // reserved for any extra about content driven by data
}

function exportDataset(key) {
  if (!state.datasets) return;
  if (key === 'all') {
    Object.entries(state.datasets).forEach(([datasetKey, value], index) => {
      setTimeout(() => downloadJSON(value, datasetKey + '.json'), index * 100);
    });
    toast('All datasets are being exported.');
    return;
  }
  downloadJSON(state.datasets[key], key + '.json');
  toast(`${key} exported.`);
}

function exportSelectedAsset() {
  const a = getAnalyses().find(item => item.asset.id === state.selectedAssetId);
  if (!a) return;
  downloadJSON({
    asset: a.asset,
    price: a.price,
    indicator: a.indicator,
    prediction: a.prediction,
    analysis: {
      bias: a.bias,
      signal: a.signal,
      confidence: a.confidence,
      score: a.composite,
      entryZone: a.entryZone,
      targetZone: a.targetZone,
      stopLoss: a.stopLoss,
      riskReward: a.riskReward,
      reasons: a.reasons,
      contradictions: a.contradictions,
      warnings: a.warnings
    }
  }, `${a.asset.symbol}-analysis.json`);
}

async function importDatasetFromFile(target, file) {
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    if (target === 'news' && Array.isArray(json.items)) state.datasets.news = json;
    else state.datasets[target] = json;
    if (target === 'settings') state.settings = json;
    if (target === 'watchlist') state.datasets.watchlist = json;
    if (target === 'assets') state.selectedAssetId = json?.[0]?.id || state.selectedAssetId;
    saveAllToStorage();
    renderAll();
    toast(`${target} imported.`);
  } catch (err) {
    console.error(err);
    toast(`Import failed for ${target}.`, true);
  }
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function drawChart(canvasId, assetId, analyses) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !state.datasets) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, rect.width || canvas.width);
  const height = Math.max(280, rect.height || canvas.height);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = `${Math.max(320, Math.round(width * 0.56))}px`;
  ctx.scale(dpr, dpr);

  const analysis = (analyses || getAnalyses()).find(a => a.asset.id === assetId) || (analyses || getAnalyses())[0];
  if (!analysis) return;
  const series = analysis.price.ohlc || [];
  const closes = series.map(p => p.c);
  const volumes = series.map(p => p.v);
  const ma20 = [];
  const ma50 = [];
  for (let i = 0; i < closes.length; i++) {
    ma20.push(movingAverage(closes.slice(0, i + 1), Math.min(20, i + 1)));
    ma50.push(movingAverage(closes.slice(0, i + 1), Math.min(50, i + 1)));
  }

  const pad = { left: 56, right: 28, top: 22, bottom: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const volumeH = Math.round(plotH * 0.22);
  const priceH = plotH - volumeH - 12;

  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, pad, width, height);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = '600 14px Inter, sans-serif';
  ctx.fillText(`${analysis.asset.symbol} • ${analysis.asset.name}`, pad.left, 18);

  const high = Math.max(...series.map(p => p.h), analysis.targetZone[1]);
  const low = Math.min(...series.map(p => p.l), analysis.stopLoss);
  const priceScale = (v) => pad.top + ((high - v) / Math.max(0.0001, high - low)) * priceH;
  const xStep = plotW / Math.max(1, series.length - 1);

  // Forecast band
  const bandX = pad.left + plotW * 0.74;
  const bandY1 = priceScale(analysis.targetZone[1]);
  const bandY0 = priceScale(analysis.entryZone[0]);
  ctx.fillStyle = analysis.bias === 'bearish' ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.08)';
  ctx.fillRect(bandX, Math.min(bandY0, bandY1), plotW * 0.22, Math.abs(bandY1 - bandY0));

  // Support/resistance
  drawLine(ctx, pad.left, priceScale(analysis.support), width - pad.right, priceScale(analysis.support), 'rgba(94,234,212,.35)', [8,6]);
  drawLine(ctx, pad.left, priceScale(analysis.resistance), width - pad.right, priceScale(analysis.resistance), 'rgba(248,113,113,.35)', [8,6]);

  // MA and price line
  drawSeries(ctx, closes, pad.left, pad.top, xStep, priceScale, 'rgba(255,255,255,.96)', 2.2);
  drawSeries(ctx, ma20, pad.left, pad.top, xStep, priceScale, 'rgba(96,165,250,.92)', 1.7);
  drawSeries(ctx, ma50, pad.left, pad.top, xStep, priceScale, 'rgba(251,191,36,.9)', 1.5);

  // Volume bars
  const maxVol = Math.max(...volumes);
  const volTop = pad.top + priceH + 12;
  const barW = Math.max(2, xStep * 0.62);
  volumes.forEach((v, i) => {
    const h = (v / maxVol) * volumeH;
    const x = pad.left + i * xStep - barW / 2;
    ctx.fillStyle = 'rgba(96,165,250,.24)';
    ctx.fillRect(x, volTop + volumeH - h, barW, h);
  });

  // Labels
  ctx.fillStyle = 'rgba(229,238,251,.8)';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText(`Bias: ${analysis.bias}`, pad.left, height - 12);
  ctx.fillText(`Confidence: ${analysis.confidence}%`, pad.left + 136, height - 12);
  ctx.fillText(`RR: 1:${analysis.riskReward}`, pad.left + 292, height - 12);
  ctx.fillText(`Last: ${formatCurrency(closes.at(-1))}`, width - 110, height - 12);
}

function drawGrid(ctx, pad, width, height) {
  ctx.save();
  ctx.strokeStyle = 'rgba(148,163,184,0.08)';
  ctx.lineWidth = 1;
  const rows = 8;
  const cols = 10;
  for (let i = 0; i <= rows; i++) {
    const y = pad.top + ((height - pad.top - pad.bottom) / rows) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
  }
  for (let i = 0; i <= cols; i++) {
    const x = pad.left + ((width - pad.left - pad.right) / cols) * i;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, height - pad.bottom);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSeries(ctx, values, startX, startY, xStep, priceScale, strokeStyle, lineWidth) {
  ctx.save();
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = startX + i * xStep;
    const y = priceScale(v);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawLine(ctx, x1, y1, x2, y2, color, dash = []) {
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash(dash);
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function toast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  els.toast.style.borderColor = isError ? 'rgba(248,113,113,.4)' : 'rgba(94,234,212,.25)';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2400);
}

function startAutoRefresh() {
  clearInterval(state.autoRefreshTimer);
  const mins = clamp(Number(state.settings?.autoRefreshMinutes || 5), 1, 240);
  state.autoRefreshTimer = setInterval(async () => {
    if ((state.settings?.mode || 'live') === 'offline') return;
    await loadAllData(true);
    renderAll();
  }, mins * 60 * 1000);
}
