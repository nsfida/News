# Premium Car Rental UAE

A premium, pink-themed, fully static car rental management web app for a UAE rental company.

## What it does

This project runs entirely in the browser and supports:

- Dashboard summaries
- Vehicles management
- Customer profiles
- Rental contracts
- Renewals and extensions
- Accounts and customer balances
- Ledger records
- Maintenance tracking
- Traffic fines
- Salik / toll and other charges
- Reports
- JSON import/export per module
- Browser storage for working data
- Printable contract previews

## File structure

Each page is a plain HTML file and all behavior is handled by JavaScript and browser storage.

Important folders:

- `assets/css/` — shared theme and layout styles
- `assets/js/` — modular front-end logic
- `data/` — sample JSON files for manual editing and import/export

## How to run locally

You can open the project from any static web server or host it on GitHub Pages.

For local testing, use a simple static server such as:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## How to host on GitHub Pages

1. Upload the project files to a GitHub repository.
2. Keep the file structure exactly as it is.
3. Enable GitHub Pages in the repository settings.
4. Choose the branch and root folder.
5. Visit the GitHub Pages URL after deployment.

Because the app is static, no backend or build step is required.

## How browser storage works

The app uses browser storage to keep working data inside the browser.

- When you save a record, the app updates browser storage automatically.
- The current working state remains available after refresh.
- Use **Reset Local Data** to clear stored data and reload the default JSON files.

The storage key is local to this project and does not require any external service.

## JSON import/export

Each major section has its own:

- **Download JSON**
- **Import JSON**

Supported files include:

- `vehicles.json`
- `customers.json`
- `contracts.json`
- `renewals.json`
- `accounts.json`
- `ledger.json`
- `maintenance.json`
- `fines.json`
- `charges.json`
- `settings.json`

There is also a full backup file for the entire store.

### Export format

Each section export uses a clean structure:

```json
{
  "version": "1.0",
  "updatedAt": "2026-04-03T00:00:00Z",
  "items": []
}
```

For settings:

```json
{
  "version": "1.0",
  "settings": {}
}
```

## Manual GitHub JSON updates

If you want to update the default data manually on GitHub:

1. Edit the matching file inside `data/`
2. Keep the JSON structure valid
3. Commit and push the change
4. Reload the app

The app loads from the browser storage first. If storage is empty, it loads the default JSON files from `data/`.

## Adding records

Use the page buttons on any module page:

- Add New
- Save Record

The app automatically handles:

- field validation
- local storage update
- JSON export update
- linked balances and summaries

## Contract and renewal behavior

When a contract is saved:

- customer and vehicle are linked
- vehicle availability is updated
- contract totals are calculated
- auto ledger entries are created

When a renewal is saved:

- renewal history is preserved
- the contract end date can be extended
- ledger entries update automatically

## Resetting local data

Go to **Settings** and choose **Reset Local Data**.

This clears the browser storage and reloads the default JSON files.

## Contact details

- Phone: +971 4 360 9991
- contact@pcr.ae
- mo@pcr.ae
- accounts@pcr.ae

## Notes

- This is a static front-end project.
- No backend, no database, and no online API are required.
- It is designed to be GitHub Pages compatible.
