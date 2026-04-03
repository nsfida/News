
(() => {
  "use strict";

  const APP_NAME = "Real-Time Market Signal Dashboard";
  const STORAGE = {
    settings: "rmsd.settings",
    session: "rmsd.session",
    cache: "rmsd.cache",
    imported: "rmsd.imported",
    selected: "rmsd.selectedAsset",
  };

  const DATA_FILES = [
    ["config", "./data/config.json"],
    ["assets", "./data/assets.json"],
    ["watchlist", "./data/watchlist.json"],
    ["prices", "./data/prices.json"],
    ["candles", "./data/candles.json"],
    ["news", "./data/news.json"],
    ["indicators", "./data/indicators.json"],
    ["signals", "./data/signals.json"],
    ["settings", "./data/settings.json"],
    ["history", "./data/history.json"],
    ["sourceStatus", "./data/source-status.json"],
  ];

  const defaultData = {
    config: {
      appName: APP_NAME,
      version: "1.0.0",
      description: "Static-first market intelligence terminal with optional public data feeds.",
      dataMode: "hybrid",
      defaultRefreshIntervalSeconds: 5,
      allowedRefreshIntervals: [1, 5, 10, 30, 0],
      freshnessThresholdsSeconds: { fresh: 15, recent: 60, delayed: 300, stale: 300 },
      scoring: {
        weights: {
          trend: 0.20,
          momentum: 0.15,
          volume: 0.10,
          volatility: 0.08,
          sentiment: 0.10,
          news: 0.08,
          marketContext: 0.09,
          freshness: 0.10,
          liquidity: 0.05,
          risk: 0.05
        },
        bands: [
          { min: 0, max: 20, label: "strong sell" },
          { min: 21, max: 35, label: "sell" },
          { min: 36, max: 50, label: "caution" },
          { min: 51, max: 65, label: "hold" },
          { min: 66, max: 80, label: "buy" },
          { min: 81, max: 100, label: "strong buy" }
        ]
      },
      liveEndpoints: {
        crypto: { enabled: false, name: "CoinGecko", url: "", notes: "" },
        stocks: { enabled: false, name: "Custom CORS-enabled stock feed", url: "", notes: "" }
      },
      pathMap: {
        assets: "./data/assets.json",
        watchlist: "./data/watchlist.json",
        prices: "./data/prices.json",
        candles: "./data/candles.json",
        news: "./data/news.json",
        indicators: "./data/indicators.json",
        signals: "./data/signals.json",
        settings: "./data/settings.json",
        history: "./data/history.json",
        sourceStatus: "./data/source-status.json"
      }
    },
    assets: [],
    watchlist: [],
    prices: {},
    candles: {},
    news: [],
    indicators: {},
    signals: { items: [], updatedAt: null },
    settings: {},
    history: [],
    sourceStatus: {}
  };

  const state = {
    ready: false,
    loading: true,
    datasets: structuredClone(defaultData),
    settings: {
      theme: "dark",
      refreshIntervalSeconds: 5,
      confidenceThreshold: 65,
      staleThresholdSeconds: 300,
      chartStyle: "candles",
      defaultAssetType: "all",
      alertThreshold: 75,
      selectedAssetId: null,
      filters: {
        query: "",
        assetType: "all",
        signal: "all",
        volatility: "all",
        sentiment: "all",
        freshness: "all",
        priceMin: "",
        priceMax: "",
        exchange: "all"
      }
    },
    source: {
      status: "loading",
      failedRequests: 0,
      activeSource: "loading",
      fallbackMode: true,
      lastSuccessfulFetch: null,
      lastAttempt: null,
      datasets: {}
    },
    assets: [],
    computed: [],
    selectedAssetId: null,
    refreshCountdown: 0,
    refreshTimer: null,
    clockTimer: null,
    requestInFlight: false,
    fetchRound: 0,
    notifications: [],
    lastRenderSignature: "",
    chart: {
      ratio: window.devicePixelRatio || 1
    }
  };

  const els = {};

  const fmt = {
    usd(value) {
      if (!Number.isFinite(value)) return "—";
      const abs = Math.abs(value);
      if (abs >= 1000000000) return "$" + (value / 1000000000).toFixed(2) + "B";
      if (abs >= 1000000) return "$" + (value / 1000000).toFixed(2) + "M";
      if (abs >= 1000) return "$" + (value / 1000).toFixed(2) + "K";
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: abs < 10 ? 2 : 2 }).format(value);
    },
    number(value, fraction = 2) {
      if (!Number.isFinite(value)) return "—";
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: fraction }).format(value);
    },
    pct(value, fraction = 2) {
      if (!Number.isFinite(value)) return "—";
      const sign = value > 0 ? "+" : "";
      return `${sign}${value.toFixed(fraction)}%`;
    },
    time(value) {
      if (!value) return "—";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "—";
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "medium"
      }).format(d);
    },
    ago(value) {
      if (!value) return "—";
      const d = new Date(value);
      const delta = Date.now() - d.getTime();
      if (!Number.isFinite(delta)) return "—";
      const s = Math.floor(delta / 1000);
      if (s < 60) return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 48) return `${h}h ago`;
      const day = Math.floor(h / 24);
      return `${day}d ago`;
    }
  };

  function $(id) {
    return document.getElementById(id);
  }

  function clamp(v, min = 0, max = 100) {
    return Math.max(min, Math.min(max, v));
  }

  function roundTo(v, step = 1) {
    return Math.round(v / step) * step;
  }

  function median(values) {
    const arr = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!arr.length) return 0;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  }

  function average(values) {
    const arr = values.filter(Number.isFinite);
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function stdDev(values) {
    const arr = values.filter(Number.isFinite);
    if (arr.length < 2) return 0;
    const avg = average(arr);
    const variance = average(arr.map(v => (v - avg) ** 2));
    return Math.sqrt(variance);
  }

  function trendSlope(values, period = 8) {
    if (!values || values.length < period + 1) return 0;
    const slice = values.slice(-period);
    const first = slice[0];
    const last = slice[slice.length - 1];
    return first === 0 ? 0 : (last - first) / first;
  }

  function movingAverage(values, period) {
    if (!values || values.length < period) return [];
    const out = [];
    for (let i = 0; i <= values.length - period; i++) {
      out.push(average(values.slice(i, i + period)));
    }
    return out;
  }

  function last(arr) {
    return arr && arr.length ? arr[arr.length - 1] : null;
  }

  function freshLabel(ageSeconds, thresholds) {
    if (!Number.isFinite(ageSeconds)) return { label: "unknown", cls: "stale" };
    if (ageSeconds <= thresholds.fresh) return { label: "fresh", cls: "fresh" };
    if (ageSeconds <= thresholds.recent) return { label: "recent", cls: "recent" };
    if (ageSeconds <= thresholds.delayed) return { label: "delayed", cls: "delayed" };
    return { label: "stale", cls: "stale" };
  }

  function signalBand(score, config) {
    const band = config.scoring.bands.find(b => score >= b.min && score <= b.max) || config.scoring.bands[config.scoring.bands.length - 1];
    return band.label;
  }

  function signalTone(label) {
    if (!label) return "neutral";
    if (label.includes("strong buy") || label === "buy") return "bull";
    if (label.includes("strong sell") || label === "sell") return "bear";
    if (label === "hold") return "hold";
    return "neutral";
  }

  function parseTime(v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  function safeJsonClone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  async function loadJson(path, fallback) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return fallback;
    }
  }

  function setStatus(kind, text) {
    const el = els.sourceStatus;
    if (!el) return;
    el.dataset.kind = kind;
    el.textContent = text;
  }

  function showToast(message, tone = "info") {
    const host = els.toastHost;
    if (!host) return;
    const node = document.createElement("div");
    node.className = `toast ${tone}`;
    node.textContent = message;
    host.appendChild(node);
    window.setTimeout(() => {
      node.classList.add("fade");
      window.setTimeout(() => node.remove(), 250);
    }, 2500);
  }

  function normalizeData(raw) {
    const config = raw.config || defaultData.config;
    const settings = Object.assign({}, defaultData.settings, raw.settings || {});
    settings.filters = Object.assign({}, defaultData.settings.filters, settings.filters || {});
    settings.selectedAssetId = settings.selectedAssetId || (raw.watchlist && raw.watchlist[0]) || null;
    const sourceStatus = Object.assign({}, defaultData.sourceStatus, raw.sourceStatus || {});
    const assets = Array.isArray(raw.assets) ? raw.assets : [];
    const watchlist = Array.isArray(raw.watchlist) ? raw.watchlist : [];
    const prices = raw.prices && typeof raw.prices === "object" ? raw.prices : {};
    const candles = raw.candles && typeof raw.candles === "object" ? raw.candles : {};
    const news = Array.isArray(raw.news) ? raw.news : [];
    const indicators = raw.indicators && typeof raw.indicators === "object" ? raw.indicators : {};
    const signals = raw.signals && typeof raw.signals === "object" ? raw.signals : { items: [] };
    const history = Array.isArray(raw.history) ? raw.history : [];
    return { config, settings, sourceStatus, assets, watchlist, prices, candles, news, indicators, signals, history };
  }

  async function loadInitialData() {
    const loaded = {};
    const results = await Promise.all(DATA_FILES.map(async ([key, path]) => {
      const fallback = defaultData[key];
      const data = await loadJson(path, fallback);
      return [key, data];
    }));
    for (const [k, v] of results) loaded[k] = v;
    const normalized = normalizeData(loaded);

    const savedSettings = readStoredJSON(STORAGE.settings, null);
    const savedSession = readStoredJSON(STORAGE.session, null);
    const imported = readStoredJSON(STORAGE.imported, null);

    if (savedSession) {
      normalized.settings = Object.assign(normalized.settings, savedSession.settings || {});
      normalized.watchlist = savedSession.watchlist || normalized.watchlist;
      normalized.selectedAssetId = savedSession.selectedAssetId || normalized.settings.selectedAssetId;
    }

    if (savedSettings) {
      normalized.settings = deepMerge(normalized.settings, savedSettings);
    }

    if (imported) {
      applyImportedState(normalized, imported);
    }

    state.datasets = normalized;
    state.settings = normalized.settings;
    state.source = buildSourceState(normalized.sourceStatus);
    state.selectedAssetId = state.settings.selectedAssetId || normalized.watchlist[0] || normalized.assets[0]?.id || null;
    state.ready = true;
    state.loading = false;
  }

  function buildSourceState(sourceStatus) {
    return {
      status: navigator.onLine ? "live-ready" : "offline",
      failedRequests: sourceStatus.failedRequests || 0,
      activeSource: sourceStatus.activeSource || "local JSON snapshot",
      fallbackMode: sourceStatus.fallbackMode !== undefined ? sourceStatus.fallbackMode : true,
      lastSuccessfulFetch: sourceStatus.lastSuccessfulFetch || null,
      lastAttempt: sourceStatus.lastAttempt || null,
      datasets: sourceStatus.datasets || {}
    };
  }

  function deepMerge(base, extra) {
    if (Array.isArray(base) || Array.isArray(extra)) return Array.isArray(extra) ? extra : base;
    if (typeof base !== "object" || typeof extra !== "object" || !base || !extra) return extra ?? base;
    const out = { ...base };
    for (const [k, v] of Object.entries(extra)) out[k] = k in out ? deepMerge(out[k], v) : v;
    return out;
  }

  function readStoredJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function storeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function applyImportedState(normalized, imported) {
    const keys = ["config", "assets", "watchlist", "prices", "candles", "news", "indicators", "signals", "settings", "history", "sourceStatus"];
    for (const key of keys) {
      if (key in imported) normalized[key] = imported[key];
    }
  }

  function resolveAssetMeta(asset) {
    const price = state.datasets.prices[asset.id] || {};
    const candleSeries = state.datasets.candles[asset.id] || [];
    const indicator = state.datasets.indicators[asset.id] || {};
    const latestCandle = last(candleSeries) || {};
    const currentPrice = Number.isFinite(price.price) ? price.price : latestCandle.c ?? 0;
    const lastUpdate = price.updatedAt || latestCandle.t || state.datasets.signals.updatedAt || null;
    const relatedNews = state.datasets.news.filter(n => n.ticker === asset.id || n.ticker === asset.symbol);
    const analysis = computeAnalysis(asset, price, candleSeries, indicator, relatedNews);
    return {
      ...asset,
      price: currentPrice,
      change24h: price.change24h ?? analysis.change24h,
      volume24h: price.volume24h ?? latestCandle.v ?? 0,
      marketCap: price.marketCap ?? 0,
      updatedAt: lastUpdate,
      source: price.source || "local-snapshot",
      candleSeries,
      relatedNews,
      analysis
    };
  }

  function computeAnalysis(asset, price, candles, indicator, newsItems) {
    const cfg = state.datasets.config;
    const weights = cfg.scoring.weights;
    const closes = candles.map(c => Number(c.c)).filter(Number.isFinite);
    const highs = candles.map(c => Number(c.h)).filter(Number.isFinite);
    const lows = candles.map(c => Number(c.l)).filter(Number.isFinite);
    const volumes = candles.map(c => Number(c.v)).filter(Number.isFinite);
    const current = Number.isFinite(price.price) ? price.price : last(closes) || 0;

    const shortMA = average(closes.slice(-5));
    const midMA = average(closes.slice(-12));
    const longMA = average(closes.slice(-24));
    const slope = trendSlope(closes, Math.min(8, closes.length - 1 || 1));
    const trendRaw = indicator.trendBias ?? clamp(50 + (current - longMA) / Math.max(longMA, 0.0001) * 140 + slope * 180);
    const trendScore = clamp(trendRaw * 100);

    const mom3 = closes.length > 3 ? (closes[closes.length - 1] - closes[closes.length - 4]) / closes[closes.length - 4] : 0;
    const mom7 = closes.length > 7 ? (closes[closes.length - 1] - closes[closes.length - 8]) / closes[closes.length - 8] : 0;
    const momentumRaw = indicator.momentumBias ?? clamp(50 + ((mom3 * 160) + (mom7 * 110)) / 2);
    const momentumScore = clamp(momentumRaw * 100);

    const avgVol = average(volumes.slice(-20));
    const lastVol = last(volumes) || 0;
    const volRatio = avgVol > 0 ? lastVol / avgVol : 1;
    const volumeScore = clamp((indicator.volumeBias ?? clamp(50 + (volRatio - 1) * 55)) * 100);

    const volatilityPct = indicator.volatility ?? (closes.length > 1 ? stdDev(closes.map((c, i) => i ? (c - closes[i - 1]) / closes[i - 1] : 0).slice(1)) * 100 : 0);
    const volSuitability = clamp(100 - Math.abs((volatilityPct * 100) - (asset.assetType === "crypto" ? 55 : 35)));
    const volatilityScore = volSuitability;

    const sentimentScoreRaw = newsItems.length ? average(newsItems.map(n => Number(n.sentiment) || 0.0)) : 0;
    const sentimentScore = clamp(50 + sentimentScoreRaw * 50);

    const latestNewsAgeMin = newsItems.length ? Math.min(...newsItems.map(n => (Date.now() - parseTime(n.updatedAt)) / 60000)) : Infinity;
    const breakingBoost = newsItems.some(n => n.isBreaking) ? 12 : 0;
    const recencyBoost = isFinite(latestNewsAgeMin) ? clamp(20 - latestNewsAgeMin * 1.4, 0, 20) : 0;
    const newsScore = clamp(50 + sentimentScoreRaw * 40 + breakingBoost + recencyBoost - Math.max(0, latestNewsAgeMin - 60) * 0.2);

    const marketContextScore = clamp((indicator.marketContext ?? 0.5) * 100);
    const liquidityScore = clamp((indicator.liquidity ?? 0.6) * 100);

    const support = indicator.support ?? minRecent(lows, 20, current * 0.95);
    const resistance = indicator.resistance ?? maxRecent(highs, 20, current * 1.05);
    const supportGap = support ? (current - support) / current : 0.03;
    const resistanceGap = resistance ? (resistance - current) / current : 0.03;
    const nearSupport = clamp(100 - Math.abs(supportGap * 200));
    const nearResistance = clamp(100 - Math.abs(resistanceGap * 200));
    const structureScore = clamp(50 + (nearSupport - nearResistance) * 0.35);

    const freshness = freshnessScore(price.updatedAt, cfg.freshnessThresholdsSeconds, state.settings.staleThresholdSeconds);
    const freshnessLabel = freshLabel(ageSeconds(price.updatedAt), cfg.freshnessThresholdsSeconds);
    const riskPenalty = computeRiskPenalty({
      volatilityPct,
      freshness,
      nearSupport,
      nearResistance,
      sentimentScoreRaw,
      candles,
      price,
      newsItems,
      asset
    });

    const base = (
      trendScore * weights.trend +
      momentumScore * weights.momentum +
      volumeScore * weights.volume +
      volatilityScore * weights.volatility +
      sentimentScore * weights.sentiment +
      newsScore * weights.news +
      marketContextScore * weights.marketContext +
      freshness * weights.freshness +
      liquidityScore * weights.liquidity
    );

    const score = clamp(base - riskPenalty * (weights.risk * 100));
    const confidence = clamp(score - riskPenalty * 0.65 + (freshness < 40 ? -12 : 0) + (newsItems.some(n => n.isBreaking) ? 4 : 0));
    const band = signalBand(score, cfg);
    const bias = score >= 60 ? "bullish" : score <= 40 ? "bearish" : "neutral";

    const signal = deriveSignal(score, confidence, freshnessLabel.cls, trendScore, momentumScore, volumeScore, sentimentScore, volatilityScore, band);
    const rr = computeRR(current, support, resistance, signal, asset, indicator, candles);
    const entry = computeEntryZone(current, support, resistance, signal, asset.assetType);
    const target = computeTargetZone(current, support, resistance, signal, asset.assetType, trendScore, momentumScore);
    const stop = computeStopZone(current, support, resistance, signal, asset.assetType, riskPenalty);
    const horizon = inferHorizon(volatilityPct, trendScore, momentumScore);

    const reasons = buildReasons({
      trendScore, momentumScore, volumeScore, volatilityScore, sentimentScore, newsScore,
      freshness, liquidityScore, support, resistance, current, signal, bias, newsItems, indicator
    });

    const warnings = buildWarnings({
      freshnessLabel,
      riskPenalty,
      volatilityPct,
      newsItems,
      support,
      resistance,
      current,
      signal
    });

    const probabilityBand = [
      Math.max(0, Math.round(confidence - 12)),
      Math.min(100, Math.round(confidence + 12))
    ];

    return {
      score,
      confidence,
      signal,
      bias,
      band,
      current,
      support,
      resistance,
      entryZone: entry,
      targetZone: target,
      stopLoss: stop,
      rr,
      horizon,
      trendScore,
      momentumScore,
      volumeScore,
      volatilityScore,
      sentimentScore,
      newsScore,
      marketContextScore,
      freshness,
      liquidityScore,
      riskPenalty,
      freshnessLabel: freshnessLabel.label,
      dataFreshnessClass: freshnessLabel.cls,
      probabilityBand,
      reasons,
      warnings,
      change24h: price.change24h ?? pctChangeFromCandles(closes),
      priceUpdatedAt: price.updatedAt || null,
      priceSource: price.source || "local-snapshot",
      nearSupport,
      nearResistance,
      structureScore,
      updatedAt: price.updatedAt || last(candles)?.t || null
    };
  }

  function ageSeconds(value) {
    const ts = parseTime(value);
    if (!ts) return Infinity;
    return Math.max(0, (Date.now() - ts) / 1000);
  }

  function freshnessScore(value, thresholds, staleThresholdOverride) {
    const age = ageSeconds(value);
    const staleThreshold = staleThresholdOverride || thresholds.stale || 300;
    if (!Number.isFinite(age)) return 0;
    if (age <= thresholds.fresh) return 100;
    if (age <= thresholds.recent) return 90 - ((age - thresholds.fresh) / Math.max(1, thresholds.recent - thresholds.fresh)) * 12;
    if (age <= thresholds.delayed) return 72 - ((age - thresholds.recent) / Math.max(1, thresholds.delayed - thresholds.recent)) * 30;
    if (age <= staleThreshold) return 35 - ((age - thresholds.delayed) / Math.max(1, staleThreshold - thresholds.delayed)) * 18;
    return 6;
  }

  function computeRiskPenalty({ volatilityPct, freshness, nearSupport, nearResistance, sentimentScoreRaw, candles, price, newsItems, asset }) {
    const volPenalty = clamp((volatilityPct * 100 - (asset.assetType === "crypto" ? 35 : 22)) * 0.8, 0, 30);
    const stalePenalty = freshness < 25 ? 16 : freshness < 50 ? 8 : 0;
    const proximityPenalty = nearResistance > 80 && price.change24h > 0 ? 10 : 0;
    const negativeNewsPenalty = sentimentScoreRaw < -0.15 ? 10 : 0;
    const thinLiquidityPenalty = (asset.assetType === "stock" && Number(price.volume24h || 0) < 1200000) ? 6 : 0;
    const chopPenalty = candles.length > 8 ? Math.abs(pctChangeFromCandles(candles.map(c => c.c))) < 0.15 ? 4 : 0 : 0;
    return clamp(volPenalty + stalePenalty + proximityPenalty + negativeNewsPenalty + thinLiquidityPenalty + chopPenalty, 0, 60);
  }

  function deriveSignal(score, confidence, freshnessClass, trendScore, momentumScore, volumeScore, sentimentScore, volatilityScore, band) {
    let label = band;
    if (freshnessClass === "stale") return "caution";
    if (confidence < 48) return "caution";
    if (band === "buy" && (trendScore < 58 || momentumScore < 55 || volumeScore < 45)) return "hold";
    if (band === "strong buy" && (trendScore < 72 || momentumScore < 66 || sentimentScore < 55)) return "buy";
    if (band === "strong sell" && (trendScore > 42 && momentumScore > 42)) return "sell";
    return label;
  }

  function computeRR(current, support, resistance, signal, asset, indicator, candles) {
    const risk = Math.max(1, Math.abs(current - (support || current * 0.97)));
    const reward = Math.max(1, Math.abs((resistance || current * 1.03) - current));
    let rr = reward / risk;
    if (signal.includes("buy")) rr = reward / risk;
    if (signal.includes("sell")) rr = risk / reward;
    return Number(rr.toFixed(1));
  }

  function computeEntryZone(current, support, resistance, signal, assetType) {
    const pct = assetType === "crypto" ? 0.012 : 0.008;
    if (signal.includes("buy")) {
      const base = support || current * (1 - pct * 1.8);
      return [base * (1 - pct), base * (1 + pct * 1.4)];
    }
    if (signal.includes("sell")) {
      const base = resistance || current * (1 + pct * 1.8);
      return [base * (1 - pct * 1.4), base * (1 + pct)];
    }
    return [current * (1 - pct), current * (1 + pct)];
  }

  function computeTargetZone(current, support, resistance, signal, assetType, trendScore, momentumScore) {
    const extension = assetType === "crypto" ? 0.03 : 0.018;
    const momentumBoost = clamp((momentumScore - 50) / 100, 0, 0.05);
    if (signal.includes("buy")) {
      const low = resistance ? resistance * 0.99 : current * (1 + extension);
      const high = resistance ? resistance * (1 + extension + momentumBoost) : current * (1 + extension + momentumBoost * 2);
      return [low, high];
    }
    if (signal.includes("sell")) {
      const low = support ? support * (1 - extension - momentumBoost) : current * (1 - extension - momentumBoost * 2);
      const high = support ? support * 1.01 : current * (1 - extension);
      return [low, high];
    }
    return [current * (1 - extension), current * (1 + extension)];
  }

  function computeStopZone(current, support, resistance, signal, assetType, riskPenalty) {
    const buffer = assetType === "crypto" ? 0.018 : 0.012;
    if (signal.includes("buy")) {
      const base = support || current * (1 - buffer * 4);
      return [base * (1 - buffer), base * (1 - buffer * 0.3)];
    }
    if (signal.includes("sell")) {
      const base = resistance || current * (1 + buffer * 4);
      return [base * (1 + buffer * 0.3), base * (1 + buffer)];
    }
    return [current * (1 - buffer * 2), current * (1 + buffer * 2)];
  }

  function inferHorizon(volatilityPct, trendScore, momentumScore) {
    const v = volatilityPct * 100;
    if (v >= 6 || momentumScore > 75) return "intraday";
    if (v >= 3.5 || trendScore > 68) return "short-term";
    if (trendScore > 55 && v < 3.5) return "swing";
    return "medium-term";
  }

  function buildReasons({ trendScore, momentumScore, volumeScore, volatilityScore, sentimentScore, newsScore, freshness, liquidityScore, support, resistance, current, signal, bias, newsItems, indicator }) {
    const items = [];
    if (trendScore >= 70) items.push("Trend structure is firmly constructive.");
    else if (trendScore <= 40) items.push("Trend structure is weak or broken.");
    else items.push("Trend is mixed and needs confirmation.");

    if (momentumScore >= 68) items.push("Momentum is supporting directional continuation.");
    else if (momentumScore <= 42) items.push("Momentum is fading or inconsistent.");
    else items.push("Momentum is balanced but not decisive.");

    if (volumeScore >= 65) items.push("Volume confirmation is supportive.");
    else if (volumeScore <= 45) items.push("Volume confirmation is limited.");
    else items.push("Volume is adequate but not exceptional.");

    if (sentimentScore >= 60) items.push("News sentiment leans positive.");
    else if (sentimentScore <= 45) items.push("News sentiment is soft or negative.");
    else items.push("News sentiment is neutral.");

    if (freshness >= 80) items.push("Data freshness is strong.");
    else if (freshness <= 35) items.push("Freshness is deteriorating and confidence is reduced.");
    else items.push("Data freshness is acceptable.");

    if (liquidityScore >= 75) items.push("Liquidity quality is strong.");
    else if (liquidityScore <= 45) items.push("Liquidity quality is weak.");
    else items.push("Liquidity is adequate.");

    if (signal.includes("buy")) {
      items.push(`Price is trading near the ${current >= support ? "support" : "discount"} zone.`);
      if (newsItems.some(n => n.isBreaking && (n.sentiment || 0) > 0)) items.push("Breaking news supports the bullish case.");
    } else if (signal.includes("sell")) {
      items.push(`Price is approaching or rejecting the resistance zone.`);
      if (newsItems.some(n => n.isBreaking && (n.sentiment || 0) < 0)) items.push("Breaking news is pressuring the bearish case.");
    } else {
      items.push("Signal conflict prevents an aggressive label.");
    }

    if (indicator.atrPct && indicator.atrPct > 5) items.push("Volatility is elevated, so position sizing should be tighter.");
    return unique(items).slice(0, 6);
  }

  function buildWarnings({ freshnessLabel, riskPenalty, volatilityPct, newsItems, support, resistance, current, signal }) {
    const warnings = [];
    if (freshnessLabel.cls === "stale") warnings.push("Avoid treating this as live because data is stale.");
    if (riskPenalty > 25) warnings.push("Risk is elevated versus the current reward profile.");
    if (volatilityPct * 100 > 6) warnings.push("High volatility may widen slippage and stop distance.");
    if (newsItems.some(n => n.isBreaking && Math.abs(n.sentiment || 0) > 0.6)) warnings.push("Breaking news can invalidate technical levels quickly.");
    if (signal === "caution") warnings.push("Signals are mixed; patience may be better than forcing a trade.");
    return unique(warnings);
  }

  function unique(arr) {
    return [...new Set(arr)];
  }

  function minRecent(values, lookback, fallback) {
    if (!values.length) return fallback;
    return Math.min(...values.slice(-lookback), fallback);
  }

  function maxRecent(values, lookback, fallback) {
    if (!values.length) return fallback;
    return Math.max(...values.slice(-lookback), fallback);
  }

  function pctChangeFromCandles(values) {
    if (!values || values.length < 2) return 0;
    const first = values[0];
    const lastVal = values[values.length - 1];
    return first ? ((lastVal - first) / first) * 100 : 0;
  }

  function prepareComputedAssets() {
    const list = state.datasets.assets
      .filter(Boolean)
      .map(resolveAssetMeta)
      .sort((a, b) => (a.analysis.score === b.analysis.score ? a.priority - b.priority : b.analysis.score - a.analysis.score));

    state.assets = list;
    state.computed = applyFilters(list);
    if (!state.selectedAssetId || !list.some(a => a.id === state.selectedAssetId)) {
      state.selectedAssetId = state.settings.selectedAssetId || list[0]?.id || null;
    }
  }

  function applyFilters(list) {
    const f = state.settings.filters || {};
    return list.filter(asset => {
      const q = (f.query || "").trim().toLowerCase();
      if (q && !(`${asset.name} ${asset.symbol} ${asset.exchange} ${asset.sector}`.toLowerCase().includes(q))) return false;
      if (f.assetType && f.assetType !== "all" && asset.assetType !== f.assetType) return false;
      if (f.exchange && f.exchange !== "all" && asset.exchange !== f.exchange) return false;
      if (f.signal && f.signal !== "all" && !asset.analysis.signal.includes(f.signal)) return false;
      if (f.volatility && f.volatility !== "all") {
        const v = asset.analysis.volatilityScore;
        if (f.volatility === "low" && v < 55) return false;
        if (f.volatility === "medium" && (v < 40 || v >= 75)) return false;
        if (f.volatility === "high" && v < 75) return false;
      }
      if (f.sentiment && f.sentiment !== "all") {
        const s = asset.analysis.sentimentScore;
        if (f.sentiment === "positive" && s < 55) return false;
        if (f.sentiment === "neutral" && (s < 45 || s > 60)) return false;
        if (f.sentiment === "negative" && s > 45) return false;
      }
      if (f.freshness && f.freshness !== "all") {
        const cls = asset.analysis.dataFreshnessClass;
        if (f.freshness === "fresh" && cls !== "fresh") return false;
        if (f.freshness === "recent" && cls !== "recent") return false;
        if (f.freshness === "delayed" && cls !== "delayed") return false;
        if (f.freshness === "stale" && cls !== "stale") return false;
      }
      const minP = f.priceMin !== "" ? Number(f.priceMin) : null;
      const maxP = f.priceMax !== "" ? Number(f.priceMax) : null;
      if (Number.isFinite(minP) && asset.price < minP) return false;
      if (Number.isFinite(maxP) && asset.price > maxP) return false;
      return true;
    });
  }

  function render() {
    if (!state.ready) return;
    prepareComputedAssets();
    renderHeader();
    renderOverview();
    renderFilters();
    renderWatchlist();
    renderDetail();
    renderNews();
    renderAnalysisPanel();
    renderControls();
    renderSources();
    updateTheme();
    const signature = JSON.stringify({
      selectedAssetId: state.selectedAssetId,
      count: state.computed.length,
      filters: state.settings.filters,
      refresh: state.settings.refreshIntervalSeconds,
      theme: state.settings.theme,
      watchlist: state.datasets.watchlist
    });
    state.lastRenderSignature = signature;
  }

  function renderHeader() {
    const total = state.assets.length;
    const buys = state.assets.filter(a => a.analysis.signal.includes("buy")).length;
    const sells = state.assets.filter(a => a.analysis.signal.includes("sell")).length;
    const stale = state.assets.filter(a => a.analysis.dataFreshnessClass === "stale").length;
    const avgConfidence = average(state.assets.map(a => a.analysis.confidence));
    els.metricTotal.textContent = total;
    els.metricBuys.textContent = buys;
    els.metricSells.textContent = sells;
    els.metricStale.textContent = stale;
    els.metricConfidence.textContent = `${Math.round(avgConfidence)}%`;
    els.lastUpdated.textContent = state.source.lastSuccessfulFetch ? fmt.time(state.source.lastSuccessfulFetch) : "—";
    els.countdown.textContent = state.settings.refreshIntervalSeconds === 0 ? "manual" : `${Math.max(0, state.refreshCountdown)}s`;
    els.livePulse.dataset.state = navigator.onLine ? "online" : "offline";
    els.livePulseText.textContent = navigator.onLine ? "Monitoring live inputs" : "Offline / cached mode";
  }

  function renderOverview() {
    const strongestBull = state.assets.filter(a => a.analysis.signal.includes("buy")).slice(0, 3);
    const strongestBear = state.assets.filter(a => a.analysis.signal.includes("sell")).slice(0, 3);
    els.topBull.innerHTML = strongestBull.map(assetCardCompact).join("");
    els.topBear.innerHTML = strongestBear.map(assetCardCompact).join("");
  }

  function assetCardCompact(asset) {
    const tone = signalTone(asset.analysis.signal);
    return `
      <button class="compact-row ${tone}" data-select-asset="${asset.id}">
        <span class="label">${escapeHtml(asset.symbol)}</span>
        <span class="name">${escapeHtml(asset.name)}</span>
        <span class="meta">${fmt.usd(asset.price)} · ${fmt.pct(asset.change24h || 0)}</span>
      </button>
    `;
  }

  function renderFilters() {
    const f = state.settings.filters;
    els.filterQuery.value = f.query || "";
    els.filterType.value = f.assetType || "all";
    els.filterSignal.value = f.signal || "all";
    els.filterFreshness.value = f.freshness || "all";
    els.filterVolatility.value = f.volatility || "all";
    els.filterSentiment.value = f.sentiment || "all";
    els.filterExchange.value = f.exchange || "all";
    els.filterPriceMin.value = f.priceMin || "";
    els.filterPriceMax.value = f.priceMax || "";
    els.confThreshold.value = state.settings.confidenceThreshold;
    els.refreshInterval.value = String(state.settings.refreshIntervalSeconds);
    els.staleThreshold.value = String(state.settings.staleThresholdSeconds);
    els.chartStyle.value = state.settings.chartStyle;
  }

  function renderWatchlist() {
    const list = state.computed;
    const selected = state.selectedAssetId;
    if (!list.length) {
      els.assetGrid.innerHTML = `<div class="empty-state">No assets match the current filters.</div>`;
      els.assetCount.textContent = "0 assets";
      return;
    }
    els.assetCount.textContent = `${list.length} assets`;
    els.assetGrid.innerHTML = list.map(asset => renderAssetCard(asset, selected === asset.id)).join("");
  }

  function renderAssetCard(asset, selected) {
    const a = asset.analysis;
    const tone = signalTone(a.signal);
    const fresh = a.dataFreshnessClass;
    const scoreClass = a.score >= 81 ? "extreme" : a.score >= 66 ? "strong" : a.score >= 51 ? "medium" : "weak";
    return `
      <article class="asset-card ${selected ? "selected" : ""}" data-select-asset="${asset.id}">
        <div class="card-top">
          <div>
            <div class="asset-name">${escapeHtml(asset.name)}</div>
            <div class="asset-sub">${escapeHtml(asset.symbol)} · ${escapeHtml(asset.assetType)} · ${escapeHtml(asset.exchange)}</div>
          </div>
          <span class="fresh-pill ${fresh}">${a.freshnessLabel}</span>
        </div>

        <div class="price-row">
          <div class="price">${fmt.usd(asset.price)}</div>
          <div class="change ${asset.change24h >= 0 ? "pos" : "neg"}">${fmt.pct(asset.change24h || 0)}</div>
        </div>

        <div class="signal-row">
          <span class="signal-pill ${tone}">${escapeHtml(a.signal)}</span>
          <span class="confidence">${Math.round(a.confidence)}% confidence</span>
        </div>

        <div class="mini-metrics">
          <span>Entry: ${fmt.usd(a.entryZone[0])}–${fmt.usd(a.entryZone[1])}</span>
          <span>Target: ${fmt.usd(a.targetZone[0])}–${fmt.usd(a.targetZone[1])}</span>
          <span>Stop: ${fmt.usd(a.stopLoss[0])}–${fmt.usd(a.stopLoss[1])}</span>
        </div>

        <div class="bar-row">
          <div class="bar-label">Trend</div>
          <div class="bar"><span style="width:${a.trendScore}%"></span></div>
        </div>
        <div class="bar-row">
          <div class="bar-label">Momentum</div>
          <div class="bar"><span style="width:${a.momentumScore}%"></span></div>
        </div>
        <div class="bar-row">
          <div class="bar-label">Volume</div>
          <div class="bar"><span style="width:${a.volumeScore}%"></span></div>
        </div>

        <div class="footer-row">
          <span class="score ${scoreClass}">${Math.round(a.score)}/100</span>
          <span class="rr">R/R ${a.rr.toFixed(1)}x</span>
          <span class="time">${fmt.ago(asset.updatedAt)}</span>
        </div>
      </article>
    `;
  }

  function renderDetail() {
    const asset = state.assets.find(a => a.id === state.selectedAssetId) || state.assets[0];
    if (!asset) {
      els.detailPanel.innerHTML = `<div class="empty-state">No asset selected.</div>`;
      return;
    }
    const a = asset.analysis;
    const tone = signalTone(a.signal);
    const chartSeries = asset.candleSeries || [];
    els.detailTitle.textContent = `${asset.name} (${asset.symbol})`;
    els.detailSubtitle.textContent = `${asset.assetType.toUpperCase()} · ${asset.exchange} · ${asset.sector}`;
    els.detailPanel.innerHTML = `
      <div class="detail-head">
        <div>
          <div class="detail-price">${fmt.usd(asset.price)}</div>
          <div class="detail-change ${asset.change24h >= 0 ? "pos" : "neg"}">${fmt.pct(asset.change24h || 0)} over 24h</div>
        </div>
        <div class="detail-signal ${tone}">${escapeHtml(a.signal)}</div>
      </div>

      <div class="detail-grid">
        <div class="detail-stat"><span>Confidence</span><strong>${Math.round(a.confidence)}%</strong></div>
        <div class="detail-stat"><span>Score</span><strong>${Math.round(a.score)}/100</strong></div>
        <div class="detail-stat"><span>R/R</span><strong>${a.rr.toFixed(1)}x</strong></div>
        <div class="detail-stat"><span>Horizon</span><strong>${a.horizon}</strong></div>
      </div>

      <div class="zone-grid">
        <div><span>Entry zone</span><strong>${fmt.usd(a.entryZone[0])} – ${fmt.usd(a.entryZone[1])}</strong></div>
        <div><span>Target zone</span><strong>${fmt.usd(a.targetZone[0])} – ${fmt.usd(a.targetZone[1])}</strong></div>
        <div><span>Stop-loss</span><strong>${fmt.usd(a.stopLoss[0])} – ${fmt.usd(a.stopLoss[1])}</strong></div>
        <div><span>Invalidation</span><strong>${fmt.usd(asset.assetType === "crypto" ? a.stopLoss[0] : a.stopLoss[0])}</strong></div>
      </div>

      <div class="subhead">Signal explanation</div>
      <ul class="reason-list">${a.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join("")}</ul>

      <div class="subhead">Risk notes</div>
      <ul class="warning-list">${(a.warnings.length ? a.warnings : ["No major warnings detected."]).map(r => `<li>${escapeHtml(r)}</li>`).join("")}</ul>

      <div class="source-line">
        <span>Freshness: <b>${a.freshnessLabel}</b></span>
        <span>Data source: <b>${escapeHtml(asset.source)}</b></span>
        <span>Last update: <b>${fmt.time(asset.updatedAt)}</b></span>
      </div>

      <canvas id="priceChart" width="900" height="340"></canvas>
    `;
    drawChart(asset, chartSeries);
  }

  function drawChart(asset, candles) {
    const canvas = $("priceChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cssWidth = canvas.clientWidth || 900;
    const cssHeight = canvas.clientHeight || 340;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssWidth * ratio);
    canvas.height = Math.floor(cssHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const pad = { l: 48, r: 20, t: 18, b: 28 };
    const w = cssWidth - pad.l - pad.r;
    const h = cssHeight - pad.t - pad.b;

    const closes = candles.map(c => Number(c.c)).filter(Number.isFinite);
    const highs = candles.map(c => Number(c.h)).filter(Number.isFinite);
    const lows = candles.map(c => Number(c.l)).filter(Number.isFinite);
    if (closes.length < 2) {
      ctx.fillStyle = "#9aa4b2";
      ctx.fillText("Insufficient data for chart", pad.l, cssHeight / 2);
      return;
    }

    const minY = Math.min(...lows, asset.analysis.stopLoss[0], asset.analysis.entryZone[0]);
    const maxY = Math.max(...highs, asset.analysis.targetZone[1], asset.analysis.entryZone[1]);
    const range = Math.max(1e-9, maxY - minY);
    const xStep = w / Math.max(1, candles.length - 1);
    const y = (v) => pad.t + h - ((v - minY) / range) * h;

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const yy = pad.t + (h / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(pad.l + w, yy); ctx.stroke();
    }

    // zones
    const drawZone = (zone, fill, stroke) => {
      const y1 = y(Math.max(zone[0], zone[1]));
      const y2 = y(Math.min(zone[0], zone[1]));
      ctx.fillStyle = fill;
      ctx.fillRect(pad.l, y1, w, Math.max(1, y2 - y1));
      ctx.strokeStyle = stroke;
      ctx.strokeRect(pad.l, y1, w, Math.max(1, y2 - y1));
    };
    drawZone(asset.analysis.stopLoss, "rgba(239,68,68,0.08)", "rgba(239,68,68,0.28)");
    drawZone(asset.analysis.entryZone, "rgba(59,130,246,0.10)", "rgba(59,130,246,0.35)");
    drawZone(asset.analysis.targetZone, "rgba(34,197,94,0.08)", "rgba(34,197,94,0.30)");

    // candles or line
    const closesSeries = closes;
    const ma5 = movingAverage(closesSeries, Math.min(5, closesSeries.length));
    const ma12 = movingAverage(closesSeries, Math.min(12, closesSeries.length));
    const alignIndex = closesSeries.length - ma5.length;
    const alignIndex12 = closesSeries.length - ma12.length;

    if (state.settings.chartStyle === "line") {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(96,165,250,0.95)";
      closesSeries.forEach((p, i) => {
        const x = pad.l + (i / (closesSeries.length - 1)) * w;
        const yy = y(p);
        if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      });
      ctx.stroke();
    } else {
      candles.forEach((c, i) => {
        const x = pad.l + (i / (candles.length - 1)) * w;
        const open = Number(c.o), close = Number(c.c), high = Number(c.h), low = Number(c.l);
        const up = close >= open;
        const bodyTop = y(Math.max(open, close));
        const bodyBottom = y(Math.min(open, close));
        const wickTop = y(high);
        const wickBottom = y(low);
        ctx.strokeStyle = up ? "rgba(34,197,94,0.95)" : "rgba(248,113,113,0.95)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, wickTop);
        ctx.lineTo(x, wickBottom);
        ctx.stroke();

        ctx.fillStyle = up ? "rgba(34,197,94,0.85)" : "rgba(248,113,113,0.85)";
        const bodyH = Math.max(1, bodyBottom - bodyTop);
        ctx.fillRect(x - 3, bodyTop, 6, bodyH);
      });
    }

    // moving averages
    const drawMA = (series, offset, stroke) => {
      if (series.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      series.forEach((p, i) => {
        const x = pad.l + ((i + offset) / (candles.length - 1)) * w;
        const yy = y(p);
        if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      });
      ctx.stroke();
    };
    drawMA(ma5, alignIndex, "rgba(250,204,21,0.95)");
    drawMA(ma12, alignIndex12, "rgba(96,165,250,0.95)");

    // last price
    const lastPrice = closesSeries[closesSeries.length - 1];
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(226,232,240,0.35)";
    ctx.beginPath();
    ctx.moveTo(pad.l, y(lastPrice));
    ctx.lineTo(pad.l + w, y(lastPrice));
    ctx.stroke();
    ctx.setLineDash([]);

    // labels
    ctx.fillStyle = "rgba(226,232,240,0.85)";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillText(fmt.usd(maxY), 8, y(maxY));
    ctx.fillText(fmt.usd(minY), 8, y(minY));
    ctx.fillText(asset.symbol, pad.l, 12);
    ctx.fillText(`Entry`, pad.l + 6, y(asset.analysis.entryZone[0]) - 6);
    ctx.fillText(`Target`, pad.l + 6, y(asset.analysis.targetZone[1]) - 6);
    ctx.fillText(`Stop`, pad.l + 6, y(asset.analysis.stopLoss[1]) - 6);
  }

  function renderNews() {
    const items = [...state.datasets.news].sort((a, b) => parseTime(b.updatedAt) - parseTime(a.updatedAt)).slice(0, 10);
    if (!items.length) {
      els.newsFeed.innerHTML = `<div class="empty-state">No news available in the current dataset.</div>`;
      return;
    }
    els.newsFeed.innerHTML = items.map(n => {
      const asset = state.assets.find(a => a.id === n.ticker || a.symbol === n.ticker) || {};
      const ageMin = (Date.now() - parseTime(n.updatedAt)) / 60000;
      const freshness = ageMin <= 15 ? "breaking" : ageMin <= 60 ? "recent" : "stale";
      const sentiment = Number(n.sentiment) || 0;
      const impact = Number(n.impact) || 0;
      return `
        <article class="news-item ${freshness}">
          <div class="news-top">
            <div>
              <div class="news-title">${escapeHtml(n.title)}</div>
              <div class="news-meta">${escapeHtml(n.ticker)} · ${escapeHtml(asset.name || n.ticker)} · ${escapeHtml(n.source || "news")}</div>
            </div>
            <span class="news-age ${freshness}">${fmt.ago(n.updatedAt)}</span>
          </div>
          <div class="news-summary">${escapeHtml(n.summary || "")}</div>
          <div class="news-tags">
            <span>Sentiment ${sentiment >= 0 ? "+" : ""}${sentiment.toFixed(2)}</span>
            <span>Impact ${impact.toFixed(2)}</span>
            <span>${n.isBreaking ? "Breaking" : "Non-breaking"}</span>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderAnalysisPanel() {
    const asset = state.assets.find(a => a.id === state.selectedAssetId) || state.assets[0];
    if (!asset) return;
    const a = asset.analysis;
    const bars = [
      ["Trend strength", a.trendScore],
      ["Momentum strength", a.momentumScore],
      ["Volume confirmation", a.volumeScore],
      ["Volatility suitability", a.volatilityScore],
      ["Sentiment score", a.sentimentScore],
      ["News score", a.newsScore],
      ["Market context", a.marketContextScore],
      ["Freshness", a.freshness],
      ["Liquidity", a.liquidityScore]
    ];
    els.analysisBody.innerHTML = `
      <div class="analysis-grid">
        ${bars.map(([label, value]) => `
          <div class="analysis-row">
            <span>${label}</span>
            <div class="bar"><span style="width:${clamp(value)}%"></span></div>
            <strong>${Math.round(value)}%</strong>
          </div>
        `).join("")}
      </div>
      <div class="probability-box">
        <div><span>Probability band</span><strong>${a.probabilityBand[0]}% – ${a.probabilityBand[1]}%</strong></div>
        <div><span>Bias</span><strong>${a.bias}</strong></div>
        <div><span>Direction</span><strong>${a.signal}</strong></div>
        <div><span>Freshness</span><strong>${a.freshnessLabel}</strong></div>
      </div>
    `;
  }

  function renderControls() {
    els.refreshMode.textContent = state.settings.refreshIntervalSeconds === 0 ? "Manual only" : `Auto refresh every ${state.settings.refreshIntervalSeconds}s`;
    els.themeSwitch.textContent = state.settings.theme === "dark" ? "Dark" : "Light";
  }

  function renderSources() {
    const ds = state.datasets.sourceStatus || {};
    els.sourceSummary.innerHTML = `
      <div class="source-stat"><span>Active source</span><strong>${escapeHtml(state.source.activeSource || "local snapshot")}</strong></div>
      <div class="source-stat"><span>Fallback mode</span><strong>${state.source.fallbackMode ? "Enabled" : "Disabled"}</strong></div>
      <div class="source-stat"><span>Last successful fetch</span><strong>${fmt.time(state.source.lastSuccessfulFetch)}</strong></div>
      <div class="source-stat"><span>Failed requests</span><strong>${state.source.failedRequests || 0}</strong></div>
    `;
    const freshness = Object.entries(state.datasets.sourceStatus?.datasets || {});
    if (freshness.length) {
      els.datasetStatuses.innerHTML = freshness.map(([name, status]) => `
        <div class="dataset-row">
          <span>${escapeHtml(name)}</span>
          <strong>${escapeHtml(status.status || "unknown")}</strong>
          <small>${fmt.time(status.updatedAt)}</small>
        </div>
      `).join("");
    }
  }

  function updateTheme() {
    document.body.dataset.theme = state.settings.theme;
  }

  function persistSettings() {
    storeJSON(STORAGE.settings, state.settings);
  }

  function persistSession() {
    storeJSON(STORAGE.session, {
      settings: state.settings,
      watchlist: state.datasets.watchlist,
      selectedAssetId: state.selectedAssetId
    });
    showToast("Session saved to browser storage.", "success");
  }

  function clearCache() {
    localStorage.removeItem(STORAGE.cache);
    localStorage.removeItem(STORAGE.imported);
    showToast("Local cache cleared.", "info");
  }

  function exportSnapshot(kind = "snapshot") {
    const payload = {
      exportedAt: new Date().toISOString(),
      kind,
      settings: state.settings,
      watchlist: state.datasets.watchlist,
      assets: state.datasets.assets,
      prices: state.datasets.prices,
      candles: state.datasets.candles,
      news: state.datasets.news,
      indicators: state.datasets.indicators,
      signals: state.datasets.signals,
      history: state.datasets.history,
      sourceStatus: state.datasets.sourceStatus
    };
    downloadJSON(`market-${kind}-${dateStamp()}.json`, payload);
  }

  function exportWatchlist() {
    downloadJSON(`watchlist-${dateStamp()}.json`, state.datasets.watchlist);
  }

  function exportSignals() {
    downloadJSON(`signals-${dateStamp()}.json`, {
      exportedAt: new Date().toISOString(),
      items: state.assets.map(a => ({
        assetId: a.id,
        signal: a.analysis.signal,
        confidence: a.analysis.confidence,
        score: a.analysis.score,
        entryZone: a.analysis.entryZone,
        targetZone: a.analysis.targetZone,
        stopLoss: a.analysis.stopLoss,
        rr: a.analysis.rr,
        freshness: a.analysis.freshnessLabel,
        updatedAt: a.analysis.updatedAt
      }))
    });
  }

  function downloadJSON(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function dateStamp() {
    return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, s => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[s]));
  }

  function applyUiSettings() {
    document.body.classList.toggle("light", state.settings.theme === "light");
    els.refreshInterval.value = String(state.settings.refreshIntervalSeconds);
    els.staleThreshold.value = String(state.settings.staleThresholdSeconds);
    els.confThreshold.value = String(state.settings.confidenceThreshold);
    els.chartStyle.value = state.settings.chartStyle;
  }

  async function refreshData({ manual = false } = {}) {
    if (state.requestInFlight) return;
    state.requestInFlight = true;
    state.fetchRound += 1;
    state.source.lastAttempt = new Date().toISOString();
    setStatus("loading", manual ? "Refreshing now…" : "Checking market…");
    try {
      const live = await maybeFetchLiveData();
      if (live) {
        state.datasets = normalizeData(live);
        state.source = buildSourceState(state.datasets.sourceStatus);
        state.settings = deepMerge(state.settings, state.datasets.settings || {});
      } else {
        state.source.activeSource = "local JSON snapshot";
        state.source.fallbackMode = true;
      }
      state.datasets.settings = state.settings;
      state.source.lastSuccessfulFetch = new Date().toISOString();
      state.source.status = navigator.onLine ? "live" : "offline";
      storeJSON(STORAGE.cache, {
        cachedAt: new Date().toISOString(),
        datasets: state.datasets,
        selectedAssetId: state.selectedAssetId
      });
      setStatus("ok", state.source.fallbackMode ? "Using local snapshot" : "Live data active");
    } catch (err) {
      state.source.failedRequests += 1;
      state.source.status = "degraded";
      setStatus("warn", "Source degraded, using fallback");
      showToast(`Refresh issue: ${err.message}`, "warn");
      const cached = readStoredJSON(STORAGE.cache, null);
      if (cached?.datasets) {
        state.datasets = cached.datasets;
      }
    } finally {
      state.requestInFlight = false;
      state.datasets.settings = state.settings;
      prepareComputedAssets();
      state.settings.selectedAssetId = state.selectedAssetId;
      persistSettings();
      if (manual) persistSession();
      render();
      scheduleCountdown();
    }
  }

  async function maybeFetchLiveData() {
    // Static-first: only attempt live endpoints when enabled and the browser is online.
    const config = state.datasets.config || defaultData.config;
    const endpoints = config.liveEndpoints || {};
    const anyEnabled = Object.values(endpoints).some(x => x && x.enabled && x.url);
    if (!navigator.onLine || !anyEnabled) return null;

    const out = safeJsonClone(state.datasets);
    const updatedAt = new Date().toISOString();
    let touched = false;

    if (endpoints.crypto?.enabled && endpoints.crypto.url) {
      const crypto = await fetchJson(endpoints.crypto.url);
      // intentionally permissive mapping: user can swap endpoint with matching symbols
      mapCryptoLive(out, crypto);
      touched = true;
    }
    if (endpoints.stocks?.enabled && endpoints.stocks.url) {
      const stock = await fetchJson(endpoints.stocks.url);
      mapStockLive(out, stock);
      touched = true;
    }

    if (touched) {
      out.sourceStatus = out.sourceStatus || {};
      out.sourceStatus.lastSuccessfulFetch = updatedAt;
      out.sourceStatus.lastAttempt = updatedAt;
      out.sourceStatus.activeSource = "live public API";
      out.sourceStatus.fallbackMode = false;
      return out;
    }
    return null;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return await res.json();
  }

  function mapCryptoLive(dataset, payload) {
    // Accepts a simple price JSON map or provider-specific payload.
    const prices = dataset.prices || {};
    const nowIso = new Date().toISOString();
    const assets = dataset.assets || [];
    for (const asset of assets.filter(a => a.assetType === "crypto")) {
      const key = asset.symbol.toLowerCase();
      const direct = payload?.[key] || payload?.[asset.symbol] || payload?.[asset.id] || payload?.[asset.name?.toLowerCase()];
      if (direct && typeof direct === "object") {
        const price = Number(direct.usd ?? direct.price ?? direct.last ?? direct.current_price);
        if (Number.isFinite(price)) {
          prices[asset.id] = {
            price,
            change24h: Number(direct.usd_24h_change ?? direct.change24h ?? direct.change_percentage ?? 0),
            volume24h: Number(direct.usd_24h_vol ?? direct.volume24h ?? direct.volume ?? 0),
            marketCap: Number(direct.market_cap ?? 0),
            updatedAt: nowIso,
            source: "live-crypto"
          };
        }
      }
    }
    dataset.prices = prices;
  }

  function mapStockLive(dataset, payload) {
    // Generic hook for a CORS-enabled stock provider that returns symbol keyed objects.
    const prices = dataset.prices || {};
    const nowIso = new Date().toISOString();
    const assets = dataset.assets || [];
    for (const asset of assets.filter(a => a.assetType === "stock")) {
      const direct = payload?.[asset.symbol] || payload?.[asset.id];
      if (direct && typeof direct === "object") {
        const price = Number(direct.price ?? direct.last ?? direct.close ?? direct.c);
        if (Number.isFinite(price)) {
          prices[asset.id] = {
            price,
            change24h: Number(direct.change24h ?? direct.change_percent ?? 0),
            volume24h: Number(direct.volume24h ?? direct.volume ?? 0),
            marketCap: Number(direct.marketCap ?? 0),
            updatedAt: nowIso,
            source: "live-stock"
          };
        }
      }
    }
    dataset.prices = prices;
  }

  function scheduleCountdown() {
    const interval = Number(state.settings.refreshIntervalSeconds || 0);
    clearInterval(state.refreshTimer);
    state.refreshCountdown = interval;
    if (interval <= 0) {
      els.countdown.textContent = "manual";
      return;
    }
    state.refreshTimer = window.setInterval(() => {
      state.refreshCountdown -= 1;
      if (state.refreshCountdown <= 0) {
        state.refreshCountdown = interval;
        refreshData().catch(() => {});
      }
      renderHeader();
    }, 1000);
  }

  function bindEvents() {
    document.addEventListener("click", (e) => {
      const select = e.target.closest("[data-select-asset]");
      if (select) {
        state.selectedAssetId = select.getAttribute("data-select-asset");
        state.settings.selectedAssetId = state.selectedAssetId;
        persistSettings();
        render();
        return;
      }

      const action = e.target.closest("[data-action]");
      if (!action) return;
      const name = action.getAttribute("data-action");
      if (name === "refresh-now") refreshData({ manual: true });
      if (name === "save-session") persistSession();
      if (name === "restore-session") restoreSession();
      if (name === "clear-cache") clearCache();
      if (name === "export-json") exportSnapshot("snapshot");
      if (name === "export-watchlist") exportWatchlist();
      if (name === "export-signals") exportSignals();
      if (name === "toggle-theme") toggleTheme();
    });

    const bindInput = (id, cb) => {
      $(id).addEventListener("input", cb);
      $(id).addEventListener("change", cb);
    };

    bindInput("filterQuery", (e) => { state.settings.filters.query = e.target.value; persistSettings(); render(); });
    bindInput("filterType", (e) => { state.settings.filters.assetType = e.target.value; persistSettings(); render(); });
    bindInput("filterSignal", (e) => { state.settings.filters.signal = e.target.value; persistSettings(); render(); });
    bindInput("filterFreshness", (e) => { state.settings.filters.freshness = e.target.value; persistSettings(); render(); });
    bindInput("filterVolatility", (e) => { state.settings.filters.volatility = e.target.value; persistSettings(); render(); });
    bindInput("filterSentiment", (e) => { state.settings.filters.sentiment = e.target.value; persistSettings(); render(); });
    bindInput("filterExchange", (e) => { state.settings.filters.exchange = e.target.value; persistSettings(); render(); });
    bindInput("filterPriceMin", (e) => { state.settings.filters.priceMin = e.target.value; persistSettings(); render(); });
    bindInput("filterPriceMax", (e) => { state.settings.filters.priceMax = e.target.value; persistSettings(); render(); });
    bindInput("confThreshold", (e) => { state.settings.confidenceThreshold = Number(e.target.value); persistSettings(); render(); });
    bindInput("refreshInterval", (e) => { state.settings.refreshIntervalSeconds = Number(e.target.value); persistSettings(); scheduleCountdown(); render(); });
    bindInput("staleThreshold", (e) => { state.settings.staleThresholdSeconds = Number(e.target.value); persistSettings(); render(); });
    bindInput("chartStyle", (e) => { state.settings.chartStyle = e.target.value; persistSettings(); render(); });

    els.importFiles.addEventListener("change", handleImportFiles);
    els.importCombined.addEventListener("change", handleImportCombined);
    window.addEventListener("online", () => { state.source.status = "online"; showToast("Connection restored.", "success"); renderHeader(); });
    window.addEventListener("offline", () => { state.source.status = "offline"; showToast("You are offline. Using cached data.", "warn"); renderHeader(); });
  }

  function toggleTheme() {
    state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
    persistSettings();
    render();
  }

  function restoreSession() {
    const session = readStoredJSON(STORAGE.session, null);
    if (!session) {
      showToast("No saved session found.", "warn");
      return;
    }
    state.settings = deepMerge(state.settings, session.settings || {});
    if (session.watchlist) state.datasets.watchlist = session.watchlist;
    if (session.selectedAssetId) state.selectedAssetId = session.selectedAssetId;
    persistSettings();
    showToast("Session restored.", "success");
    render();
    scheduleCountdown();
  }

  async function handleImportFiles(e) {
    const files = [...e.target.files];
    if (!files.length) return;
    const imported = {};
    try {
      for (const file of files) {
        const text = await file.text();
        const json = JSON.parse(text);
        assignImportedFile(imported, file.name, json);
      }
      localStorage.setItem(STORAGE.imported, JSON.stringify(imported));
      applyImportedState(state.datasets, imported);
      if (imported.settings) state.settings = deepMerge(state.settings, imported.settings);
      showToast("Imported JSON files applied.", "success");
      persistSettings();
      render();
    } catch (err) {
      showToast(`Import failed: ${err.message}`, "warn");
    } finally {
      e.target.value = "";
    }
  }

  async function handleImportCombined(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      localStorage.setItem(STORAGE.imported, JSON.stringify(json));
      applyImportedState(state.datasets, json);
      if (json.settings) state.settings = deepMerge(state.settings, json.settings);
      showToast("Imported dashboard snapshot applied.", "success");
      persistSettings();
      render();
    } catch (err) {
      showToast(`Combined import failed: ${err.message}`, "warn");
    } finally {
      e.target.value = "";
    }
  }

  function assignImportedFile(target, fileName, json) {
    const lower = fileName.toLowerCase();
    if (lower.includes("config")) target.config = json;
    else if (lower.includes("asset")) target.assets = json;
    else if (lower.includes("watchlist")) target.watchlist = json;
    else if (lower.includes("price")) target.prices = json;
    else if (lower.includes("candle")) target.candles = json;
    else if (lower.includes("news")) target.news = json;
    else if (lower.includes("indicator")) target.indicators = json;
    else if (lower.includes("signal")) target.signals = json;
    else if (lower.includes("setting")) target.settings = json;
    else if (lower.includes("history")) target.history = json;
    else if (lower.includes("source")) target.sourceStatus = json;
    else Object.assign(target, json);
  }

  function refreshControlsFromSettings() {
    applyUiSettings();
    state.selectedAssetId = state.settings.selectedAssetId || state.datasets.watchlist[0] || state.datasets.assets[0]?.id || null;
  }

  async function init() {
    cacheElements();
    bindEvents();
    await loadInitialData();
    refreshControlsFromSettings();
    render();
    scheduleCountdown();
    state.loading = false;
    state.ready = true;
    setStatus("ok", navigator.onLine ? "Local snapshot loaded" : "Offline / cached");
    showToast("Dashboard ready.", "success");
    state.clockTimer = window.setInterval(() => {
      if (state.ready) renderHeader();
    }, 1000);
  }

  function cacheElements() {
    const ids = [
      "metricTotal","metricBuys","metricSells","metricStale","metricConfidence",
      "lastUpdated","countdown","livePulse","livePulseText","topBull","topBear",
      "assetGrid","assetCount","detailPanel","detailTitle","detailSubtitle","newsFeed",
      "analysisBody","sourceSummary","datasetStatuses","refreshMode","themeSwitch","sourceStatus",
      "toastHost","filterQuery","filterType","filterSignal","filterFreshness","filterVolatility",
      "filterSentiment","filterExchange","filterPriceMin","filterPriceMax","confThreshold",
      "refreshInterval","staleThreshold","chartStyle","importFiles","importCombined"
    ];
    for (const id of ids) els[id] = $(id);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
