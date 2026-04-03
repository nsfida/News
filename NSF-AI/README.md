# Market Intelligence & Prediction Dashboard

A fully static, browser-based market research terminal for stocks and crypto.

## What it does
- Loads market metadata, prices, news, indicators, predictions, watchlist, settings, alerts, and history from JSON
- Supports live-mode JSON endpoints or manual/offline JSON files
- Caches current datasets in `localStorage` and session state in `sessionStorage`
- Computes decision-support signals with bias, confidence, entry zone, target zone, stop-loss, and risk/reward
- Renders a polished dark-mode dashboard with filters, search, charts, import/export, and asset detail views

## Files
- `index.html` — app shell and layout
- `style.css` — full visual system
- `app.js` — client-side data loading, analysis engine, rendering, storage, export/import
- `data/*.json` — sample datasets and schemas-in-practice
- `README.md` — setup and maintenance guide

## How to run
Because this is a static app, host the folder on any static server:
- GitHub Pages
- Netlify
- Vercel static output
- Apache / Nginx
- A local static server

For local development, use any static server so `fetch()` can read the JSON files. Examples:
- `python -m http.server 8000`
- `npx serve`
- VS Code Live Server

Open the site in a browser after serving it.

## How the data works
The app reads the JSON files from `data/` on load. If a source fails, it falls back to cached browser data and then to the bundled sample datasets.

### Browser storage
- `localStorage` keeps the latest loaded datasets, watchlist, and settings
- `sessionStorage` keeps the active section, selected asset, and current filter state for the browser session
- You can clear both from the Data Manager section

## Updating JSON files
Replace or edit the JSON files in `data/` and commit them to your repository.

Recommended update flow:
1. Replace `prices.json`, `news.json`, or any other dataset
2. Refresh the page
3. Use **Save to Browser Storage** if you want to preserve the new state in the current browser

## Adding new assets
1. Add a record to `data/assets.json`
2. Add matching entries in `prices.json`, `indicators.json`, and `predictions.json`
3. Add any relevant news items to `news.json`
4. Add the new asset to `watchlist.json` if desired

## Refreshing data
The dashboard supports:
- manual refresh
- JSON import
- export/download of each dataset
- live-mode endpoint overrides in Settings

## Limitations
This project is static by design:
- no backend
- no database
- no guaranteed real-time data
- live APIs depend on public access and CORS
- predictions are decision-support signals, not guaranteed outcomes

## Financial disclaimer
This tool is for research and educational decision-support only. It is **not guaranteed financial advice**. Market predictions are probabilistic, can fail, and may become stale quickly. Always verify facts and perform your own research before making investment decisions.

## JSON schema overview
### `assets.json`
List of asset definitions.
### `prices.json`
Price snapshots and OHLC history keyed by asset ID.
### `news.json`
Headline feed with sentiment and impact tags.
### `indicators.json`
Technical indicator snapshot keyed by asset ID.
### `predictions.json`
Prediction output keyed by asset ID.
### `watchlist.json`
Tracked asset IDs and notes.
### `settings.json`
UI, refresh, mode, and endpoint settings.
### `history.json`
Signal history and signal-change notes.
### `alerts.json`
Important warnings and event alerts.
