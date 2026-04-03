# Premium Car Rental UAE

A fully static, browser-based car rental management system for GitHub Pages.

## What this project does

This app manages:

- vehicles
- customers
- rental contracts
- renewals
- invoices
- receipts
- accounts
- ledger records
- maintenance
- traffic fines
- Salik tolls
- Darb tolls
- other charges
- reports
- printable documents
- JSON import/export per module

Everything runs in the browser. No backend, no database, no framework, and no online API are required at runtime.

## How the app works

The app stores live working data in browser storage during the session and also keeps it available after refresh unless the browser storage is cleared.

Each major module supports:

- add/edit/delete
- search
- JSON download
- JSON import
- print-friendly document output

## GitHub Pages hosting

Upload the project folder to GitHub and enable GitHub Pages from the repository settings.  
The app is fully static, so no build step is required.

## Browser storage

The app uses `localStorage` as the working data store.

Data is saved automatically after edits and can be restored after reload.  
Use **Reset local data** only when you want to restore the built-in seed records.

## JSON import/export

Each module has its own JSON file:

- `vehicles.json`
- `customers.json`
- `contracts.json`
- `renewals.json`
- `invoices.json`
- `receipts.json`
- `accounts.json`
- `ledger.json`
- `maintenance.json`
- `fines.json`
- `tolls.json`
- `charges.json`
- `settings.json`

You can download a module as JSON, edit the file manually, and import it again later.

A full backup download is also available from the JSON page.

## Manual GitHub JSON updates

To update records manually on GitHub:

1. Download the module JSON from the app.
2. Edit the JSON file locally.
3. Replace the corresponding file inside the `data/` folder.
4. Commit and push the change.
5. Refresh the GitHub Pages site.

## Contract workflow

When a contract is created, the app:

- links customer and vehicle
- calculates rental totals
- applies 5% VAT on rental
- creates the invoice
- updates the ledger
- marks the vehicle unavailable
- stores everything locally

## Invoice and receipt workflow

Invoices are generated from the contract data and include:

- company details
- TRN
- rental total
- Salik charges
- Darb charges
- fines
- service fee calculations
- VAT values
- total payable amount

Receipts are created whenever payment is recorded.

## Salik, Darb, and fines

- Salik charges include 5% VAT.
- Darb charges include 5% VAT.
- Traffic fines include a 10% service fee.
- The 10% fine service fee also gets 5% VAT.

If a toll or fine cannot be matched to a rental contract by vehicle and time, the app marks it as unmatched and shows a warning.

## Printable documents

The app includes print-ready views for:

- rental contracts
- invoices
- receipts
- account statements
- vehicle check cards

Use the browser print dialog to save the document as PDF.

## Company details

- **Company**: Premium Car Rental UAE
- **TRN**: 100035111200003
- **Phone**: +971 4 360 9991
- **Email**: contact@pcr.ae
- **Email**: mo@pcr.ae
- **Email**: accounts@pcr.ae

## Local development

Open `index.html` in a browser or serve the folder with any static server.

## Notes

- The project is intentionally framework-free.
- The print workflow uses the browser's built-in print/save as PDF flow.
- PDF generation is handled through print-friendly layouts so the project stays fully static.
