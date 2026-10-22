# HarvestIQ demo

A static farmer market insights dashboard built around the sample market report. The default view uses the report's Kalyan, Ulhasnagar, and Mumbai data. The **Try illustrative vegetable demo** control switches to clearly labeled sample prices for Tomato, Onion, and Cauliflower so the cross-market recommendation flow can be previewed; those illustrative figures are not from the workbook or a live market feed.

## Run locally

Open `index.html` in a browser, or serve this folder with any static web server. For example, from this directory run:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

Use **Import data** to load another report. CSV files are read locally. XLSX/XLS import loads the SheetJS reader from jsDelivr the first time, so spreadsheet import needs an internet connection. Data processing happens in the browser; the app has no backend and does not upload the selected file.

## Recommendation notes

The app compares the latest available quote for a crop in each market sheet and highlights the highest observed price. It does not account for travel, fees, quality, spoilage, or sale certainty, so the result is a market signal rather than a guaranteed best net return. The source workbook has only one Tomato market quote, so a reliable cross-market vegetable comparison is not possible from that source alone.
