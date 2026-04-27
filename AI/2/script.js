/* ============================================================
   FINTELLIX — styles.css
   Bloomberg Terminal × Modern Dark — Syne + Azeret Mono
   ============================================================ */

/* ── RESET & ROOT ─────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  /* Palette */
  --void:        #05060b;
  --base:        #090b14;
  --surface:     #0e1020;
  --card:        #12152a;
  --card-hover:  #161a30;
  --elevated:    #1b1f38;
  --border:      #1f2440;
  --border-hi:   #2a3060;

  --gold:        #f5c518;
  --gold-dim:    #c49a0e;
  --gold-glow:   rgba(245,197,24,0.15);

  --green:       #22d37a;
  --green-dim:   #16a35a;
  --green-glow:  rgba(34,211,122,0.12);

  --red:         #f0514e;
  --red-dim:     #c03c3a;
  --red-glow:    rgba(240,81,78,0.12);

  --sky:         #38bdf8;
  --violet:      #a78bfa;
  --amber:       #fb923c;

  --txt:         #dde2f8;
  --txt-muted:   #7280aa;
  --txt-dim:     #3d4460;

  /* Fonts */
  --f-display: 'Syne', sans-serif;
  --f-mono:    'Azeret Mono', monospace;
  --f-body:    'Plus Jakarta Sans', sans-serif;

  /* Sizing */
  --hdr-h: 56px;
  --nav-h: 54px;
  --radius: 8px;
  --radius-lg: 12px;
}

html { scroll-behavior: smooth; }

body {
  background: var(--void);
  color: var(--txt);
  font-family: var(--f-body);
  font-size: 13px;
  line-height: 1.5;
  min-height: 100vh;
  overflow-x: hidden;
}

/* ── LOADING OVERLAY ──────────────────────────────────────── */
#loading-overlay {
  position: fixed; inset: 0;
  background: var(--void);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  transition: opacity 0.6s ease, visibility 0.6s ease;
}
#loading-overlay.fade-out { opacity: 0; visibility: hidden; }

.loading-content { text-align: center; max-width: 320px; }

.loading-logo {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  margin-bottom: 8px;
}
.logo-gem {
  font-size: 28px; color: var(--gold);
  animation: gem-pulse 2s ease-in-out infinite;
}
.logo-name {
  font-family: var(--f-display);
  font-size: 28px; font-weight: 800;
  letter-spacing: 6px;
  color: var(--txt);
}
.loading-sub {
  font-family: var(--f-mono);
  font-size: 10px; color: var(--txt-muted);
  letter-spacing: 2px; text-transform: uppercase;
  margin-bottom: 28px;
}
.loading-track {
  width: 100%; height: 2px;
  background: var(--border);
  border-radius: 2px; overflow: hidden;
  margin-bottom: 12px;
}
.loading-fill {
  height: 100%; width: 0;
  background: linear-gradient(90deg, var(--gold-dim), var(--gold));
  border-radius: 2px;
  transition: width 0.3s ease;
  box-shadow: 0 0 12px var(--gold-glow);
}
.loading-status {
  font-family: var(--f-mono);
  font-size: 10px; color: var(--txt-dim);
  letter-spacing: 1px; min-height: 16px;
}

/* ── APP HIDDEN STATE ─────────────────────────────────────── */
.app-hidden { opacity: 0; pointer-events: none; transition: opacity 0.5s ease; }
.app-visible { opacity: 1; pointer-events: auto; }

/* ── HEADER ───────────────────────────────────────────────── */
.hdr {
  position: sticky; top: 0; z-index: 100;
  height: var(--hdr-h);
  background: rgba(9,11,20,0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center;
  padding: 0 20px; gap: 20px;
}

.hdr-brand {
  display: flex; align-items: center; gap: 10px;
  flex-shrink: 0;
}
.brand-gem { font-size: 20px; color: var(--gold); }
.brand-name {
  font-family: var(--f-display);
  font-size: 16px; font-weight: 800;
  letter-spacing: 4px; color: var(--txt);
}
.brand-sub {
  font-family: var(--f-mono);
  font-size: 9px; color: var(--txt-dim);
  letter-spacing: 2px; text-transform: uppercase;
  line-height: 1;
}

.hdr-center {
  flex: 1; display: flex; align-items: center; gap: 20px;
  justify-content: center;
}
.clock-wrap {
  display: flex; align-items: center; gap: 6px;
  font-family: var(--f-mono); font-size: 12px; color: var(--txt-muted);
}
.clock-icon { color: var(--gold); animation: spin 4s linear infinite; display: inline-block; }
.market-time { color: var(--txt); }

.status-wrap {
  display: flex; align-items: center; gap: 6px;
  font-family: var(--f-mono); font-size: 11px;
}
.status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--txt-dim);
  box-shadow: 0 0 0 0 transparent;
  transition: background 0.4s;
}
.status-dot.live { background: var(--green); animation: dot-pulse 2s ease-in-out infinite; }
.status-dot.synth { background: var(--amber); }
.status-dot.err { background: var(--red); }

.update-wrap { font-family: var(--f-mono); font-size: 10px; color: var(--txt-dim); }

.hdr-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

.icon-btn {
  width: 32px; height: 32px;
  background: var(--elevated); border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--txt-muted); font-size: 14px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.icon-btn:hover { background: var(--border-hi); color: var(--gold); border-color: var(--border-hi); }

.src-badge {
  font-family: var(--f-mono); font-size: 9px;
  padding: 3px 8px; border-radius: 4px;
  letter-spacing: 1.5px;
  background: var(--green-glow); border: 1px solid var(--green-dim);
  color: var(--green); font-weight: 600;
}
.src-badge.synth { background: rgba(251,146,60,0.1); border-color: var(--amber); color: var(--amber); }

/* ── ASSET NAV ────────────────────────────────────────────── */
.asset-nav {
  height: var(--nav-h);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center;
  overflow-x: auto; overflow-y: hidden;
  scrollbar-width: none; padding: 0 16px; gap: 4px;
}
.asset-nav::-webkit-scrollbar { display: none; }

.asset-tab {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 10px;
  padding: 0 16px; height: 38px;
  background: transparent; border: 1px solid transparent;
  border-radius: var(--radius); cursor: pointer;
  transition: all 0.2s; position: relative;
}
.asset-tab:hover { background: var(--elevated); border-color: var(--border); }
.asset-tab.active {
  background: var(--card);
  border-color: var(--border-hi);
  box-shadow: 0 0 20px rgba(245,197,24,0.06);
}
.asset-tab.active::before {
  content: '';
  position: absolute; bottom: 0; left: 16px; right: 16px; height: 2px;
  background: var(--gold);
  border-radius: 2px 2px 0 0;
}

.tab-label { font-family: var(--f-display); font-size: 12px; font-weight: 600; color: var(--txt); }
.tab-sym { font-family: var(--f-mono); font-size: 9px; color: var(--txt-dim); letter-spacing: 1px; }
.tab-price { font-family: var(--f-mono); font-size: 12px; color: var(--txt-muted); }
.tab-chg { font-family: var(--f-mono); font-size: 10px; }
.tab-chg.pos { color: var(--green); }
.tab-chg.neg { color: var(--red); }

/* ── DASHBOARD GRID ───────────────────────────────────────── */
.dash-grid {
  display: grid;
  grid-template-columns: 240px 1fr 260px;
  grid-template-rows: auto;
  gap: 16px;
  padding: 16px;
  min-height: calc(100vh - var(--hdr-h) - var(--nav-h) - 80px);
  align-items: start;
}

@media (max-width: 1200px) {
  .dash-grid { grid-template-columns: 220px 1fr 240px; }
}
@media (max-width: 980px) {
  .dash-grid { grid-template-columns: 1fr 1fr; }
  .panel-left { grid-column: 1; }
  .panel-center { grid-column: 1 / -1; order: -1; }
  .panel-right { grid-column: 2; }
}
@media (max-width: 640px) {
  .dash-grid { grid-template-columns: 1fr; padding: 10px; gap: 12px; }
  .panel-left, .panel-center, .panel-right { grid-column: 1; }
  .panel-center { order: -1; }
}

/* ── CARD BASE ────────────────────────────────────────────── */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color 0.2s;
}
.card:hover { border-color: var(--border-hi); }

.card-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--border);
}
.card-title {
  font-family: var(--f-mono);
  font-size: 9px; font-weight: 600;
  letter-spacing: 2px; text-transform: uppercase;
  color: var(--txt-dim);
}

/* ── PANEL LEFT ───────────────────────────────────────────── */
.panel-left { display: flex; flex-direction: column; gap: 12px; }

/* Price Card */
.price-card {}
.live-dot {
  font-family: var(--f-mono); font-size: 9px;
  color: var(--green); letter-spacing: 1px;
  animation: blink 2s ease-in-out infinite;
}

.price-hero { padding: 14px 14px 0; }
.price-main { display: flex; align-items: baseline; gap: 4px; }
.price-cur {
  font-family: var(--f-mono); font-size: 14px;
  color: var(--txt-muted); margin-bottom: 2px;
}
.price-val {
  font-family: var(--f-mono); font-size: 30px; font-weight: 500;
  color: var(--txt); letter-spacing: -1px;
  line-height: 1;
}
.price-delta {
  display: flex; gap: 8px; align-items: center;
  margin-top: 4px; margin-bottom: 12px;
  font-family: var(--f-mono); font-size: 12px;
}
.p-chg.pos { color: var(--green); }
.p-chg.neg { color: var(--red); }
.p-pct { color: var(--txt-muted); }

.price-stats {
  display: grid; grid-template-columns: 1fr 1fr;
  border-top: 1px solid var(--border);
}
.pstat {
  padding: 8px 14px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.pstat:nth-child(2n) { border-right: none; }
.pstat:nth-child(3), .pstat:nth-child(4) { border-bottom: none; }
.pstat-l {
  display: block;
  font-family: var(--f-mono); font-size: 8px;
  color: var(--txt-dim); letter-spacing: 1.5px; text-transform: uppercase;
  margin-bottom: 2px;
}
.pstat-v {
  font-family: var(--f-mono); font-size: 12px; color: var(--txt);
}

/* Metrics Card */
.metrics-body { padding: 4px 0; }

.mrow {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 14px;
  border-bottom: 1px solid rgba(31,36,64,0.5);
  transition: background 0.15s;
}
.mrow:hover { background: var(--elevated); }
.mrow:last-child { border-bottom: none; }

.ml {
  font-family: var(--f-mono); font-size: 10px;
  color: var(--txt-muted); flex: 0 0 60px;
}
.msig {
  flex: 0 0 50px;
  font-family: var(--f-mono); font-size: 9px;
  padding: 1px 6px; border-radius: 3px;
  text-align: center;
}
.msig.bull { background: var(--green-glow); color: var(--green); }
.msig.bear { background: var(--red-glow); color: var(--red); }
.msig.neut { background: rgba(161,139,250,0.1); color: var(--violet); }

.mv {
  font-family: var(--f-mono); font-size: 11px;
  color: var(--txt); margin-left: auto;
}

.rsi-track {
  flex: 1; height: 4px; background: var(--border);
  border-radius: 4px; overflow: hidden;
}
.rsi-fill {
  height: 100%; width: 50%;
  background: var(--gold);
  border-radius: 4px;
  transition: width 0.6s ease, background 0.4s;
}

/* Sentiment Card */
.sent-meter { padding: 12px 14px 4px; }
.sent-track {
  position: relative; height: 8px;
  background: linear-gradient(90deg, var(--red-dim), var(--border), var(--green-dim));
  border-radius: 8px; margin-bottom: 6px;
}
.sent-fill {
  position: absolute; top: 0; left: 0; bottom: 0;
  border-radius: 8px; opacity: 0.4;
  transition: width 0.8s ease;
}
.sent-needle {
  position: absolute; top: -4px; width: 4px; height: 16px;
  background: var(--gold);
  border-radius: 2px; transform: translateX(-50%);
  transition: left 0.8s ease;
  box-shadow: 0 0 8px var(--gold-glow);
}
.sent-labels {
  display: flex; justify-content: space-between;
  font-family: var(--f-mono); font-size: 8px;
  color: var(--txt-dim); letter-spacing: 1px; text-transform: uppercase;
}

.sent-score-wrap {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 14px 8px;
}
.sent-score {
  font-family: var(--f-mono); font-size: 22px; font-weight: 600;
  color: var(--txt);
}
.sent-label {
  font-family: var(--f-mono); font-size: 10px;
  color: var(--txt-muted);
}

.news-list {
  border-top: 1px solid var(--border);
  padding: 6px 0;
  max-height: 140px; overflow-y: auto;
}
.news-item {
  padding: 6px 14px;
  border-bottom: 1px solid rgba(31,36,64,0.4);
  transition: background 0.15s;
}
.news-item:hover { background: var(--elevated); }
.news-item:last-child { border-bottom: none; }
.news-headline {
  font-size: 11px; color: var(--txt-muted);
  margin-bottom: 2px; line-height: 1.3;
}
.news-meta {
  display: flex; gap: 8px;
  font-family: var(--f-mono); font-size: 9px;
}
.news-sig.pos { color: var(--green); }
.news-sig.neg { color: var(--red); }
.news-sig.neu { color: var(--txt-dim); }
.news-time { color: var(--txt-dim); }
.news-empty { padding: 16px 14px; font-size: 11px; color: var(--txt-dim); text-align: center; }

/* ── PANEL CENTER ─────────────────────────────────────────── */
.panel-center { display: flex; flex-direction: column; gap: 12px; }

/* Chart Header */
.chart-hdr {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 10px;
}
.chart-title-group {}
.chart-name {
  font-family: var(--f-display);
  font-size: 20px; font-weight: 700;
  color: var(--txt); line-height: 1;
}
.chart-desc {
  font-family: var(--f-mono); font-size: 10px;
  color: var(--txt-dim); letter-spacing: 1px;
  margin-top: 3px;
}

.chart-controls { display: flex; gap: 8px; flex-wrap: wrap; }

.tf-group, .ind-group {
  display: flex; gap: 2px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 3px;
}
.tf-btn, .ind-btn {
  font-family: var(--f-mono); font-size: 10px;
  padding: 4px 9px; border-radius: 5px;
  background: transparent; border: none;
  color: var(--txt-muted); cursor: pointer;
  transition: all 0.2s; letter-spacing: 0.5px;
}
.tf-btn:hover, .ind-btn:hover { color: var(--txt); background: var(--elevated); }
.tf-btn.active { background: var(--elevated); color: var(--gold); font-weight: 600; }
.ind-btn.active { background: var(--elevated); color: var(--sky); }

/* Chart Boxes */
.chart-box {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.main-box { height: 340px; }
.sub-box { height: 100px; }

.chart-loader {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  gap: 10px; background: var(--surface);
  font-family: var(--f-mono); font-size: 11px; color: var(--txt-muted);
  z-index: 10; border-radius: var(--radius-lg);
  transition: opacity 0.3s;
}
.chart-loader.hidden { opacity: 0; pointer-events: none; }
.spinner {
  width: 18px; height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.sub-charts-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.sub-panel {}
.sub-label {
  font-family: var(--f-mono); font-size: 9px;
  color: var(--txt-dim); letter-spacing: 1px; text-transform: uppercase;
  margin-bottom: 4px; padding-left: 2px;
}
.sub-val { color: var(--txt-muted); font-style: italic; }

/* Tracker Card */
.tracker-card {}
.text-btn {
  font-family: var(--f-mono); font-size: 9px;
  color: var(--txt-dim); background: none; border: none;
  cursor: pointer; padding: 2px 6px;
  border-radius: 3px; transition: all 0.2s;
  letter-spacing: 1px; text-transform: uppercase;
}
.text-btn:hover { color: var(--red); background: var(--red-glow); }

.tracker-stats {
  display: flex; gap: 0;
  border-bottom: 1px solid var(--border);
}
.tstat {
  flex: 1; padding: 12px 14px;
  border-right: 1px solid var(--border);
  text-align: center;
}
.tstat:last-child { border-right: none; }
.tstat-v {
  display: block;
  font-family: var(--f-mono); font-size: 20px; font-weight: 500;
  color: var(--txt); line-height: 1;
  margin-bottom: 4px;
}
.tstat-v.positive { color: var(--green); }
.tstat-l {
  font-family: var(--f-mono); font-size: 8px;
  color: var(--txt-dim); letter-spacing: 1.5px; text-transform: uppercase;
}

.pred-history { max-height: 140px; overflow-y: auto; }
.pred-empty { padding: 16px 14px; font-size: 11px; color: var(--txt-dim); text-align: center; font-style: italic; }

.pred-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 14px;
  border-bottom: 1px solid rgba(31,36,64,0.4);
  font-family: var(--f-mono); font-size: 10px;
  transition: background 0.15s;
}
.pred-row:hover { background: var(--elevated); }
.pred-row:last-child { border-bottom: none; }
.pred-asset { color: var(--gold); flex: 0 0 50px; }
.pred-dir { flex: 0 0 60px; }
.pred-dir.bull { color: var(--green); }
.pred-dir.bear { color: var(--red); }
.pred-conf { color: var(--txt-dim); flex: 0 0 40px; }
.pred-result { margin-left: auto; }
.pred-result.correct { color: var(--green); }
.pred-result.wrong { color: var(--red); }
.pred-result.pending { color: var(--txt-dim); font-style: italic; }
.pred-date { color: var(--txt-dim); font-size: 9px; }

/* ── PANEL RIGHT ──────────────────────────────────────────── */
.panel-right { display: flex; flex-direction: column; gap: 12px; }

/* AI Card */
.ai-ver-badge {
  font-family: var(--f-mono); font-size: 9px;
  padding: 2px 7px; border-radius: 4px;
  background: rgba(167,139,250,0.12);
  border: 1px solid rgba(167,139,250,0.3);
  color: var(--violet);
}

.forecast-dir {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 14px 0;
}
.dir-arrow {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: var(--elevated);
  border: 2px solid var(--border-hi);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; color: var(--txt-muted);
  transition: all 0.4s;
  flex-shrink: 0;
}
.dir-arrow.bull { background: var(--green-glow); border-color: var(--green-dim); color: var(--green); }
.dir-arrow.bear { background: var(--red-glow);   border-color: var(--red-dim);   color: var(--red); }
.dir-lbl {
  font-family: var(--f-display);
  font-size: 18px; font-weight: 700;
  color: var(--txt-muted);
  transition: color 0.4s;
}
.dir-lbl.bull { color: var(--green); }
.dir-lbl.bear { color: var(--red); }

.forecast-targets { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.ft-row { display: flex; align-items: center; justify-content: space-between; }
.ft-lbl { font-family: var(--f-mono); font-size: 10px; color: var(--txt-dim); }
.ft-val { font-family: var(--f-mono); font-size: 12px; color: var(--txt); }

.conf-wrap { display: flex; align-items: center; gap: 8px; }
.conf-track {
  width: 90px; height: 5px;
  background: var(--border); border-radius: 5px; overflow: hidden;
}
.conf-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--violet), var(--sky));
  border-radius: 5px;
  transition: width 0.8s ease;
}
.conf-val { font-family: var(--f-mono); font-size: 11px; color: var(--sky); font-weight: 500; }

.signal-list {
  padding: 0 14px 10px;
  display: flex; flex-direction: column; gap: 4px;
  border-top: 1px solid var(--border);
  padding-top: 8px;
  max-height: 140px; overflow-y: auto;
}
.signal-item {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--f-mono); font-size: 10px;
  padding: 3px 0;
}
.sig-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.sig-dot.bull { background: var(--green); }
.sig-dot.bear { background: var(--red); }
.sig-dot.neut { background: var(--txt-dim); }
.sig-src { color: var(--txt-muted); flex: 1; }
.sig-str { color: var(--txt-dim); font-size: 9px; }

.ai-disclaimer, .trade-disclaimer {
  margin: 8px 14px 10px;
  padding: 7px 10px;
  background: rgba(245,197,24,0.05);
  border: 1px solid rgba(245,197,24,0.15);
  border-radius: 6px;
  font-family: var(--f-mono); font-size: 9px;
  color: rgba(245,197,24,0.7); line-height: 1.4;
}

/* Trade Card */
.risk-badge {
  font-family: var(--f-mono); font-size: 8px;
  padding: 2px 7px; border-radius: 4px;
  letter-spacing: 1px; font-weight: 600;
}
.risk-badge.low    { background: var(--green-glow); color: var(--green);  border: 1px solid var(--green-dim); }
.risk-badge.medium { background: rgba(251,146,60,0.1); color: var(--amber); border: 1px solid var(--amber); }
.risk-badge.high   { background: var(--red-glow); color: var(--red);    border: 1px solid var(--red-dim); }

.trade-action-banner {
  padding: 12px 14px 10px;
  display: flex; flex-direction: column; gap: 3px;
}
.trade-action-lbl {
  font-family: var(--f-display);
  font-size: 20px; font-weight: 800;
  color: var(--txt-muted); letter-spacing: 2px;
  transition: color 0.4s;
}
.trade-action-lbl.buy  { color: var(--green); }
.trade-action-lbl.sell { color: var(--red); }
.trade-action-sub {
  font-family: var(--f-mono); font-size: 10px; color: var(--txt-dim);
}

.trade-levels {
  margin: 0 14px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
}
.tlvl {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.tlvl:last-child { border-bottom: none; }
.tlvl-l { font-family: var(--f-mono); font-size: 8px; color: var(--txt-dim); letter-spacing: 1px; text-transform: uppercase; }
.tlvl-v { font-family: var(--f-mono); font-size: 11px; color: var(--txt); }
.entry-zone { background: rgba(56,189,248,0.04); }
.tp-zone    { background: rgba(34,211,122,0.04); }
.sl-zone    { background: rgba(240,81,78,0.04); }
.tp-targets { display: flex; gap: 10px; }
.tp-t { font-family: var(--f-mono); font-size: 10px; color: var(--green); }

.rr-stats {
  display: flex; gap: 0;
  border-top: 1px solid var(--border);
  margin-bottom: 0;
}
.rrs { flex: 1; padding: 8px 12px; text-align: center; border-right: 1px solid var(--border); }
.rrs:last-child { border-right: none; }
.rrs-l { display: block; font-family: var(--f-mono); font-size: 8px; color: var(--txt-dim); letter-spacing: 1px; margin-bottom: 3px; }
.rrs-v { font-family: var(--f-mono); font-size: 13px; color: var(--txt); }

/* S/R Card */
.sr-body { padding: 8px 0; }
.sr-item {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 14px;
  border-bottom: 1px solid rgba(31,36,64,0.4);
  font-family: var(--f-mono); font-size: 11px;
}
.sr-item:last-child { border-bottom: none; }
.sr-type {
  flex: 0 0 16px; width: 12px; height: 12px; border-radius: 2px;
}
.sr-type.R { background: var(--red-dim); }
.sr-type.S { background: var(--green-dim); }
.sr-type.PP{ background: var(--gold-dim); }
.sr-lbl { color: var(--txt-dim); font-size: 9px; flex: 0 0 36px; }
.sr-val { color: var(--txt); }
.sr-dist { color: var(--txt-dim); font-size: 9px; margin-left: auto; }

/* Volatility Card */
.vol-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
.vg {
  padding: 12px 14px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.vg:nth-child(2n) { border-right: none; }
.vg:nth-child(3), .vg:nth-child(4) { border-bottom: none; }
.vg-l {
  display: block; font-family: var(--f-mono); font-size: 8px;
  color: var(--txt-dim); letter-spacing: 1px; text-transform: uppercase;
  margin-bottom: 4px;
}
.vg-v { font-family: var(--f-mono); font-size: 15px; color: var(--txt); }

/* ── FOOTER ───────────────────────────────────────────────── */
.app-footer {
  margin: 0 16px 16px;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.disclaimer-text {
  font-size: 10px; color: var(--txt-dim); line-height: 1.6;
  margin-bottom: 8px;
}
.disclaimer-text strong { color: var(--amber); }
.footer-meta {
  display: flex; flex-wrap: wrap; gap: 16px;
  font-family: var(--f-mono); font-size: 9px; color: var(--txt-dim);
  letter-spacing: 0.5px;
}

/* ── MODAL ────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(5,6,11,0.85);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.2s;
}
.modal-overlay.hidden { opacity: 0; pointer-events: none; }

.modal {
  background: var(--card);
  border: 1px solid var(--border-hi);
  border-radius: var(--radius-lg);
  width: 420px; max-width: 95vw;
  box-shadow: 0 24px 80px rgba(0,0,0,0.6);
}
.modal-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.modal-title {
  font-family: var(--f-display);
  font-size: 14px; font-weight: 700; letter-spacing: 3px;
  color: var(--txt);
}
.modal-close {
  width: 28px; height: 28px;
  background: var(--elevated); border: 1px solid var(--border);
  border-radius: 6px; color: var(--txt-muted);
  cursor: pointer; font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.modal-close:hover { color: var(--red); border-color: var(--red-dim); }

.modal-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.setting-grp { display: flex; flex-direction: column; gap: 6px; }
.setting-lbl { font-family: var(--f-mono); font-size: 10px; color: var(--txt-muted); letter-spacing: 1px; text-transform: uppercase; }
.optional { color: var(--txt-dim); font-style: italic; font-size: 9px; }
.setting-inp {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--txt); font-family: var(--f-mono); font-size: 12px;
  padding: 8px 10px; outline: none;
  transition: border-color 0.2s;
  width: 100%;
}
.setting-inp:focus { border-color: var(--gold); }
.setting-hint {
  font-size: 10px; color: var(--txt-dim); line-height: 1.4;
}
.setting-hint a { color: var(--sky); text-decoration: none; }
.setting-hint a:hover { text-decoration: underline; }

.modal-ftr { padding: 12px 16px; border-top: 1px solid var(--border); }
.btn-primary {
  width: 100%; padding: 10px;
  background: var(--gold); color: #000;
  font-family: var(--f-display); font-size: 13px; font-weight: 700;
  border: none; border-radius: var(--radius);
  cursor: pointer; letter-spacing: 2px;
  transition: all 0.2s;
}
.btn-primary:hover { background: var(--gold-dim); }

/* ── SCROLLBARS ───────────────────────────────────────────── */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: var(--surface); }
::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--txt-dim); }

/* ── UTILITIES ────────────────────────────────────────────── */
.positive { color: var(--green) !important; }
.negative { color: var(--red) !important; }
.neutral  { color: var(--txt-muted) !important; }
.info-tip { color: var(--txt-dim); font-size: 11px; cursor: help; }

/* ── ANIMATIONS ───────────────────────────────────────────── */
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes gem-pulse {
  0%, 100% { opacity: 1; text-shadow: 0 0 20px rgba(245,197,24,0.5); }
  50%       { opacity: 0.6; text-shadow: none; }
}
@keyframes dot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,122,0.4); }
  50%       { box-shadow: 0 0 0 6px rgba(34,211,122,0); }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
@keyframes slide-in {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
.slide-in { animation: slide-in 0.3s ease forwards; }

/* ── CHART.JS OVERRIDES ───────────────────────────────────── */
canvas { display: block; }

/* ── MOBILE TWEAKS ────────────────────────────────────────── */
@media (max-width: 640px) {
  .hdr-center .update-wrap { display: none; }
  .chart-controls { flex-direction: column; }
  .sub-charts-row { grid-template-columns: 1fr; }
  .tracker-stats { flex-wrap: wrap; }
  .tstat { flex: 0 0 50%; border-right: 1px solid var(--border) !important; border-bottom: 1px solid var(--border) !important; }
  .main-box { height: 280px; }
}