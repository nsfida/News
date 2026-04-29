# LoanLedger Static Dashboard

Files:
- `index.html`
- `styles.css`
- `app.js`
- `schema.sql`

Setup:
1. Put `DirhamSymbol.ttf` and `riyal.otf` in the same folder as `styles.css`.
2. Apply `schema.sql` in Supabase SQL editor.
3. Host the static files on GitHub Pages or any static host.

Notes:
- The page includes a client-side password gate for access control in a static build.
- The dashboard uses Supabase for storage and falls back to localStorage when the network or backend is unavailable.
- Currency symbols are configurable in `app.js` through the `CURRENCY_META` object.
