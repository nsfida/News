# Real-Time Market Signal Dashboard

A fully static market intelligence web app for stocks and crypto. It is designed to run on GitHub Pages or any static host using only HTML, CSS, vanilla JavaScript, and JSON.

## What it does

- Monitors a watchlist of stocks and crypto assets
- Loads JSON data from the `/data` folder
- Optionally attempts live polling from configured public endpoints
- Calculates probability-based trade signals
- Shows confidence, freshness, risk, support/resistance, and news impact
- Stores session state in browser storage
- Supports import/export of JSON snapshots and signal reports
- Fallbacks gracefully to cached or imported data if live sources fail

## File structure

- `index.html` — dashboard shell and layout
- `style.css` — responsive trading-terminal UI
- `app.js` — refresh loop, analysis engine, rendering, import/export, storage
- `data/config.json` — scoring model, thresholds, endpoint config, path map
- `data/assets.json` — asset metadata
- `data/watchlist.json` — selected assets
- `data/prices.json` — latest price/volume/market cap snapshot
- `data/candles.json` — OHLCV candle data
- `data/news.json` — news headlines and summaries mapped to assets
- `data/indicators.json` — support/resistance and indicator hints
- `data/signals.json` — sample signal snapshot
- `data/settings.json` — default UI and refresh settings
- `data/history.json` — historical signal snapshot data
- `data/source-status.json` — source health and freshness snapshot

## How to run locally

Because this project fetches JSON files, open it through a static server rather than `file://`.

Examples:

```bash
python -m http.server 8080
```

or:

```bash
npx serve .
```

Then open `http://localhost:8080`.

## How to deploy

Upload the folder to GitHub Pages, Netlify, Cloudflare Pages, Vercel static hosting, or any static file host.

## How refresh works

The dashboard uses a client-side refresh loop:

- countdown timer in the header
- manual refresh button
- configurable intervals: 1s, 5s, 10s, 30s, or manual only
- source health tracking
- cached fallback when a fetch fails
- stale-data detection that reduces confidence and warns the user

## Browser storage

The app uses `localStorage` for:

- saved settings
- restored session state
- local cache of the last successful data load
- imported JSON snapshots

Stored values persist across refreshes in the same browser profile.

## Import / export

The UI supports:

- importing one combined JSON snapshot
- importing multiple separate JSON files
- exporting the current dashboard snapshot
- exporting the watchlist
- exporting signal reports

## Editing JSON

The app is designed so that you can manually update the JSON files inside `/data`.

Common workflow:

1. Edit the JSON files in your repo
2. Commit and deploy
3. Refresh the page

You can also import updated JSON through the interface without changing code.

## Live data integration

The app is static-first. Optional live endpoints can be configured in `data/config.json`.

Important notes:

- some public market APIs require keys
- some APIs do not allow browser CORS access
- if live fetches fail, the dashboard falls back to cached or imported data
- stocks are usually more restricted than crypto in a browser-only static app

## Signal model

Signals are calculated from a weighted score model combining:

- trend
- momentum
- volume confirmation
- volatility suitability
- sentiment
- news impact
- market context
- freshness
- liquidity
- risk penalties

The output is intentionally probabilistic and not guaranteed.

## Data freshness rules

Freshness levels:

- fresh: under 15 seconds
- recent: under 1 minute
- delayed: under 5 minutes
- stale: over 5 minutes

Stale data lowers confidence and suppresses aggressive recommendations.

## Disclaimer

This project is for informational and educational use only. It does not provide financial advice, investment advice, or a guarantee of future performance. Trading involves substantial risk. Always verify data, news, and execution conditions before making decisions.
