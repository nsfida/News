# Apex Loan Ledger

Static loan tracking app for GitHub Pages.

## Included
- `index.html`
- `styles.css`
- `config.js`
- `app.js`

## Setup
1. Put these files in the same folder.
2. Add your `DirhamSymbol.ttf` and `riyal.otf` font files alongside them if you want the special currency glyphs.
3. Replace `SUPABASE_ANON_KEY` in `config.js` with your real public anon key.
4. Open `index.html`.

## Access gate
The client-side gate uses a hashed password in `config.js`. Replace the hash with your own if you want a different access phrase.

## Supabase table
Recommended table: `loan_entries`

Columns:
- `id` uuid primary key
- `category` text
- `person_name` text
- `amount` numeric
- `currency` text
- `entry_date` date
- `status` text
- `partial_amount` numeric
- `partial_note` text
- `remaining_balance` numeric
- `notes` text
- `created_at` timestamptz
- `updated_at` timestamptz
