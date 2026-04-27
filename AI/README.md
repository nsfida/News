# Financial Intelligence Dashboard

A static, GitHub Pages-ready financial intelligence dashboard built with HTML, CSS, and vanilla JavaScript.

## Features
- Live / near-real-time market panels for Silver, WTI, Brent, Tech45 (NASDAQ-100 / ^NDX), and Cack40 (CAC 40 / ^FCHI)
- Technical indicators: SMA, EMA, RSI, MACD, Bollinger Bands, trend regression, volatility estimate
- Probabilistic forecasts with confidence levels
- Client-side sentiment scan from public news endpoints
- Trade zones with suggested entry / exit / stop-loss / take-profit ranges
- Prediction tracking stored in browser localStorage
- Graceful fallback demo data when APIs are unavailable

## Data sources
- Alpha Vantage for commodities and market news / sentiment
- Financial Modeling Prep for index quotes and historical data
- GDELT for public news headlines and snippets

## Setup
1. Put the files in a GitHub Pages repository.
2. Open `index.html`.
3. Add your API keys in the settings panel.

## Notes
- API keys are stored only in your browser via localStorage.
- GitHub Pages cannot securely hide secrets.
- The app is educational and does not guarantee forecasts or trade outcomes.
