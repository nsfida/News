'use strict';

/* ════════════════════════════════════════════════════════
   Market Pulse Dashboard — script.js  v3.0
   Data: Yahoo Finance v8 chart API (free, no key needed)
   CORS: allorigins.win or corsproxy.io (configurable)
   ════════════════════════════════════════════════════════ */

/* ── Storage keys ─────────────────────────────────────── */
const STORAGE = {
  settings: 'mpd_settings_v3',
  cache:    'mpd_cache_v3',
  preds:    'mpd_preds_v3',
  asset:    'mpd_asset_v3',
  range:    'mpd_range_v3'
};

/* ── Default settings ─────────────────────────────────── */
const DEFAULT_SETTINGS = {
  refreshInterval: 120_000,   // ms
  proxy: 'allorigins',        // 'allorigins' | 'corsproxy' | 'direct'
  symbols: {
    silver: 'SI=F',
    wti:    'CL=F',
    brent:  'BZ=F',
    tech:   '^NDX',
    cac:    '^FCHI'
  }
};

/* ── Asset definitions ────────────────────────────────── */
const ASSETS = [
  {
    id: 'silver', label: 'Silver',      ticker: 'SI=F',   symbolKey: 'silver',
    newsQuery: 'silver XAG commodity futures prices',
    fallbackPrice: 32,   currency: 'USD'
  },
  {
    id: 'wti',    label: 'WTI Crude',   ticker: 'CL=F',   symbolKey: 'wti',
    newsQuery: 'WTI crude oil CL energy futures',
    fallbackPrice: 78,   currency: 'USD'
  },
  {
    id: 'brent',  label: 'Brent',       ticker: 'BZ=F',   symbolKey: 'brent',
    newsQuery: 'Brent crude oil BZ energy futures',
    fallbackPrice: 82,   currency: 'USD'
  },
  {
    id: 'tech',   label: 'Tech 45',     ticker: '^NDX',   symbolKey: 'tech',
    newsQuery: 'NASDAQ-100 NDX technology AI semiconductors stocks',
    fallbackPrice: 19_500, currency: 'USD'
  },
  {
    id: 'cac',    label: 'Cack 40',     ticker: '^FCHI',  symbolKey: 'cac',
    newsQuery: 'CAC 40 France stocks Paris bourse eurozone equities',
    fallbackPrice: 7_800,  currency: 'EUR'
  }
];

/* ── Range definitions ────────────────────────────────── */
const RANGES = [
  { id:'1M', label:'1M', yahooRange:'1mo', days:30  },
  { id:'3M', label:'3M', yahooRange:'3mo', days:90  },
  { id:'6M', label:'6M', yahooRange:'6mo', days:180 },
  { id:'1Y', label:'1Y', yahooRange:'1y',  days:365 }
];

/* ── DOM refs ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const els = {
  refreshBtn:          $('refreshBtn'),
  settingsBtn:         $('settingsBtn'),
  closeSettingsBtn:    $('closeSettingsBtn'),
  saveSettingsBtn:     $('saveSettingsBtn'),
  clearCacheBtn:       $('clearCacheBtn'),
  modalSaveBtn:        $('modalSaveBtn'),
  modalCancelBtn:      $('modalCancelBtn'),
  modalBackdrop:       $('modalBackdrop'),
  settingsModal:       $('settingsModal'),
  selectedTitle:       $('selectedTitle'),
  connectionPill:      $('connectionPill'),
  livePrice:           $('livePrice'),
  livePriceMeta:       $('livePriceMeta'),
  liveChange:          $('liveChange'),
  liveChangeMeta:      $('liveChangeMeta'),
  confidenceValue:     $('confidenceValue'),
  confidenceMeta:      $('confidenceMeta'),
  signalValue:         $('signalValue'),
  signalMeta:          $('signalMeta'),
  buyZone:             $('buyZone'),
  sellZone:            $('sellZone'),
  stopZone:            $('stopZone'),
  tpZone:              $('tpZone'),
  riskNote:            $('riskNote'),
  indicatorGrid:       $('indicatorGrid'),
  insightList:         $('insightList'),
  newsList:            $('newsList'),
  predictionList:      $('predictionList'),
  resolvedCount:       $('resolvedCount'),
  accuracyValue:       $('accuracyValue'),
  errorValue:          $('errorValue'),
  assetTabs:           $('assetTabs'),
  rangeTabs:           $('rangeTabs'),
  mainChart:           $('mainChart'),
  refreshInterval:     $('refreshInterval'),
  proxySelect:         $('proxySelect'),
  selectedAsset:       $('selectedAsset'),
  symbolSilver:        $('symbolSilver'),
  symbolWti:           $('symbolWti'),
  symbolBrent:         $('symbolBrent'),
  symbolTech:          $('symbolTech'),
  symbolCack:          $('symbolCack'),
  modalRefreshInterval:$('modalRefreshInterval'),
  modalProxySelect:    $('modalProxySelect')
};

/* ── App state ────────────────────────────────────────── */
let chartInstance = null;
const state = {
  settings:      loadSettings(),
  assetId:       localStorage.getItem(STORAGE.asset) || 'silver',
  rangeId:       localStorage.getItem(STORAGE.range) || '6M',
  refreshHandle: null,
  dataByAsset:   {}
};

/* ════════════════════════════════════════════════════════
   SETTINGS
   ════════════════════════════════════════════════════════ */
function loadSettings () {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE.settings) || '{}');
    return {
      ...DEFAULT_SETTINGS,
      ...raw,
      symbols: { ...DEFAULT_SETTINGS.symbols, ...(raw.symbols || {}) }
    };
  } catch { return { ...DEFAULT_SETTINGS, symbols: { ...DEFAULT_SETTINGS.symbols } }; }
}
function saveSettings () {
  localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings));
}

function selectedAsset () { return ASSETS.find(a => a.id === state.assetId) || ASSETS[0]; }
function selectedRange ()  { return RANGES.find(r => r.id === state.rangeId)  || RANGES[2]; }

function getSymbol (asset) {
  return (state.settings.symbols[asset.symbolKey] || asset.ticker).trim();
}

/* ════════════════════════════════════════════════════════
   UTILITIES
   ════════════════════════════════════════════════════════ */
function clamp    (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function mean     (arr)       { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function lastVal  (arr)       {
  for (let i = arr.length - 1; i >= 0; i--)
    if (arr[i] != null && Number.isFinite(arr[i])) return arr[i];
  return null;
}

function fmtPrice (v) {
  if (!Number.isFinite(v)) return '—';
  if (v >= 10_000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (v >= 100)    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}
function fmtPct (v) {
  return Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—';
}
function fmtDate (ts) {
  return new Intl.DateTimeFormat(undefined, {
    month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
  }).format(new Date(ts));
}
function escHtml (s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])
  );
}
function hashStr (s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
function seededRand (seed) {
  let x = seed | 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4_294_967_296; };
}

/* ════════════════════════════════════════════════════════
   CACHE (localStorage)
   ════════════════════════════════════════════════════════ */
function cKey (url) {
  return STORAGE.cache + ':' + btoa(unescape(encodeURIComponent(url))).slice(0, 96);
}
function getCache (url, ttl) {
  try {
    const r = JSON.parse(localStorage.getItem(cKey(url)) || 'null');
    if (r && Date.now() - r.ts < ttl) return r.data;
  } catch {}
  return null;
}
function setCache (url, data) {
  try { localStorage.setItem(cKey(url), JSON.stringify({ ts: Date.now(), data })); } catch {}
}
function clearAllCache () {
  Object.keys(localStorage)
    .filter(k => k.startsWith(STORAGE.cache))
    .forEach(k => localStorage.removeItem(k));
  localStorage.removeItem(STORAGE.preds);
}

/* ════════════════════════════════════════════════════════
   YAHOO FINANCE API
   ════════════════════════════════════════════════════════ */

/** Build base Yahoo Finance chart URL (no proxy yet) */
function yfChartUrl (symbol, range, interval = '1d') {
  const enc = encodeURIComponent(symbol);
  return `https://query2.finance.yahoo.com/v8/finance/chart/${enc}?interval=${interval}&range=${range}&includePrePost=false&events=div%2Csplit`;
}

/** Wrap a base URL with the configured CORS proxy */
function applyProxy (url) {
  const proxy = state.settings.proxy || 'allorigins';
  if (proxy === 'allorigins') return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  if (proxy === 'corsproxy')  return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  return url; // direct
}

/**
 * Fetch a Yahoo Finance URL.
 * Tries: configured proxy → fallback proxy → direct.
 * Returns { data, fromCache }
 */
async function fetchYF (url, ttl = 300_000) {
  const cached = getCache(url, ttl);
  if (cached) return { data: cached, fromCache: true };

  // Build ordered strategy list (avoid duplicates)
  const proxied   = applyProxy(url);
  const allorigins = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const corsproxy  = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  const strategies = [...new Set([proxied, allorigins, corsproxy, url])];

  let lastError = null;
  for (const target of strategies) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 13_000);
      const res = await fetch(target, {
        signal: ctrl.signal,
        headers: { Accept: 'application/json, text/plain, */*' }
      });
      clearTimeout(timer);
      if (!res.ok) { lastError = `HTTP ${res.status} from ${target}`; continue; }

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch { lastError = 'JSON parse error'; continue; }

      // Validate it's actually a YF chart response
      if (data?.chart?.result?.[0]?.meta) {
        setCache(url, data);
        return { data, fromCache: false };
      }
      // Handle YF error response
      if (data?.chart?.error) {
        lastError = data.chart.error.description || 'YF API error';
        continue;
      }
    } catch (e) {
      lastError = e.message || String(e);
    }
  }
  throw new Error(`All fetch strategies failed: ${lastError}`);
}

/** Parse Yahoo Finance v8 chart JSON → { history, livePrice, prevClose, changePct, ... } */
function parseYFChart (data) {
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const meta  = result.meta || {};
  const ts    = result.timestamp || [];
  const q     = result.indicators?.quote?.[0] || {};
  const ac    = result.indicators?.adjclose?.[0]?.adjclose;

  // Prefer adjusted close; fall back to raw close
  const rawCloses = ac?.length ? ac : (q.close || []);

  const history = ts.map((t, i) => {
    const c = rawCloses[i];
    if (c == null || !Number.isFinite(c) || c <= 0) return null;
    return {
      date:   t * 1000,
      open:   q.open?.[i]   ?? c,
      high:   q.high?.[i]   ?? c,
      low:    q.low?.[i]    ?? c,
      close:  c,
      volume: q.volume?.[i] ?? 0
    };
  }).filter(Boolean).sort((a, b) => a.date - b.date);

  const livePrice  = meta.regularMarketPrice ?? history.at(-1)?.close;
  const prevClose  = meta.previousClose      ?? meta.chartPreviousClose ?? history.at(-2)?.close;
  const changePct  = (livePrice != null && prevClose != null && prevClose !== 0)
    ? ((livePrice - prevClose) / prevClose) * 100
    : null;

  return {
    history,
    livePrice,
    prevClose,
    changePct,
    currency:    meta.currency || 'USD',
    symbol:      meta.symbol,
    shortName:   meta.shortName || meta.longName || meta.symbol,
    marketState: meta.marketState || 'CLOSED',
    dayHigh:     meta.regularMarketDayHigh,
    dayLow:      meta.regularMarketDayLow,
    volume:      meta.regularMarketVolume,
    exchange:    meta.fullExchangeName || meta.exchangeName || ''
  };
}

/** Master data resolver — returns normalised market data for one asset + range */
async function resolveAssetData (asset, range) {
  const symbol   = getSymbol(asset);
  const histUrl  = yfChartUrl(symbol, range.yahooRange, '1d');
  const quoteUrl = yfChartUrl(symbol, '5d',           '1d');  // short range for fresh quote

  let parsed    = null;
  let isCached  = false;
  let source    = '';

  try {
    const histRes = await fetchYF(histUrl, 15 * 60 * 1000);
    parsed   = parseYFChart(histRes.data);
    isCached = histRes.fromCache;
    source   = isCached ? 'Yahoo Finance (cache)' : 'Yahoo Finance (live)';

    // Overlay a fresher live price (2-min TTL)
    try {
      const qRes = await fetchYF(quoteUrl, 2 * 60 * 1000);
      const qp   = parseYFChart(qRes.data);
      if (qp?.livePrice != null) {
        parsed.livePrice   = qp.livePrice;
        parsed.changePct   = qp.changePct;
        parsed.dayHigh     = qp.dayHigh;
        parsed.dayLow      = qp.dayLow;
        parsed.volume      = qp.volume;
        parsed.marketState = qp.marketState;
      }
    } catch { /* non-fatal — historical meta price is fine */ }

  } catch (err) {
    console.warn(`[MPD] Yahoo Finance failed for ${asset.label}:`, err.message);
  }

  // Validate result
  if (!parsed || parsed.history.length < 5) {
    console.warn(`[MPD] Falling back to synthetic data for ${asset.label}`);
    const history = generateFallbackSeries(asset.id, asset.fallbackPrice);
    return {
      history,
      livePrice:   history.at(-1).close,
      prevClose:   history.at(-2)?.close,
      changePct:   null,
      dayHigh:     null,
      dayLow:      null,
      volume:      null,
      marketState: 'CLOSED',
      symbol,
      source:      'synthetic fallback — check proxy / CORS settings',
      fallback:    true
    };
  }

  return { ...parsed, symbol, source, fallback: false };
}

/* ════════════════════════════════════════════════════════
   SYNTHETIC FALLBACK DATA
   ════════════════════════════════════════════════════════ */
function generateFallbackSeries (id, base, days = 420) {
  const rng  = seededRand(hashStr(id));
  const data = [];
  let p = base;
  for (let i = days; i >= 0; i--) {
    const date = Date.now() - i * 86_400_000;
    const ret  = (rng() - 0.497) * 0.021
               + Math.sin(i / 18) * 0.003
               + Math.cos(i / 42) * 0.002;
    const o = p;
    p = Math.max(0.01, p * (1 + ret));
    const h = Math.max(o, p) * (1 + rng() * 0.006);
    const l = Math.min(o, p) * (1 - rng() * 0.006);
    data.push({ date, open: o, high: h, low: l, close: p, volume: 80_000 + Math.floor(rng() * 40_000) });
  }
  return data;
}

/* ════════════════════════════════════════════════════════
   NEWS — GDELT (free, CORS-enabled)
   ════════════════════════════════════════════════════════ */
async function loadNews (asset) {
  const items = [];

  try {
    const url = 'https://api.gdeltproject.org/api/v2/doc/doc?' + new URLSearchParams({
      query:      asset.newsQuery,
      mode:       'ArtList',
      format:     'json',
      sort:       'HybridRel',
      maxrecords: '10',
      timespan:   '7d'
    });
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const d = await res.json();
      const articles = d.articles || d.results || [];
      for (const a of articles.slice(0, 8)) {
        const title   = a.title || a.seendate || 'News item';
        const snippet = a.summary || a.excerpt || a.description || '';
        items.push({
          title,
          snippet,
          url:    a.url || '#',
          score:  sentimentScore(`${title} ${snippet}`),
          source: a.sourcecountry || a.source || 'GDELT'
        });
      }
    }
  } catch (e) {
    console.warn('[MPD] News fetch failed:', e.message);
  }

  if (!items.length) {
    [
      { t: `${asset.label} holds key support as macro data drives sentiment`, s: 0.07 },
      { t: `Volatility elevated in ${asset.label} on global risk flows`,       s: -0.06 },
      { t: `Analysts diverge on ${asset.label} near-term price outlook`,       s: 0.0  }
    ].forEach(x =>
      items.push({ title: x.t, snippet: 'Offline fallback.', url: '#', score: x.s, source: 'offline' })
    );
  }

  return { items, score: items.length ? mean(items.map(i => i.score)) : 0 };
}

function sentimentScore (text) {
  const pos = ['beat','bull','surge','rally','gain','growth','strong','record','optimistic','support','upside','recovery','outperform','upgrade','positive','rise','increase','high'];
  const neg = ['miss','bear','slump','drop','fall','weak','risk','warning','fear','downside','recession','pressure','cut','selloff','negative','decline','loss','crash','low'];
  const t = text.toLowerCase();
  let s = 0;
  pos.forEach(k => { if (t.includes(k)) s += 1; });
  neg.forEach(k => { if (t.includes(k)) s -= 1; });
  return clamp(s / 8, -1, 1);
}

/* ════════════════════════════════════════════════════════
   TECHNICAL ANALYSIS
   ════════════════════════════════════════════════════════ */
function sma (values, period) {
  const out = Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function ema (values, period) {
  const out = Array(values.length).fill(null);
  const k   = 2 / (period + 1);
  let prev  = null;
  for (let i = 0; i < values.length; i++) {
    if (i === period - 1) {
      prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      out[i] = prev;
    } else if (i > period - 1) {
      prev   = values[i] * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

function stddev (values, period) {
  const out = Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const m = mean(slice);
    out[i] = Math.sqrt(slice.reduce((acc, v) => acc + (v - m) ** 2, 0) / period);
  }
  return out;
}

function rsi (values, period = 14) {
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
        out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      out[i]  = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
  }
  return out;
}

function macd (values, fast = 12, slow = 26, sig = 9) {
  const fastE  = ema(values, fast);
  const slowE  = ema(values, slow);
  const line   = values.map((_, i) => fastE[i] != null && slowE[i] != null ? fastE[i] - slowE[i] : null);
  const sigLine = ema(line.map(v => v ?? 0), sig).map((v, i) => line[i] == null ? null : v);
  const hist   = line.map((v, i) => v != null && sigLine[i] != null ? v - sigLine[i] : null);
  return { line, signal: sigLine, hist };
}

function bollinger (values, period = 20, mult = 2) {
  const mid = sma(values, period);
  const sd  = stddev(values, period);
  return {
    middle: mid,
    upper:    values.map((_, i) => mid[i] != null ? mid[i] + mult * sd[i] : null),
    lower:    values.map((_, i) => mid[i] != null ? mid[i] - mult * sd[i] : null),
    widthPct: values.map((_, i) => mid[i] != null && mid[i] > 0 ? (mult * 2 * sd[i]) / mid[i] * 100 : null)
  };
}

function pctReturns (values) {
  const out = Array(values.length).fill(null);
  for (let i = 1; i < values.length; i++) out[i] = (values[i] / values[i - 1]) - 1;
  return out;
}

function annualizedVol (values, lookback = 20) {
  const rets = pctReturns(values).filter(Number.isFinite).slice(-lookback);
  if (rets.length < 2) return 0;
  const m   = mean(rets);
  const variance = rets.reduce((acc, v) => acc + (v - m) ** 2, 0) / rets.length;
  return Math.sqrt(variance) * Math.sqrt(252);
}

function linearRegression (values, lookback = 30) {
  const n     = Math.min(lookback, values.length);
  const slice = values.slice(values.length - n);
  const xs    = slice.map((_, i) => i);
  const mx    = mean(xs);
  const my    = mean(slice);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (slice[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope     = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  return { slope, intercept, predicted: intercept + slope * n };
}

/* ── Master analysis builder ───────────────────────────── */
function buildAnalysis (series, sentVal) {
  const closes = series.map(p => p.close);
  const latest = series.at(-1);
  const prev   = series.at(-2) || latest;

  const sma20     = sma(closes, 20);
  const sma50     = sma(closes, 50);
  const sma200    = sma(closes, 200);
  const rsi14     = rsi(closes, 14);
  const macdData  = macd(closes);
  const bb        = bollinger(closes);
  const vol       = annualizedVol(closes, 20);
  const reg       = linearRegression(closes, Math.min(60, closes.length));

  const curSMA20  = lastVal(sma20)  ?? latest.close;
  const curSMA50  = lastVal(sma50)  ?? latest.close;
  const curSMA200 = lastVal(sma200) ?? latest.close;
  const rsiVal    = lastVal(rsi14)  ?? 50;
  const macdHist  = lastVal(macdData.hist) ?? 0;
  const bbWidth   = lastVal(bb.widthPct)   ?? 0;
  const slopePct  = reg.slope / Math.max(latest.close, 0.001) * 100;

  const trendShort = curSMA20 > curSMA50  ? 1 : -1;
  const trendLong  = curSMA50 > curSMA200 ? 1 : -1;
  const momentum   = clamp((rsiVal - 50) / 50, -1, 1);
  const macdScore  = clamp(macdHist / Math.max(0.0001, latest.close * 0.0025), -1, 1);
  const trendScore = clamp((trendShort + trendLong) / 2, -1, 1) * 0.8
                   + clamp(slopePct / 0.3, -1, 1) * 0.2;
  const sentClamped = clamp(sentVal, -1, 1);

  // Composite score: trend 40%, momentum 22%, MACD 18%, sentiment 20%
  const composite = clamp(
    trendScore * 0.40 + momentum * 0.22 + macdScore * 0.18 + sentClamped * 0.20,
    -1, 1
  );
  const probabilityUp = clamp(0.5 + composite * 0.38, 0.05, 0.95);
  const confidence    = clamp(
    0.5 + Math.abs(composite) * 0.28
        + Math.min(1, closes.length / 250) * 0.10
        - clamp(bbWidth / 14, 0, 0.30),
    0.18, 0.94
  );
  const expDailyReturn = composite * vol * 0.18 + sentClamped * vol * 0.05 + slopePct / 100;

  // 5-day probabilistic projection
  let price = latest.close;
  const projected = [];
  for (let i = 1; i <= 5; i++) {
    const decay = Math.pow(0.80, i - 1);
    price = price * (1 + expDailyReturn * decay);
    const noiseBand = vol * (0.45 + i * 0.05);
    projected.push({
      date:  latest.date + i * 86_400_000,
      close: price,
      low:   price * (1 - noiseBand),
      high:  price * (1 + noiseBand)
    });
  }

  // Support / resistance from recent price action
  const recentCloses = closes.slice(-20);
  const support    = Math.min(...recentCloses);
  const resistance = Math.max(...recentCloses);
  const atr        = Math.max(latest.close * Math.max(0.01, vol * 0.65), latest.close * 0.004);
  const buyZone    = Math.min(latest.close, support    + atr * 0.35);
  const sellZone   = Math.max(latest.close, resistance - atr * 0.35);
  const stopLoss   = composite >= 0
    ? latest.close - atr * (1.2 + (1 - confidence))
    : latest.close + atr * (1.2 + (1 - confidence));
  const takeProfit = composite >= 0
    ? latest.close + atr * (2.0 + confidence)
    : latest.close - atr * (2.0 + confidence);

  return {
    closes, latest, prev, sma20, sma50, sma200, rsi14, macd: macdData, bb, vol,
    slopePct, rsiVal, macdHist, bbWidth,
    trendScore, momentum, macdScore, composite,
    probabilityUp, confidence, projected,
    buyZone, sellZone, stopLoss, takeProfit, atr,
    support, resistance,
    riskLevel: confidence > 0.70 && vol < 0.18 ? 'Moderate' : confidence > 0.55 ? 'Balanced' : 'High',
    action:    composite > 0.18 ? 'Buy bias' : composite < -0.18 ? 'Sell bias' : 'Neutral / wait'
  };
}

/* ════════════════════════════════════════════════════════
   PREDICTION TRACKING
   ════════════════════════════════════════════════════════ */
function loadPredictions () {
  try { return JSON.parse(localStorage.getItem(STORAGE.preds) || '[]'); } catch { return []; }
}
function savePredictions (list) {
  localStorage.setItem(STORAGE.preds, JSON.stringify(list.slice(-200)));
}
function registerPrediction (asset, analysis) {
  const list = loadPredictions();
  list.push({
    id:           `${asset.id}-${Date.now()}`,
    assetId:      asset.id,
    createdAt:    Date.now(),
    rangeId:      state.rangeId,
    refClose:     analysis.latest.close,
    forecastDate: analysis.projected.at(-1).date,
    expectedClose:analysis.projected.at(-1).close,
    direction:    analysis.composite >= 0 ? 'up' : 'down',
    confidence:   analysis.confidence,
    resolved:     false
  });
  savePredictions(list);
}
function reconcilePredictions (series, assetId) {
  const list    = loadPredictions();
  const latest  = series.at(-1)?.close;
  const lastDate= series.at(-1)?.date || Date.now();
  let changed   = false;
  for (const p of list) {
    if (p.assetId !== assetId || p.resolved) continue;
    if (lastDate >= p.forecastDate) {
      p.resolved       = true;
      p.actualClose    = latest;
      p.hit            = (latest >= p.refClose ? 'up' : 'down') === p.direction;
      p.absErrorPct    = Math.abs((latest - p.expectedClose) / p.expectedClose) * 100;
      changed = true;
    }
  }
  if (changed) savePredictions(list);
  return list.filter(p => p.assetId === assetId).sort((a, b) => b.createdAt - a.createdAt);
}
function predMetrics (preds) {
  const resolved = preds.filter(p => p.resolved);
  return {
    resolved,
    acc:   resolved.length ? resolved.filter(p => p.hit).length / resolved.length : null,
    error: resolved.length ? mean(resolved.map(p => p.absErrorPct || 0)) : null
  };
}

/* ════════════════════════════════════════════════════════
   RENDERING
   ════════════════════════════════════════════════════════ */

function setPill (text, color) {
  els.connectionPill.textContent = text;
  els.connectionPill.style.color = color || 'var(--accent)';
}

function renderTabs () {
  els.assetTabs.innerHTML = '';
  ASSETS.forEach(asset => {
    const btn = document.createElement('button');
    btn.textContent = asset.label;
    btn.className   = asset.id === state.assetId ? 'active' : '';
    btn.addEventListener('click', () => switchAsset(asset.id));
    els.assetTabs.appendChild(btn);
  });

  els.rangeTabs.innerHTML = '';
  RANGES.forEach(range => {
    const btn = document.createElement('button');
    btn.textContent = range.label;
    btn.className   = range.id === state.rangeId ? 'active' : '';
    btn.addEventListener('click', () => switchRange(range.id));
    els.rangeTabs.appendChild(btn);
  });

  // Footer select
  els.selectedAsset.innerHTML = ASSETS.map(a =>
    `<option value="${a.id}"${a.id === state.assetId ? ' selected' : ''}>${a.label}</option>`
  ).join('');
}

function renderSettings () {
  const { settings } = state;
  if (els.refreshInterval)      els.refreshInterval.value      = String(settings.refreshInterval);
  if (els.proxySelect)          els.proxySelect.value          = settings.proxy || 'allorigins';
  if (els.modalRefreshInterval) els.modalRefreshInterval.value = String(settings.refreshInterval);
  if (els.modalProxySelect)     els.modalProxySelect.value     = settings.proxy || 'allorigins';
  if (els.symbolSilver) els.symbolSilver.value = settings.symbols.silver || 'SI=F';
  if (els.symbolWti)    els.symbolWti.value    = settings.symbols.wti    || 'CL=F';
  if (els.symbolBrent)  els.symbolBrent.value  = settings.symbols.brent  || 'BZ=F';
  if (els.symbolTech)   els.symbolTech.value   = settings.symbols.tech   || '^NDX';
  if (els.symbolCack)   els.symbolCack.value   = settings.symbols.cac    || '^FCHI';
}

function renderHeader (asset, market, analysis) {
  const live = market.livePrice;
  const prev = market.prevClose ?? analysis.prev?.close ?? live;

  const displayChangePct = market.changePct ?? (prev && prev !== 0 ? ((live - prev) / prev) * 100 : null);

  els.selectedTitle.textContent    = `${asset.label} — ${market.symbol || asset.ticker}`;
  els.livePrice.textContent        = fmtPrice(live);
  els.livePrice.style.color        = '';

  // Colour the change
  if (displayChangePct != null) {
    els.liveChange.textContent      = fmtPct(displayChangePct);
    els.liveChange.style.color      = displayChangePct >= 0 ? 'var(--good)' : 'var(--bad)';
    els.liveChangeMeta.textContent  = displayChangePct >= 0 ? 'Positive day-over-day' : 'Negative day-over-day';
  } else {
    els.liveChange.textContent     = '—';
    els.liveChange.style.color     = '';
    els.liveChangeMeta.textContent = 'Change unavailable';
  }

  // Metadata row
  const stateLabel = market.marketState === 'REGULAR' ? '🟢 Market open'
                   : market.marketState === 'PRE'     ? '🟡 Pre-market'
                   : market.marketState === 'POST'    ? '🟡 After-hours'
                   : '⚫ Market closed';
  const hiLo = (market.dayHigh && market.dayLow)
    ? ` · H ${fmtPrice(market.dayHigh)} / L ${fmtPrice(market.dayLow)}`
    : '';
  const vol = market.volume
    ? ` · Vol ${Intl.NumberFormat(undefined, { notation:'compact' }).format(market.volume)}`
    : '';
  els.livePriceMeta.textContent = `${stateLabel}${hiLo}${vol} · ${market.source}`;

  els.confidenceValue.textContent  = `${Math.round(analysis.confidence * 100)}%`;
  els.confidenceMeta.textContent   = `Volatility: ${(analysis.vol * 100).toFixed(1)}% ann.`;
  els.signalValue.textContent      = analysis.action;
  els.signalValue.style.color      = analysis.composite > 0.18 ? 'var(--good)'
                                   : analysis.composite < -0.18 ? 'var(--bad)'
                                   : 'var(--warn)';
  els.signalMeta.textContent       = `Upside probability: ${(analysis.probabilityUp * 100).toFixed(0)}%`;

  els.buyZone.textContent  = `${fmtPrice(analysis.buyZone)} → ${fmtPrice(analysis.buyZone  + analysis.atr * 0.35)}`;
  els.sellZone.textContent = `${fmtPrice(analysis.sellZone - analysis.atr * 0.35)} → ${fmtPrice(analysis.sellZone)}`;
  els.stopZone.textContent = fmtPrice(analysis.stopLoss);
  els.tpZone.textContent   = fmtPrice(analysis.takeProfit);
  els.riskNote.textContent = `Risk level: ${analysis.riskLevel}. Ann. volatility ${(analysis.vol * 100).toFixed(1)}% · Confidence ${Math.round(analysis.confidence * 100)}%.`;
}

function renderIndicators (analysis, news) {
  const rsiV   = analysis.rsiVal ?? 50;
  const macdL  = lastVal(analysis.macd.line)   ?? 0;
  const macdS  = lastVal(analysis.macd.signal) ?? 0;
  const hist   = analysis.macdHist ?? 0;
  const bbW    = analysis.bbWidth  ?? 0;

  els.indicatorGrid.innerHTML = [
    {
      title:  'RSI (14)',
      value:  rsiV.toFixed(1),
      detail: rsiV > 70 ? '⚠ Overbought zone' : rsiV < 30 ? '⚠ Oversold zone' : '✔ Balanced momentum',
      pct:    clamp(rsiV, 0, 100)
    },
    {
      title:  'MACD',
      value:  macdL.toFixed(3),
      detail: `Signal ${macdS.toFixed(3)} | Hist ${hist >= 0 ? '+' : ''}${hist.toFixed(3)}`,
      pct:    clamp(50 + hist / Math.max(0.001, Math.abs(macdL)) * 25, 0, 100)
    },
    {
      title:  'Volatility (ann.)',
      value:  `${(analysis.vol * 100).toFixed(1)}%`,
      detail: `Bollinger width ${bbW.toFixed(2)}%`,
      pct:    clamp(bbW * 5, 0, 100)
    },
    {
      title:  'Trend slope',
      value:  `${analysis.slopePct.toFixed(3)}%/day`,
      detail: analysis.slopePct >= 0 ? '↑ Positive drift' : '↓ Negative drift',
      pct:    clamp(50 + analysis.slopePct * 40, 0, 100)
    }
  ].map(({ title, value, detail, pct }) => `
    <div class="indicator-card">
      <h3>${title}</h3>
      <strong>${value}</strong>
      <span>${detail}</span>
      <div class="bar"><span style="width:${pct.toFixed(1)}%"></span></div>
    </div>`).join('');

  const trendWord = analysis.composite > 0.20 ? 'bullish' : analysis.composite < -0.20 ? 'bearish' : 'mixed';
  const sentWord  = news.score > 0.05 ? 'positive' : news.score < -0.05 ? 'negative' : 'neutral';

  els.insightList.innerHTML = `
    <div class="insight">
      <strong>Composite view</strong>
      <p>${selectedAsset().label} looks <b>${trendWord}</b> with a ${analysis.riskLevel.toLowerCase()} risk profile.
      Model confidence is <b>${Math.round(analysis.confidence * 100)}%</b>; news sentiment is ${sentWord}.</p>
    </div>
    <div class="insight">
      <strong>Model logic</strong>
      <p>Forecast blends 20/50/200-day SMAs, RSI, MACD histogram, linear regression slope, and headline sentiment into a 5-day probabilistic projection.</p>
    </div>
    <div class="insight">
      <strong>Risk guardrails</strong>
      <p>Zones are volatility-adjusted (${(analysis.vol * 100).toFixed(1)}% ann. vol). Wider Bollinger bands signal elevated uncertainty and lower directional conviction.</p>
    </div>`;
}

function renderNews (news) {
  els.newsList.innerHTML = news.items.map(item => {
    const cls   = item.score > 0.05 ? 'sent-positive' : item.score < -0.05 ? 'sent-negative' : 'sent-neutral';
    const label = item.score > 0.05 ? 'Positive' : item.score < -0.05 ? 'Negative' : 'Neutral';
    return `
      <article class="news-item">
        <div class="meta">${escHtml(item.source)}</div>
        <h3><a href="${escHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escHtml(item.title)}</a></h3>
        ${item.snippet ? `<small>${escHtml(item.snippet.slice(0, 120))}…</small>` : ''}
        <div class="sentiment ${cls}">${label}</div>
      </article>`;
  }).join('');
}

function renderPredictions (preds) {
  const m = predMetrics(preds);
  els.resolvedCount.textContent = String(m.resolved.length);
  els.accuracyValue.textContent = m.acc   != null ? `${(m.acc * 100).toFixed(0)}%` : '—';
  els.errorValue.textContent    = m.error != null ? `${m.error.toFixed(2)}%` : '—';

  els.predictionList.innerHTML = preds.slice(0, 6).map(p => {
    const assetLabel = (ASSETS.find(a => a.id === p.assetId) || {}).label || p.assetId;
    const statusCls  = p.resolved ? (p.hit ? 'sent-positive' : 'sent-negative') : 'sent-neutral';
    const statusText = p.resolved ? (p.hit ? '✓ Hit' : '✗ Miss') : '⏳ Pending';
    return `
      <div class="prediction-item">
        <h3>${escHtml(assetLabel)}</h3>
        <small>${fmtDate(p.createdAt)} → ${fmtDate(p.forecastDate)}</small>
        <small>Ref: ${fmtPrice(p.refClose)} | Target: ${fmtPrice(p.expectedClose)} | Conf: ${Math.round(p.confidence * 100)}%</small>
        <small>Dir: <b>${p.direction.toUpperCase()}</b>${p.resolved
          ? ` | Actual: ${fmtPrice(p.actualClose)} | Err: ${p.absErrorPct?.toFixed(2)}%` : ''}</small>
        <span class="badge ${statusCls}">${statusText}</span>
      </div>`;
  }).join('') || '<div class="prediction-item"><small>No predictions yet — they appear after first refresh.</small></div>';
}

function renderChart (asset, series, analysis) {
  const range  = selectedRange();
  const cutoff = Date.now() - range.days * 86_400_000;
  const slice  = series.filter(p => p.date >= cutoff);

  if (slice.length < 2) return;

  const labels  = slice.map(p => new Date(p.date).toLocaleDateString(undefined, { month:'short', day:'numeric' }));
  const closes  = slice.map(p => p.close);
  const sma20   = sma(closes, Math.min(20, closes.length));
  const sma50   = sma(closes, Math.min(50, closes.length));
  const bb      = bollinger(closes, Math.min(20, closes.length));
  const proj    = analysis.projected;

  const allLabels  = [...labels, ...proj.map(p => new Date(p.date).toLocaleDateString(undefined, { month:'short', day:'numeric' }))];
  const nFore      = proj.length;
  const pad        = (arr, fill = null) => [...arr, ...Array(nFore).fill(fill)];

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  // Chart colours
  const C = {
    price:  '#75d1ff',
    sma20:  '#6c8bff',
    sma50:  '#ffc66d',
    bb:     'rgba(117,209,255,0.35)',
    fore:   '#4fe2a5',
    grid:   'rgba(125,160,220,0.08)',
    tick:   '#9db0c9'
  };

  chartInstance = new Chart(els.mainChart, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        {
          label:       asset.label + ' Price',
          data:        pad(closes),
          borderColor: C.price,
          borderWidth: 2.5,
          pointRadius: 0,
          tension:     0.25,
          fill:        false
        },
        {
          label:       'SMA 20',
          data:        pad(sma20),
          borderColor: C.sma20,
          borderWidth: 1.5,
          pointRadius: 0,
          tension:     0.2,
          fill:        false
        },
        {
          label:       'SMA 50',
          data:        pad(sma50),
          borderColor: C.sma50,
          borderWidth: 1.5,
          pointRadius: 0,
          tension:     0.2,
          fill:        false
        },
        {
          label:       'BB Upper',
          data:        pad(bb.upper),
          borderColor: C.bb,
          borderWidth: 1,
          borderDash:  [5, 5],
          pointRadius: 0,
          fill:        false
        },
        {
          label:       'BB Lower',
          data:        pad(bb.lower),
          borderColor: C.bb,
          borderWidth: 1,
          borderDash:  [5, 5],
          pointRadius: 0,
          fill:        '+1',
          backgroundColor: 'rgba(117,209,255,0.04)'
        },
        {
          label:       '5-day Forecast',
          data:        [...Array(labels.length).fill(null), ...proj.map(p => p.close)],
          borderColor: C.fore,
          borderWidth: 2,
          borderDash:  [8, 5],
          pointRadius: 4,
          pointBackgroundColor: C.fore,
          tension:     0.3,
          fill:        false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      animation:   { duration: 400 },
      plugins: {
        legend: {
          labels: { color: '#dce7f5', usePointStyle: true, pointStyleWidth: 10, font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${fmtPrice(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: C.tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          grid:  { color: C.grid }
        },
        y: {
          ticks: { color: C.tick, callback: v => fmtPrice(v) },
          grid:  { color: C.grid }
        }
      }
    }
  });
}

/* ════════════════════════════════════════════════════════
   MAIN UPDATE LOOP
   ════════════════════════════════════════════════════════ */
async function updateDashboard ({ quiet = false } = {}) {
  const asset = selectedAsset();
  const range = selectedRange();

  if (!quiet) {
    setPill('Loading…', 'var(--warn)');
    document.body.classList.add('loading');
  }

  try {
    const [market, news] = await Promise.all([
      resolveAssetData(asset, range),
      loadNews(asset)
    ]);

    state.dataByAsset[asset.id] = { market, news };

    const series   = market.history;
    const analysis = buildAnalysis(series, news.score);

    registerPrediction(asset, analysis);
    const preds = reconcilePredictions(series, asset.id);

    renderHeader(asset, market, analysis);
    renderIndicators(analysis, news);
    renderNews(news);
    renderPredictions(preds);
    renderChart(asset, series, analysis);

    if (market.fallback) {
      setPill('Synthetic data', 'var(--warn)');
    } else {
      const state_label = market.marketState === 'REGULAR' ? 'Live' : 'Delayed';
      setPill(state_label, 'var(--good)');
    }

  } catch (err) {
    console.error('[MPD] updateDashboard error:', err);
    setPill('Error', 'var(--bad)');
    if (els.riskNote)
      els.riskNote.textContent = `Data error: ${err.message}. Try a different CORS proxy in Settings.`;
  } finally {
    document.body.classList.remove('loading');
  }
}

/* ════════════════════════════════════════════════════════
   ASSET / RANGE SWITCHING
   ════════════════════════════════════════════════════════ */
function switchAsset (assetId) {
  state.assetId = assetId;
  localStorage.setItem(STORAGE.asset, assetId);
  renderTabs();
  updateDashboard();
}
function switchRange (rangeId) {
  state.rangeId = rangeId;
  localStorage.setItem(STORAGE.range, rangeId);
  renderTabs();
  updateDashboard({ quiet: true });
}

/* ════════════════════════════════════════════════════════
   AUTO-REFRESH
   ════════════════════════════════════════════════════════ */
function scheduleRefresh () {
  if (state.refreshHandle) clearInterval(state.refreshHandle);
  const interval = state.settings.refreshInterval || 120_000;
  state.refreshHandle = setInterval(() => updateDashboard({ quiet: true }), interval);
}

/* ════════════════════════════════════════════════════════
   SETTINGS UI HELPERS
   ════════════════════════════════════════════════════════ */
function readSettingsFromUI () {
  state.settings.refreshInterval = parseInt(els.refreshInterval.value, 10) || 120_000;
  state.settings.proxy           = els.proxySelect?.value || 'allorigins';
  state.settings.symbols = {
    silver: els.symbolSilver?.value.trim() || 'SI=F',
    wti:    els.symbolWti?.value.trim()    || 'CL=F',
    brent:  els.symbolBrent?.value.trim()  || 'BZ=F',
    tech:   els.symbolTech?.value.trim()   || '^NDX',
    cac:    els.symbolCack?.value.trim()   || '^FCHI'
  };
  saveSettings();
}

function openModal () {
  els.modalBackdrop.classList.remove('hidden');
  els.settingsModal.classList.remove('hidden');
  if (els.modalRefreshInterval) els.modalRefreshInterval.value = String(state.settings.refreshInterval);
  if (els.modalProxySelect)     els.modalProxySelect.value     = state.settings.proxy || 'allorigins';
}
function closeModal () {
  els.modalBackdrop.classList.add('hidden');
  els.settingsModal.classList.add('hidden');
}

/* ════════════════════════════════════════════════════════
   EVENT BINDING
   ════════════════════════════════════════════════════════ */
function bindEvents () {
  els.refreshBtn.addEventListener('click', () => updateDashboard());

  els.settingsBtn.addEventListener('click', openModal);
  els.closeSettingsBtn?.addEventListener('click', closeModal);
  els.modalBackdrop.addEventListener('click', closeModal);
  els.modalCancelBtn?.addEventListener('click', closeModal);

  els.modalSaveBtn?.addEventListener('click', () => {
    if (els.modalRefreshInterval)
      state.settings.refreshInterval = parseInt(els.modalRefreshInterval.value, 10) || 120_000;
    if (els.modalProxySelect)
      state.settings.proxy = els.modalProxySelect.value;
    saveSettings();
    renderSettings();
    closeModal();
    scheduleRefresh();
    updateDashboard();
  });

  els.saveSettingsBtn?.addEventListener('click', () => {
    readSettingsFromUI();
    renderSettings();
    clearAllCache();
    scheduleRefresh();
    updateDashboard();
  });

  els.clearCacheBtn?.addEventListener('click', () => {
    clearAllCache();
    updateDashboard();
  });

  els.selectedAsset?.addEventListener('change', e => switchAsset(e.target.value));
  els.refreshInterval?.addEventListener('change', () => {
    state.settings.refreshInterval = parseInt(els.refreshInterval.value, 10) || 120_000;
    saveSettings();
    scheduleRefresh();
  });
  els.proxySelect?.addEventListener('change', () => {
    state.settings.proxy = els.proxySelect.value;
    saveSettings();
  });
}

/* ════════════════════════════════════════════════════════
   SERVICE WORKER REGISTRATION
   ════════════════════════════════════════════════════════ */
function registerSW () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(err =>
      console.warn('[MPD] SW registration failed:', err)
    );
  }
}

/* ════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════ */
(async function init () {
  renderTabs();
  renderSettings();
  bindEvents();
  scheduleRefresh();
  registerSW();
  await updateDashboard();

  // Reconcile any predictions that may have resolved while offline
  const cached = state.dataByAsset[selectedAsset().id];
  if (cached?.market?.history) {
    renderPredictions(reconcilePredictions(cached.market.history, selectedAsset().id));
  }

  // Expose for debugging
  window.MPD = {
    state,
    refresh:  () => updateDashboard(),
    analysis: () => {
      const d = state.dataByAsset[selectedAsset().id];
      return d ? buildAnalysis(d.market.history, d.news.score) : null;
    },
    exportPredictions: () => JSON.stringify(loadPredictions(), null, 2)
  };
})();
