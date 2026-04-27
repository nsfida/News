'use strict';

/* ========= Configuration ========= */
const STORAGE_KEYS = {
  settings: 'fid_settings_v1',
  cache: 'fid_cache_v1',
  predictions: 'fid_predictions_v1',
  asset: 'fid_selected_asset_v1',
  range: 'fid_selected_range_v1'
};

const DEFAULT_SETTINGS = {
  alphaKey: '',
  fmpKey: '',
  refreshInterval: 300000,
  symbols: {
    silver: 'XAG',
    wti: 'WTI',
    brent: 'BRENT',
    tech: '^NDX',
    cack: '^FCHI'
  }
};

const ASSETS = [
  {
    id: 'silver',
    label: 'Silver',
    ticker: 'XAG/USD',
    provider: 'alpha',
    liveType: 'spot',
    historicalType: 'silver',
    symbolKey: 'silver',
    newsQuery: 'silver XAG USD commodities',
    displayName: 'Silver — XAG/USD',
    symbolHint: 'XAG'
  },
  {
    id: 'wti',
    label: 'Crude Oil (WTI)',
    ticker: 'WTI',
    provider: 'alpha',
    liveType: 'wti',
    historicalType: 'wti',
    symbolKey: 'wti',
    newsQuery: 'WTI crude oil energy prices',
    displayName: 'Crude Oil — WTI',
    symbolHint: 'WTI'
  },
  {
    id: 'brent',
    label: 'Crude Oil (Brent)',
    ticker: 'Brent',
    provider: 'alpha',
    liveType: 'brent',
    historicalType: 'brent',
    symbolKey: 'brent',
    newsQuery: 'Brent crude oil energy prices',
    displayName: 'Crude Oil — Brent',
    symbolHint: 'BRENT'
  },
  {
    id: 'tech',
    label: 'Tech45',
    ticker: 'NASDAQ-100',
    provider: 'fmp',
    liveType: 'index',
    historicalType: 'index',
    symbolKey: 'tech',
    newsQuery: 'NASDAQ-100 technology stocks semiconductors AI',
    displayName: 'Tech45 — NASDAQ-100',
    symbolHint: '^NDX'
  },
  {
    id: 'cack',
    label: 'Cack40',
    ticker: 'CAC 40',
    provider: 'fmp',
    liveType: 'index',
    historicalType: 'index',
    symbolKey: 'cack',
    newsQuery: 'CAC 40 France equities eurozone',
    displayName: 'Cack40 — CAC 40',
    symbolHint: '^FCHI'
  }
];

const RANGES = [
  { id: '1M', label: '1M', days: 30 },
  { id: '3M', label: '3M', days: 90 },
  { id: '6M', label: '6M', days: 180 },
  { id: '1Y', label: '1Y', days: 365 }
];

/* ========= DOM ========= */
const els = {
  refreshBtn: document.getElementById('refreshBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  clearCacheBtn: document.getElementById('clearCacheBtn'),
  modalSaveBtn: document.getElementById('modalSaveBtn'),
  modalCancelBtn: document.getElementById('modalCancelBtn'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  settingsModal: document.getElementById('settingsModal'),
  selectedTitle: document.getElementById('selectedTitle'),
  connectionPill: document.getElementById('connectionPill'),
  livePrice: document.getElementById('livePrice'),
  livePriceMeta: document.getElementById('livePriceMeta'),
  liveChange: document.getElementById('liveChange'),
  liveChangeMeta: document.getElementById('liveChangeMeta'),
  confidenceValue: document.getElementById('confidenceValue'),
  confidenceMeta: document.getElementById('confidenceMeta'),
  signalValue: document.getElementById('signalValue'),
  signalMeta: document.getElementById('signalMeta'),
  buyZone: document.getElementById('buyZone'),
  sellZone: document.getElementById('sellZone'),
  stopZone: document.getElementById('stopZone'),
  tpZone: document.getElementById('tpZone'),
  riskNote: document.getElementById('riskNote'),
  indicatorGrid: document.getElementById('indicatorGrid'),
  insightList: document.getElementById('insightList'),
  newsList: document.getElementById('newsList'),
  predictionList: document.getElementById('predictionList'),
  resolvedCount: document.getElementById('resolvedCount'),
  accuracyValue: document.getElementById('accuracyValue'),
  errorValue: document.getElementById('errorValue'),
  assetTabs: document.getElementById('assetTabs'),
  rangeTabs: document.getElementById('rangeTabs'),
  selectedAsset: document.getElementById('selectedAsset'),
  alphaKey: document.getElementById('alphaKey'),
  fmpKey: document.getElementById('fmpKey'),
  refreshInterval: document.getElementById('refreshInterval'),
  symbolSilver: document.getElementById('symbolSilver'),
  symbolWti: document.getElementById('symbolWti'),
  symbolBrent: document.getElementById('symbolBrent'),
  symbolTech: document.getElementById('symbolTech'),
  symbolCack: document.getElementById('symbolCack'),
  modalAlphaKey: document.getElementById('modalAlphaKey'),
  modalFmpKey: document.getElementById('modalFmpKey'),
  mainChart: document.getElementById('mainChart')
};

let chart;
let state = {
  settings: loadSettings(),
  assetId: localStorage.getItem(STORAGE_KEYS.asset) || 'silver',
  rangeId: localStorage.getItem(STORAGE_KEYS.range) || '6M',
  dataByAsset: {},
  refreshHandle: null,
  lastFetchAt: 0
};

/* ========= Utilities ========= */
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function round(v, d = 2) { return Number.isFinite(v) ? Number(v.toFixed(d)) : NaN; }
function fmtMoney(v) { return Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; }
function fmtPrice(v) { return Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: v > 1000 ? 0 : 3 }) : '—'; }
function fmtPct(v) { return Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—'; }
function fmtDate(ts) {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
  } catch { return new Date(ts).toLocaleString(); }
}
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}
function seededRandom(seed) {
  let x = (seed | 0) || 1;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) / 4294967296);
  };
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadSettings() {
  const saved = localStorage.getItem(STORAGE_KEYS.settings);
  if (!saved) return structuredClone(DEFAULT_SETTINGS);
  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(DEFAULT_SETTINGS),
      ...parsed,
      symbols: { ...DEFAULT_SETTINGS.symbols, ...(parsed.symbols || {}) }
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}
function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}
function selectedAssetConfig() {
  return ASSETS.find(a => a.id === state.assetId) || ASSETS[0];
}
function getSymbol(asset) {
  const key = asset.symbolKey;
  return state.settings.symbols[key] || asset.symbolHint;
}

/* ========= Caching ========= */
function cacheKey(url) {
  return `${STORAGE_KEYS.cache}:${btoa(unescape(encodeURIComponent(url))).slice(0, 80)}`;
}
function getCache(url, ttlMs) {
  try {
    const raw = localStorage.getItem(cacheKey(url));
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (Date.now() - item.ts > ttlMs) return null;
    return item.data;
  } catch {
    return null;
  }
}
function setCache(url, data) {
  try {
    localStorage.setItem(cacheKey(url), JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}
async function fetchJson(url, { ttlMs = 300000, timeoutMs = 12000 } = {}) {
  const cached = getCache(url, ttlMs);
  if (cached) return { data: cached, fromCache: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json,text/plain,*/*' } });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch { data = text; }
    setCache(url, data);
    return { data, fromCache: false };
  } catch (err) {
    clearTimeout(timer);
    if (cached) return { data: cached, fromCache: true, error: err };
    throw err;
  }
}

/* ========= API builders ========= */
function alphaUrl(params) {
  const q = new URLSearchParams({ ...params, apikey: state.settings.alphaKey || 'demo' });
  return `https://www.alphavantage.co/query?${q.toString()}`;
}
function fmpUrl(path, params = {}) {
  const q = new URLSearchParams({ ...params, apikey: state.settings.fmpKey || 'demo' });
  const base = path.startsWith('http') ? path : `https://financialmodelingprep.com${path}`;
  return `${base}${base.includes('?') ? '&' : '?'}${q.toString()}`;
}
function gdeltUrl(query, days = '7d') {
  const q = new URLSearchParams({
    query,
    mode: 'ArtList',
    format: 'json',
    sort: 'HybridRel',
    maxrecords: '12',
    timespan: days
  });
  return `https://api.gdeltproject.org/api/v2/doc/doc?${q.toString()}`;
}

/* ========= Data adapters ========= */
function normalizeAlphaHistorical(data, assetId) {
  const seriesKey = Object.keys(data || {}).find(k => /time series/i.test(k)) || null;
  const source = seriesKey ? data[seriesKey] : null;
  if (!source || typeof source !== 'object') return [];
  const entries = Object.entries(source)
    .map(([date, row]) => {
      const close = parseFloat(row['4. close'] ?? row['5. price'] ?? row['4. value'] ?? row['5. adjusted close'] ?? row['close']);
      const high = parseFloat(row['2. high'] ?? row['high'] ?? close);
      const low = parseFloat(row['3. low'] ?? row['low'] ?? close);
      const open = parseFloat(row['1. open'] ?? row['open'] ?? close);
      return { date: new Date(date + 'T00:00:00Z').getTime(), close, open, high, low, volume: parseFloat(row['5. volume'] ?? row['volume'] ?? 0) };
    })
    .filter(x => Number.isFinite(x.close))
    .sort((a,b) => a.date - b.date);
  return entries;
}
function normalizeAlphaSpot(data) {
  const walk = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    const candidates = ['5. Exchange Rate', '5. Price', '4. Close', '4. price', '1. price', 'price', 'exchangeRate'];
    for (const k of candidates) {
      if (obj[k] != null && Number.isFinite(parseFloat(obj[k]))) return parseFloat(obj[k]);
    }
    for (const v of Object.values(obj)) {
      const res = walk(v);
      if (res != null) return res;
    }
    return null;
  };
  return walk(data);
}
function normalizeFmpHistorical(data) {
  const arr = Array.isArray(data) ? data : data?.historical || data?.historicals || [];
  return arr.map(r => ({
    date: new Date((r.date || r.datetime || r.label || '') + 'T00:00:00Z').getTime(),
    close: parseFloat(r.close ?? r.adjClose ?? r.price),
    open: parseFloat(r.open ?? r.close ?? r.price),
    high: parseFloat(r.high ?? r.close ?? r.price),
    low: parseFloat(r.low ?? r.close ?? r.price),
    volume: parseFloat(r.volume ?? 0)
  })).filter(x => Number.isFinite(x.date) && Number.isFinite(x.close)).sort((a,b) => a.date - b.date);
}
function normalizeFmpQuote(data) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const price = parseFloat(row.price ?? row.close ?? row.lastPrice ?? row.dayHigh ?? row.currentPrice);
  const changePct = parseFloat(String(row.changesPercentage ?? row.changePercent ?? row.percentChange ?? '').replace(/[()%]/g, ''));
  return { price, changePct, raw: row };
}

function generateDemoSeries(assetId, basePrice, days = 420) {
  const rand = seededRandom(hashCode(assetId));
  const series = [];
  let price = basePrice;
  let drift = (rand() - 0.5) * 0.0012;
  for (let i = days; i >= 0; i--) {
    const date = Date.now() - i * 86400000;
    const seasonal = Math.sin(i / 18) * 0.004 + Math.cos(i / 43) * 0.003;
    drift += (rand() - 0.5) * 0.0004;
    const shock = (rand() - 0.5) * 0.018;
    const ret = drift + seasonal + shock;
    const open = price;
    price = Math.max(0.1, price * (1 + ret));
    const high = Math.max(open, price) * (1 + rand() * 0.008);
    const low = Math.min(open, price) * (1 - rand() * 0.008);
    series.push({ date, open, high, low, close: price, volume: 100000 + Math.floor(rand() * 50000) });
  }
  return series;
}

/* ========= Market fetchers ========= */
async function loadAsset(asset, rangeDays) {
  const symbol = getSymbol(asset);
  const ttl = asset.provider === 'alpha' ? 20 * 60 * 1000 : 10 * 60 * 1000;
  let series = [];
  let live = null;
  let meta = { provider: asset.provider, symbol };

  try {
    if (asset.provider === 'alpha') {
      if (asset.liveType === 'spot') {
        const liveRes = await fetchJson(alphaUrl({ function: 'GOLD_SILVER_SPOT', symbol }), { ttlMs: 5 * 60 * 1000 });
        live = normalizeAlphaSpot(liveRes.data);
        meta.source = liveRes.fromCache ? 'Alpha Vantage cache' : 'Alpha Vantage live';
      } else if (asset.liveType === 'wti') {
        const liveRes = await fetchJson(alphaUrl({ function: 'WTI', interval: 'daily' }), { ttlMs: 30 * 60 * 1000 });
        live = extractLatestFromCommoditySeries(liveRes.data);
      } else if (asset.liveType === 'brent') {
        const liveRes = await fetchJson(alphaUrl({ function: 'BRENT', interval: 'daily' }), { ttlMs: 30 * 60 * 1000 });
        live = extractLatestFromCommoditySeries(liveRes.data);
      }
      const histParams = asset.historicalType === 'silver'
        ? { function: 'GOLD_SILVER_HISTORY', symbol, interval: 'daily' }
        : asset.historicalType === 'wti'
          ? { function: 'WTI', interval: 'daily' }
          : { function: 'BRENT', interval: 'daily' };

      const histRes = await fetchJson(alphaUrl(histParams), { ttlMs: ttl });
      series = normalizeAlphaHistorical(histRes.data, asset.id);
    } else {
      const quoteRes = await fetchJson(fmpUrl(`/api/v3/quote/${encodeURIComponent(symbol)}`), { ttlMs: 3 * 60 * 1000 });
      const quote = normalizeFmpQuote(quoteRes.data);
      live = quote?.price ?? null;
      meta.source = quoteRes.fromCache ? 'FMP cache' : 'FMP live';

      const histRes = await fetchJson(fmpUrl(`/api/v3/historical-price-full/${encodeURIComponent(symbol)}`, { serietype: 'line', timeseries: String(Math.max(rangeDays, 365)) }), { ttlMs: ttl });
      series = normalizeFmpHistorical(histRes.data);
    }

    if (!series.length) {
      throw new Error('No historical series returned');
    }

    if (!Number.isFinite(live)) {
      live = series.at(-1)?.close ?? null;
    }

    return { ...meta, live, series, sourceType: meta.source || (asset.provider === 'alpha' ? 'Alpha Vantage' : 'FMP') };
  } catch (error) {
    const fallbackBases = {
      silver: 31,
      wti: 73,
      brent: 78,
      tech: 18800,
      cack: 7750
    };
    const demoSeries = generateDemoSeries(asset.id, fallbackBases[asset.id] || 100);
    return {
      ...meta,
      live: demoSeries.at(-1).close,
      series: demoSeries,
      fallback: true,
      error: String(error?.message || error),
      sourceType: 'synthetic fallback'
    };
  }
}

function extractLatestFromCommoditySeries(data) {
  const key = Object.keys(data || {}).find(k => /time series/i.test(k));
  if (!key) return null;
  const series = data[key];
  const entries = Object.entries(series || {}).sort((a,b) => a[0].localeCompare(b[0]));
  const latest = entries.at(-1)?.[1];
  if (!latest) return null;
  const close = parseFloat(latest['4. close'] ?? latest['5. price'] ?? latest['4. value'] ?? latest['close']);
  return Number.isFinite(close) ? close : null;
}

/* ========= Technical indicators ========= */
function sma(values, period) {
  const out = Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}
function ema(values, period) {
  const out = Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (i === period - 1) {
      const seed = values.slice(0, period).reduce((a,b) => a + b, 0) / period;
      prev = seed;
      out[i] = seed;
    } else if (i >= period) {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}
function stddev(values, period) {
  const out = Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a,b) => a + b, 0) / period;
    const variance = slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / period;
    out[i] = Math.sqrt(variance);
  }
  return out;
}
function rsi(values, period = 14) {
  const out = Array(values.length).fill(null);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = Math.max(0, diff);
    const loss = Math.max(0, -diff);
    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        out[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
      }
    } else {
      avgGain = ((avgGain * (period - 1)) + gain) / period;
      avgLoss = ((avgLoss * (period - 1)) + loss) / period;
      out[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    }
  }
  return out;
}
function macd(values, fast = 12, slow = 26, signal = 9) {
  const fastE = ema(values, fast);
  const slowE = ema(values, slow);
  const line = values.map((_, i) => (fastE[i] != null && slowE[i] != null) ? fastE[i] - slowE[i] : null);
  const signalLine = ema(line.map(v => v ?? 0), signal).map((v, i) => line[i] == null ? null : v);
  const hist = line.map((v, i) => (v != null && signalLine[i] != null) ? v - signalLine[i] : null);
  return { line, signal: signalLine, hist };
}
function bollinger(values, period = 20, mult = 2) {
  const ma = sma(values, period);
  const sd = stddev(values, period);
  return {
    middle: ma,
    upper: values.map((_, i) => ma[i] != null && sd[i] != null ? ma[i] + mult * sd[i] : null),
    lower: values.map((_, i) => ma[i] != null && sd[i] != null ? ma[i] - mult * sd[i] : null),
    widthPct: values.map((_, i) => (ma[i] != null && sd[i] != null) ? ((mult * 2 * sd[i]) / ma[i]) * 100 : null)
  };
}
function linearRegression(values, lookback = 30) {
  const n = Math.min(lookback, values.length);
  const slice = values.slice(values.length - n);
  const xs = slice.map((_, i) => i);
  const meanX = xs.reduce((a,b) => a + b, 0) / n;
  const meanY = slice.reduce((a,b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (slice[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  const predicted = intercept + slope * (n);
  return { slope, intercept, predicted, meanY, slice };
}
function pctReturns(values) {
  const out = Array(values.length).fill(null);
  for (let i = 1; i < values.length; i++) out[i] = (values[i] / values[i - 1]) - 1;
  return out;
}
function annualizedVol(values, lookback = 20) {
  const rets = pctReturns(values).filter(v => Number.isFinite(v)).slice(-lookback);
  if (rets.length < 2) return 0;
  const mean = rets.reduce((a,b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a,b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance) * Math.sqrt(252);
}
function mean(values) { return values.reduce((a,b) => a + b, 0) / values.length; }
function lastFinite(arr) { for (let i = arr.length - 1; i >= 0; i--) if (Number.isFinite(arr[i])) return arr[i]; return null; }

/* ========= Sentiment ========= */
function sentimentScoreFromText(text) {
  const positive = ['beat', 'bull', 'surge', 'rally', 'gain', 'growth', 'strong', 'record', 'optimistic', 'support', 'upside', 'recovery', 'outperform', 'upgrade'];
  const negative = ['miss', 'bear', 'slump', 'drop', 'fall', 'weak', 'risk', 'warning', 'fear', 'downside', 'recession', 'pressure', 'cut', 'selloff'];
  const t = text.toLowerCase();
  let score = 0;
  positive.forEach(k => { if (t.includes(k)) score += 1; });
  negative.forEach(k => { if (t.includes(k)) score -= 1; });
  return clamp(score / 6, -1, 1);
}
async function loadNews(asset) {
  const query = asset.newsQuery;
  const items = [];
  let provider = 'None';
  try {
    const res = await fetchJson(gdeltUrl(query, '7d'), { ttlMs: 20 * 60 * 1000, timeoutMs: 10000 });
    provider = res.fromCache ? 'GDELT cache' : 'GDELT live';
    const articles = res.data?.articles || res.data?.results || res.data?.articles?.article || [];
    const normalized = Array.isArray(articles) ? articles : [];
    for (const a of normalized.slice(0, 8)) {
      const title = a.title || a.seendate || a.article || a.url || 'News item';
      const url = a.url || a.sourceUrl || '#';
      const snippet = a.summary || a.socialimage || a.seendate || a.excerpt || '';
      const score = sentimentScoreFromText(`${title} ${snippet}`);
      items.push({ title, url, snippet, score, source: a.sourceCountry || a.source || 'News' });
    }
  } catch {
    // fallback
  }

  if (!items.length) {
    const fallbackTitles = [
      `${asset.label} sees mixed conditions as traders watch macro data`,
      `Volatility remains elevated across ${asset.label} and related markets`,
      `Analysts focus on supply, rate cuts, and risk appetite for ${asset.label}`
    ];
    fallbackTitles.forEach((t, i) => items.push({
      title: t,
      url: '#',
      snippet: 'Offline fallback sentiment model.',
      score: i === 0 ? 0.1 : i === 1 ? -0.1 : 0.05,
      source: provider
    }));
  }
  const avg = items.reduce((a,b) => a + b.score, 0) / items.length;
  return { items, score: avg, provider };
}

/* ========= Forecast engine ========= */
function buildAnalysis(series, sentiment, assetId) {
  const closes = series.map(p => p.close);
  const latest = series.at(-1);
  const prev = series.at(-2) || latest;
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const rsi14 = rsi(closes, 14);
  const macdData = macd(closes);
  const bb = bollinger(closes);
  const vol = annualizedVol(closes, 20);
  const reg = linearRegression(closes, Math.min(60, closes.length));
  const trendShort = (lastFinite(sma20) ?? latest.close) > (lastFinite(sma50) ?? latest.close) ? 1 : -1;
  const trendLong = (lastFinite(sma50) ?? latest.close) > (lastFinite(sma200) ?? latest.close) ? 1 : -1;
  const macdHist = lastFinite(macdData.hist) ?? 0;
  const rsiVal = lastFinite(rsi14) ?? 50;
  const bbWidth = lastFinite(bb.widthPct) ?? 0;
  const slopePct = closes.length > 1 ? reg.slope / latest.close * 100 : 0;
  const momentum = clamp((rsiVal - 50) / 50, -1, 1);
  const macdScore = clamp(macdHist / Math.max(0.0001, latest.close * 0.0025), -1, 1);
  const trendScore = clamp((trendShort + trendLong) / 2, -1, 1) * 0.8 + clamp(slopePct / 0.25, -1, 1) * 0.2;
  const sentimentScore = clamp(sentiment, -1, 1);
  const volatilityPenalty = clamp(bbWidth / 12, 0, 0.35);
  const composite = clamp((trendScore * 0.42) + (momentum * 0.20) + (macdScore * 0.18) + (sentimentScore * 0.20), -1, 1);
  const probabilityUp = clamp(0.5 + composite * 0.38, 0.05, 0.95);
  const expectedDailyReturn = composite * (vol * 0.18) + sentimentScore * (vol * 0.05) + slopePct / 100;
  const confidence = clamp(0.48 + (Math.abs(composite) * 0.28) + (Math.min(1, closes.length / 250) * 0.10) - volatilityPenalty, 0.18, 0.92);

  const horizon = 5;
  const projected = [];
  let price = latest.close;
  for (let i = 1; i <= horizon; i++) {
    const decay = Math.pow(0.82, i - 1);
    const drift = expectedDailyReturn * decay;
    const noiseBand = vol * (0.45 + i * 0.05);
    price = price * (1 + drift);
    projected.push({
      date: latest.date + i * 86400000,
      close: price,
      low: price * (1 - noiseBand),
      high: price * (1 + noiseBand)
    });
  }

  const support = Math.min(...closes.slice(-20));
  const resistance = Math.max(...closes.slice(-20));
  const atrLike = Math.max(latest.close * Math.max(0.01, vol * 0.65), latest.close * 0.004);
  const action = composite > 0.18 ? 'Buy bias' : composite < -0.18 ? 'Sell bias' : 'Neutral / wait';
  const riskLevel = confidence > 0.7 && vol < 0.18 ? 'Moderate' : confidence > 0.55 ? 'Balanced' : 'High';
  const stopLoss = composite >= 0 ? latest.close - atrLike * (1.2 + (1 - confidence)) : latest.close + atrLike * (1.2 + (1 - confidence));
  const takeProfit = composite >= 0 ? latest.close + atrLike * (2.0 + confidence) : latest.close - atrLike * (2.0 + confidence);
  const buyZone = Math.min(latest.close, support + atrLike * 0.35);
  const sellZone = Math.max(latest.close, resistance - atrLike * 0.35);

  return {
    closes, latest, prev,
    sma20, sma50, sma200, ema12, ema26, rsi14, macd: macdData, bb,
    reg, vol, slopePct, momentum, macdScore, trendScore, sentimentScore,
    composite, probabilityUp, confidence, projected, action, riskLevel,
    support, resistance, atrLike, stopLoss, takeProfit, buyZone, sellZone,
    bbWidth
  };
}

/* ========= Prediction memory ========= */
function loadPredictions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.predictions) || '[]'); } catch { return []; }
}
function savePredictions(list) {
  localStorage.setItem(STORAGE_KEYS.predictions, JSON.stringify(list.slice(-120)));
}
function registerPrediction(asset, analysis, rangeId) {
  const predictions = loadPredictions();
  const forecastDate = analysis.projected.at(-1).date;
  predictions.push({
    id: `${asset.id}-${Date.now()}`,
    assetId: asset.id,
    createdAt: Date.now(),
    rangeId,
    refClose: analysis.latest.close,
    forecastDate,
    expectedClose: analysis.projected.at(-1).close,
    direction: analysis.composite >= 0 ? 'up' : 'down',
    confidence: analysis.confidence,
    resolved: false
  });
  savePredictions(predictions);
}
function reconcilePredictions(currentSeries, currentAssetId) {
  const predictions = loadPredictions();
  let changed = false;
  const latest = currentSeries.at(-1)?.close;
  const lastDate = currentSeries.at(-1)?.date || Date.now();
  for (const p of predictions) {
    if (p.assetId !== currentAssetId || p.resolved) continue;
    if (p.forecastDate && lastDate >= p.forecastDate) {
      const actual = latest;
      const actualDirection = actual >= p.refClose ? 'up' : 'down';
      p.resolved = true;
      p.actualClose = actual;
      p.hit = actualDirection === p.direction;
      p.absErrorPct = Math.abs((actual - p.expectedClose) / p.expectedClose) * 100;
      p.directionError = actualDirection === p.direction ? 0 : 1;
      changed = true;
    }
  }
  if (changed) savePredictions(predictions);
  return predictions.filter(p => p.assetId === currentAssetId).sort((a,b) => b.createdAt - a.createdAt);
}
function metricsFromPredictions(predictions) {
  const resolved = predictions.filter(p => p.resolved);
  const acc = resolved.length ? resolved.filter(p => p.hit).length / resolved.length : null;
  const error = resolved.length ? mean(resolved.map(p => p.absErrorPct || 0)) : null;
  return { resolved, acc, error };
}

/* ========= Rendering ========= */
function setLoading(isLoading) {
  document.body.classList.toggle('loading', isLoading);
  els.connectionPill.textContent = isLoading ? 'Loading…' : 'Live';
}

function renderTabs() {
  els.assetTabs.innerHTML = '';
  ASSETS.forEach(asset => {
    const btn = document.createElement('button');
    btn.textContent = asset.label;
    btn.className = asset.id === state.assetId ? 'active' : '';
    btn.addEventListener('click', () => setAsset(asset.id));
    els.assetTabs.appendChild(btn);
  });

  els.rangeTabs.innerHTML = '';
  RANGES.forEach(range => {
    const btn = document.createElement('button');
    btn.textContent = range.label;
    btn.className = range.id === state.rangeId ? 'active' : '';
    btn.addEventListener('click', () => setRange(range.id));
    els.rangeTabs.appendChild(btn);
  });

  els.selectedAsset.innerHTML = ASSETS.map(a => `<option value="${a.id}">${a.displayName}</option>`).join('');
  els.selectedAsset.value = state.assetId;
}

function renderSettings() {
  els.alphaKey.value = state.settings.alphaKey || '';
  els.fmpKey.value = state.settings.fmpKey || '';
  els.refreshInterval.value = String(state.settings.refreshInterval || 300000);
  els.symbolSilver.value = state.settings.symbols.silver || 'XAG';
  els.symbolWti.value = state.settings.symbols.wti || 'WTI';
  els.symbolBrent.value = state.settings.symbols.brent || 'BRENT';
  els.symbolTech.value = state.settings.symbols.tech || '%5ENDX';
  els.symbolCack.value = state.settings.symbols.cack || '%5EFCHI';

  els.modalAlphaKey.value = state.settings.alphaKey || '';
  els.modalFmpKey.value = state.settings.fmpKey || '';
}

function indicatorCard(title, value, detail, pct) {
  return `
    <div class="indicator-card">
      <h3>${title}</h3>
      <strong>${value}</strong>
      <span>${detail}</span>
      <div class="bar"><span style="width:${clamp(pct, 0, 100)}%"></span></div>
    </div>`;
}

function renderIndicators(analysis, asset, news) {
  const rsiValue = lastFinite(analysis.rsi14) ?? 50;
  const macdVal = lastFinite(analysis.macd.line) ?? 0;
  const signalVal = lastFinite(analysis.macd.signal) ?? 0;
  const histVal = lastFinite(analysis.macd.hist) ?? 0;
  const bbWidth = analysis.bbWidth;
  els.indicatorGrid.innerHTML = [
    indicatorCard('RSI (14)', rsiValue.toFixed(1), rsiValue > 70 ? 'Overbought zone' : rsiValue < 30 ? 'Oversold zone' : 'Balanced momentum', clamp(rsiValue, 0, 100)),
    indicatorCard('MACD', `${macdVal.toFixed(3)}`, `Signal ${signalVal.toFixed(3)} / Hist ${histVal.toFixed(3)}`, clamp(50 + histVal * 1000, 0, 100)),
    indicatorCard('Volatility', `${analysis.vol.toFixed(2)}%`, `Bollinger width ${bbWidth.toFixed(2)}%`, clamp(bbWidth * 5, 0, 100)),
    indicatorCard('Trend slope', `${analysis.slopePct.toFixed(3)}%`, analysis.slopePct >= 0 ? 'Positive drift' : 'Negative drift', clamp(50 + analysis.slopePct * 40, 0, 100))
  ].join('');

  const trendWords = analysis.composite > 0.2 ? 'bullish' : analysis.composite < -0.2 ? 'bearish' : 'mixed';
  const sentimentWords = news.score > 0.05 ? 'positive' : news.score < -0.05 ? 'negative' : 'neutral';

  els.insightList.innerHTML = `
    <div class="insight">
      <strong>Composite view</strong>
      <p>${asset.displayName} looks <b>${trendWords}</b> with a ${analysis.riskLevel.toLowerCase()} risk profile. The model agreement is ${Math.round(analysis.confidence * 100)}% confident and sentiment is ${sentimentWords}.</p>
    </div>
    <div class="insight">
      <strong>Model logic</strong>
      <p>The forecast blends moving averages, RSI, MACD, regression slope, and a headline sentiment score into a probabilistic next-step estimate.</p>
    </div>
    <div class="insight">
      <strong>Risk guardrails</strong>
      <p>Stops and targets are derived from a volatility-adjusted range. Wider bands indicate less certainty and a larger expected swing.</p>
    </div>
  `;
}

function renderNews(news) {
  els.newsList.innerHTML = news.items.map(item => {
    const cls = item.score > 0.05 ? 'sent-positive' : item.score < -0.05 ? 'sent-negative' : 'sent-neutral';
    const label = item.score > 0.05 ? 'Positive' : item.score < -0.05 ? 'Negative' : 'Neutral';
    return `
      <article class="news-item">
        <div class="meta">${item.source}</div>
        <h3><a href="${item.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
        <small>${escapeHtml(item.snippet || 'No summary available.')}</small>
        <div class="sentiment ${cls}">${label} sentiment</div>
      </article>`;
  }).join('');
}

function renderPredictionPanel(predictions) {
  const metrics = metricsFromPredictions(predictions);
  els.resolvedCount.textContent = String(metrics.resolved.length);
  els.accuracyValue.textContent = metrics.acc == null ? '—' : `${(metrics.acc * 100).toFixed(0)}%`;
  els.errorValue.textContent = metrics.error == null ? '—' : `${metrics.error.toFixed(2)}%`;

  els.predictionList.innerHTML = predictions.slice(0, 6).map(p => `
    <div class="prediction-item">
      <h3>${ASSETS.find(a => a.id === p.assetId)?.label || p.assetId} · ${p.resolved ? (p.hit ? 'Hit' : 'Miss') : 'Pending'}</h3>
      <small>Forecast ${fmtDate(p.createdAt)} → ${fmtDate(p.forecastDate)}</small>
      <small>Ref: ${fmtPrice(p.refClose)} | Target: ${fmtPrice(p.expectedClose)} | Confidence: ${(p.confidence * 100).toFixed(0)}%</small>
      <small>Direction: ${p.direction.toUpperCase()}${p.resolved ? ` | Actual: ${fmtPrice(p.actualClose)} | Error: ${p.absErrorPct?.toFixed(2)}%` : ''}</small>
      <span class="badge">${p.resolved ? (p.hit ? 'Accurate direction' : 'Direction missed') : 'Awaiting resolution'}</span>
    </div>
  `).join('') || `<div class="prediction-item"><small>No prediction history yet. New forecast records will appear after the first refresh.</small></div>`;
}

function renderHeader(asset, analysis, live, series, market) {
  els.selectedTitle.textContent = asset.displayName;
  els.livePrice.textContent = fmtPrice(live);
  els.livePriceMeta.textContent = `As of ${fmtDate(series.at(-1)?.date || Date.now())} · ${state.assetId.toUpperCase()} ${asset.provider === 'alpha' ? 'Alpha Vantage' : 'FMP'}${market.fallback ? ' · synthetic fallback' : ''}`;
  const prev = analysis.prev?.close ?? live;
  const changePct = prev ? ((live - prev) / prev) * 100 : 0;
  els.liveChange.textContent = fmtPct(changePct);
  els.liveChangeMeta.textContent = changePct >= 0 ? 'Positive day-over-day move' : 'Negative day-over-day move';
  els.confidenceValue.textContent = `${Math.round(analysis.confidence * 100)}%`;
  els.signalValue.textContent = analysis.action;
  els.signalMeta.textContent = `Probability of upside: ${(analysis.probabilityUp * 100).toFixed(0)}%`;
  els.buyZone.textContent = `${fmtPrice(analysis.buyZone)} — ${fmtPrice(analysis.buyZone + analysis.atrLike * 0.35)}`;
  els.sellZone.textContent = `${fmtPrice(analysis.sellZone - analysis.atrLike * 0.35)} — ${fmtPrice(analysis.sellZone)}`;
  els.stopZone.textContent = fmtPrice(analysis.stopLoss);
  els.tpZone.textContent = fmtPrice(analysis.takeProfit);
  els.riskNote.textContent = `Risk level: ${analysis.riskLevel}. Volatility is estimated at ${analysis.vol.toFixed(2)}% annualized, with ${Math.round(analysis.confidence * 100)}% model confidence.`;
}

function renderChart(asset, series, analysis) {
  const range = RANGES.find(r => r.id === state.rangeId) || RANGES[2];
  const cutoff = Date.now() - range.days * 86400000;
  const slice = series.filter(p => p.date >= cutoff).slice(-Math.max(30, Math.min(series.length, range.days + 15)));

  const labels = slice.map(p => new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  const closes = slice.map(p => p.close);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const bb = bollinger(closes);
  const projection = analysis.projected.map(p => ({
    label: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    close: p.close,
    low: p.low,
    high: p.high
  }));

  const forecastLabels = projection.map(p => p.label);
  const projectedLine = [...Array(labels.length).fill(null), ...projection.map(p => p.close)];
  const projectedUpper = [...Array(labels.length).fill(null), ...projection.map(p => p.high)];
  const projectedLower = [...Array(labels.length).fill(null), ...projection.map(p => p.low)];
  const allLabels = [...labels, ...forecastLabels];

  const priceSeries = [...closes, ...Array(projection.length).fill(null)];
  const sma20Series = [...sma20, ...Array(projection.length).fill(null)];
  const sma50Series = [...sma50, ...Array(projection.length).fill(null)];
  const bbUpper = [...bb.upper, ...Array(projection.length).fill(null)];
  const bbLower = [...bb.lower, ...Array(projection.length).fill(null)];

  if (chart) chart.destroy();
  chart = new Chart(els.mainChart, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        {
          label: `${asset.label} price`,
          data: priceSeries,
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.28
        },
        {
          label: 'SMA 20',
          data: sma20Series,
          borderWidth: 1.6,
          pointRadius: 0,
          tension: 0.2
        },
        {
          label: 'SMA 50',
          data: sma50Series,
          borderWidth: 1.4,
          pointRadius: 0,
          tension: 0.2
        },
        {
          label: 'Bollinger Upper',
          data: bbUpper,
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [6, 6],
          tension: 0.2
        },
        {
          label: 'Bollinger Lower',
          data: bbLower,
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [6, 6],
          tension: 0.2
        },
        {
          label: 'Forecast',
          data: projectedLine,
          borderWidth: 2,
          pointRadius: 3,
          borderDash: [8, 6],
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#dce7f5', usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${fmtPrice(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#9db0c9', maxRotation: 0, autoSkip: true },
          grid: { color: 'rgba(125,160,220,.08)' }
        },
        y: {
          ticks: {
            color: '#9db0c9',
            callback: v => fmtPrice(v)
          },
          grid: { color: 'rgba(125,160,220,.08)' }
        }
      }
    }
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

async function updateDashboard({ quiet = false } = {}) {
  const asset = selectedAssetConfig();
  const range = RANGES.find(r => r.id === state.rangeId) || RANGES[2];
  if (!quiet) setLoading(true);

  try {
    const [market, news] = await Promise.all([
      loadAsset(asset, range.days),
      loadNews(asset)
    ]);

    state.dataByAsset[asset.id] = { ...market, news };
    const analysis = buildAnalysis(market.series, news.score, asset.id);

    registerPrediction(asset, analysis, state.rangeId);
    const predictions = reconcilePredictions(market.series, asset.id);

    renderHeader(asset, analysis, market.live, market.series, market);
    renderIndicators(analysis, asset, news);
    renderNews(news);
    renderPredictionPanel(predictions);
    renderChart(asset, market.series, analysis);
    renderConnectionState(market);
    state.lastFetchAt = Date.now();
  } catch (error) {
    els.connectionPill.textContent = 'Offline';
    els.riskNote.textContent = `Unable to fetch data: ${error.message || error}. Showing local fallback state.`;
  } finally {
    if (!quiet) setLoading(false);
  }
}

function renderConnectionState(market) {
  if (market?.fallback) {
    els.connectionPill.textContent = 'Fallback data';
    els.connectionPill.style.color = 'var(--warn)';
  } else {
    els.connectionPill.textContent = 'Live';
    els.connectionPill.style.color = 'var(--accent)';
  }
}

function setAsset(assetId) {
  state.assetId = assetId;
  localStorage.setItem(STORAGE_KEYS.asset, assetId);
  renderTabs();
  updateDashboard();
}
function setRange(rangeId) {
  state.rangeId = rangeId;
  localStorage.setItem(STORAGE_KEYS.range, rangeId);
  renderTabs();
  updateDashboard({ quiet: true });
}
function applySettingsFromUI() {
  state.settings = {
    ...state.settings,
    alphaKey: els.alphaKey.value.trim(),
    fmpKey: els.fmpKey.value.trim(),
    refreshInterval: parseInt(els.refreshInterval.value, 10) || 300000,
    symbols: {
      silver: els.symbolSilver.value.trim() || DEFAULT_SETTINGS.symbols.silver,
      wti: els.symbolWti.value.trim() || DEFAULT_SETTINGS.symbols.wti,
      brent: els.symbolBrent.value.trim() || DEFAULT_SETTINGS.symbols.brent,
      tech: els.symbolTech.value.trim() || DEFAULT_SETTINGS.symbols.tech,
      cack: els.symbolCack.value.trim() || DEFAULT_SETTINGS.symbols.cack
    }
  };
  saveSettings(state.settings);
}
function openSettingsModal() {
  els.modalBackdrop.classList.remove('hidden');
  els.settingsModal.classList.remove('hidden');
  els.modalAlphaKey.value = state.settings.alphaKey || '';
  els.modalFmpKey.value = state.settings.fmpKey || '';
}
function closeSettingsModal() {
  els.modalBackdrop.classList.add('hidden');
  els.settingsModal.classList.add('hidden');
}

function bindEvents() {
  els.refreshBtn.addEventListener('click', () => updateDashboard());
  els.settingsBtn.addEventListener('click', openSettingsModal);
  els.closeSettingsBtn.addEventListener('click', closeSettingsModal);
  els.modalBackdrop.addEventListener('click', closeSettingsModal);
  els.modalCancelBtn.addEventListener('click', closeSettingsModal);
  els.modalSaveBtn.addEventListener('click', () => {
    state.settings.alphaKey = els.modalAlphaKey.value.trim();
    state.settings.fmpKey = els.modalFmpKey.value.trim();
    saveSettings(state.settings);
    renderSettings();
    closeSettingsModal();
    updateDashboard();
  });
  els.saveSettingsBtn.addEventListener('click', () => {
    applySettingsFromUI();
    updateDashboard();
  });
  els.clearCacheBtn.addEventListener('click', () => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(STORAGE_KEYS.cache)) localStorage.removeItem(k);
    });
    localStorage.removeItem(STORAGE_KEYS.predictions);
    updateDashboard();
  });
  els.selectedAsset.addEventListener('change', e => setAsset(e.target.value));
  els.refreshInterval.addEventListener('change', () => {
    applySettingsFromUI();
    scheduleAutoRefresh();
  });
  [els.symbolSilver, els.symbolWti, els.symbolBrent, els.symbolTech, els.symbolCack, els.alphaKey, els.fmpKey].forEach(el => {
    el.addEventListener('change', () => applySettingsFromUI());
  });
}

function scheduleAutoRefresh() {
  if (state.refreshHandle) clearInterval(state.refreshHandle);
  state.refreshHandle = setInterval(() => updateDashboard({ quiet: true }), state.settings.refreshInterval || 300000);
}

/* ========= Boot ========= */
(async function init() {
  renderTabs();
  renderSettings();
  bindEvents();
  applySettingsFromUI();
  scheduleAutoRefresh();

  // Initial render with cached or fallback data.
  await updateDashboard();

  // Update the prediction memory panel for the default asset.
  const asset = selectedAssetConfig();
  const predictions = reconcilePredictions((state.dataByAsset[asset.id]?.series || []), asset.id);
  renderPredictionPanel(predictions);

  // Expose for debugging.
  window.FIDashboard = {
    state,
    refresh: () => updateDashboard(),
    exportPredictions: () => JSON.stringify(loadPredictions(), null, 2)
  };
})();
