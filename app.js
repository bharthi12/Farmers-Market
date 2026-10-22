(() => {
  const source = window.HARVESTIQ_SOURCE;
  let data = source;
  let illustrative = false;
  let toastTimer;
  const $ = (id) => document.getElementById(id);
  const colors = ["#60966a", "#bfd1b8", "#dcae61", "#7d9eae", "#cf8963", "#a5b78c"];
  const dates = (obj) => Object.keys(obj || {}).filter((d) => Number.isFinite(Number(obj[d]))).sort((a, b) => new Date(a) - new Date(b));
  const latest = (obj) => { const ds = dates(obj); return ds.length ? { date: ds.at(-1), value: Number(obj[ds.at(-1)]) } : null; };
  const allCrops = () => data.markets.flatMap((m) => m.crops.map((c) => ({ ...c, market: m.name })));
  const money = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const number = (n) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: 1 });
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function notify(message) { const node = $("toast"); node.textContent = message; node.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove("show"), 3400); }

  function setupFilters(preferredCrop) {
    const marketFilter = $("market-filter");
    const prevMarket = marketFilter.value || "all";
    marketFilter.innerHTML = `<option value="all">All markets</option>${data.markets.map((m) => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`).join("")}`;
    marketFilter.value = [...marketFilter.options].some((o) => o.value === prevMarket) ? prevMarket : "all";
    const cropFilter = $("crop-filter");
    const selected = preferredCrop || cropFilter.value;
    const crops = [...new Map(allCrops().map((c) => [c.name, c])).values()].sort((a, b) => a.name.localeCompare(b.name));
    cropFilter.innerHTML = crops.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
    cropFilter.value = crops.some((c) => c.name === selected) ? selected : crops[0]?.name || "";
  }

  function renderSummary() {
    const crops = allCrops();
    const groups = new Set(crops.map((c) => c.group));
    const prices = crops.map((c) => latest(c.prices)?.value).filter(Number.isFinite);
    const arrivals = crops.map((c) => latest(c.arrivals)?.value).filter(Number.isFinite);
    const latestTotal = arrivals.reduce((sum, n) => sum + n, 0);
    $("market-count").textContent = data.markets.length;
    $("commodity-count").textContent = new Set(crops.map((c) => c.name)).size;
    $("market-note").textContent = `Across ${new Set(data.markets.map((m) => m.district)).size} district${new Set(data.markets.map((m) => m.district)).size === 1 ? "" : "s"}`;
    $("commodity-note").textContent = `Across ${groups.size} crop group${groups.size === 1 ? "" : "s"}`;
    $("average-price").innerHTML = prices.length ? `${money(prices.reduce((a, b) => a + b, 0) / prices.length)}<span class="unit">/qtl</span>` : "—";
    $("arrival-total").innerHTML = `${number(latestTotal)}<span class="unit"> MT</span>`;
    $("donut-total").textContent = number(latestTotal);
    $("report-date").textContent = data.reportDate;
    $("updated-at").textContent = illustrative ? "Illustrative figures for demo only · not live mandi prices" : "Data shown as reported in the source workbook";
    $("source-strip").classList.toggle("demo-mode", illustrative);
    $("source-copy").textContent = illustrative ? "Illustrative sample figures · not from the uploaded workbook or live market feeds" : `Showing figures from ${data.sourceName || "your imported workbook"}`;
    $("demo-toggle").innerHTML = illustrative ? "Back to workbook data <span>→</span>" : "Try illustrative vegetable demo <span>→</span>";
    $("arrival-note").textContent = illustrative ? "Illustrative sample arrivals · not live data" : "Latest reported arrival per commodity";
  }

  function renderTrend() {
    const chosenMarket = $("market-filter").value;
    const selectedCrop = $("crop-filter").value;
    const rows = allCrops().filter((c) => c.name === selectedCrop && (chosenMarket === "all" || c.market === chosenMarket) && dates(c.prices).length);
    const node = $("trend-chart");
    const legend = $("chart-legend");
    if (!rows.length) { node.innerHTML = `<div class="chart-empty">No price history is available for this crop in the selected market.</div>`; legend.innerHTML = ""; return; }
    const dateKeys = [...new Set(rows.flatMap((r) => dates(r.prices)))].sort((a, b) => new Date(a) - new Date(b));
    const values = rows.flatMap((r) => dates(r.prices).map((d) => r.prices[d]));
    const msp = rows.find((r) => Number.isFinite(r.msp))?.msp;
    const minValue = Math.min(...values, ...(Number.isFinite(msp) ? [msp] : []));
    const maxValue = Math.max(...values, ...(Number.isFinite(msp) ? [msp] : []));
    const pad = Math.max(150, (maxValue - minValue) * .22);
    const lo = Math.max(0, Math.floor((minValue - pad) / 500) * 500), hi = Math.ceil((maxValue + pad) / 500) * 500 || 1000;
    const width = Math.max(node.clientWidth, 440), height = 159, left = 43, right = 11, top = 8, bottom = 31;
    const y = (v) => top + (height - top - bottom) * (1 - (v - lo) / (hi - lo || 1));
    const x = (i) => dateKeys.length <= 1 ? (left + width - right) / 2 : left + (width - left - right) * i / (dateKeys.length - 1);
    let svg = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="presentation">`;
    for (let t = 0; t <= 4; t++) { const val = lo + (hi - lo) * t / 4, yy = y(val); svg += `<line x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}" stroke="#edf0ea" stroke-width="1"/><text x="${left - 7}" y="${yy + 3}" text-anchor="end" fill="#a2aaa1" font-size="8">${money(val)}</text>`; }
    if (Number.isFinite(msp)) svg += `<line x1="${left}" y1="${y(msp)}" x2="${width - right}" y2="${y(msp)}" stroke="#b5c8af" stroke-width="1.5" stroke-dasharray="4 4"><title>MSP ${money(msp)}/qtl</title></line>`;
    rows.forEach((r, seriesIndex) => {
      const points = dates(r.prices).map((d) => ({ date: d, value: r.prices[d], index: dateKeys.indexOf(d) }));
      const color = colors[seriesIndex % colors.length];
      if (points.length > 1) svg += `<polyline points="${points.map((p) => `${x(p.index)},${y(p.value)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      points.forEach((p) => { svg += `<circle cx="${x(p.index)}" cy="${y(p.value)}" r="3.5" fill="#fff" stroke="${color}" stroke-width="2"><title>${escapeHtml(r.market)} · ${p.date}: ${money(p.value)}/qtl</title></circle>`; });
    });
    dateKeys.forEach((d, i) => svg += `<text x="${x(i)}" y="${height - 8}" text-anchor="middle" fill="#879187" font-size="8">${escapeHtml(d.replace(/ 2026$/, ""))}</text>`);
    svg += `</svg>`; node.innerHTML = svg;
    legend.innerHTML = rows.map((r, i) => `<span><i class="legend-swatch" style="background:${colors[i % colors.length]}"></i>${escapeHtml(r.market)}</span>`).join("") + (Number.isFinite(msp) ? `<span><i class="legend-swatch pale-swatch"></i>MSP ${money(msp)}</span>` : "");
    const note = dateKeys.length < 2 ? "Only one price date is reported; more observations are needed to show a trend." : `${dateKeys.length} reported dates · Prices in ₹ per quintal`;
    $("trend-caption").textContent = note;
    node.setAttribute("aria-label", rows.map((r) => `${r.market}: ${dates(r.prices).map((d) => `${d} ${money(r.prices[d])}`).join(", ")}`).join("; "));
  }

  function renderArrivals() {
    const totals = new Map();
    allCrops().forEach((c) => { const a = latest(c.arrivals); if (a) totals.set(c.group, (totals.get(c.group) || 0) + a.value); });
    const rows = [...totals].sort((a, b) => b[1] - a[1]);
    const total = rows.reduce((s, r) => s + r[1], 0);
    const segments = []; let cursor = 0;
    rows.forEach(([group, value], i) => { const end = cursor + (total ? value / total * 360 : 0); segments.push(`${colors[i % colors.length]} ${cursor}deg ${end}deg`); cursor = end; });
    $("arrival-chart").style.background = rows.length ? `conic-gradient(${segments.join(",")})` : "#edf0ea";
    $("arrival-chart").setAttribute("aria-label", rows.map(([g, v]) => `${g} ${number(v)} metric tonnes`).join(", "));
    $("arrival-legend").innerHTML = rows.map(([g, v], i) => `<div class="legend-item"><i class="legend-color" style="background:${colors[i % colors.length]}"></i><span>${escapeHtml(g)}</span><strong>${number(v)}</strong></div>`).join("") || `<div class="legend-item">No arrival data reported</div>`;
  }

  function renderRecommendation() {
    const selected = $("crop-filter").value;
    const offers = allCrops().filter((c) => c.name === selected).map((c) => { const p = latest(c.prices); return p ? { ...c, ...p } : null; }).filter(Boolean).sort((a, b) => b.value - a.value);
    const node = $("recommendation-content");
    if (!offers.length) { node.innerHTML = `<div class="empty-rec"><span class="empty-icon">◌</span><div><strong>No comparable quote in this report</strong><p>This crop has no reported price in the selected data. Import another market report or try the illustrative demo to preview a cross-market comparison.</p></div></div>`; return; }
    if (offers.length === 1) {
      const o = offers[0];
      node.innerHTML = `<div class="rec-main"><div class="crop-icon">${o.group === "Vegetables" ? "🍅" : "🌾"}</div><div><small>SELECTED CROP</small><strong>${escapeHtml(o.name)}</strong><span>${escapeHtml(o.group)} · ${o.date}</span></div></div><div class="rec-market"><small>ONLY MARKET WITH A QUOTE</small><div class="market-winner"><span class="market-pin">⌖</span><strong>${escapeHtml(o.market)}</strong></div><p>Observed price ${money(o.value)} / quintal</p></div><div class="rec-spread"><small>MARKET COMPARISON</small><strong>Not available</strong><span>Only one market reports this crop</span></div><div class="recommendation-note"><b>Limited comparison:</b> this is the sole market quote for ${escapeHtml(o.name)} in the workbook. Compare transport costs and check today's rate before choosing where to sell.</div>`;
      return;
    }
    const best = offers[0], low = offers.at(-1), diff = best.value - low.value, pct = low.value ? diff / low.value * 100 : 0;
    const isVeg = best.group === "Vegetables";
    const icon = best.name.toLowerCase().includes("tomato") ? "🍅" : best.name.toLowerCase().includes("onion") ? "🧅" : best.name.toLowerCase().includes("cauliflower") ? "🥦" : "🌾";
    const dateLabel = best.date === low.date ? best.date : `${best.date} (latest for each market)`;
    node.innerHTML = `<div class="rec-main"><div class="crop-icon">${icon}</div><div><small>SELECTED CROP</small><strong>${escapeHtml(best.name)}</strong><span>${escapeHtml(best.group)} · ${escapeHtml(dateLabel)}</span></div></div><div class="rec-market"><small>HIGHEST OBSERVED PRICE</small><div class="market-winner"><span class="market-pin">⌖</span><strong>${escapeHtml(best.market)}</strong><em>TOP QUOTE</em></div><p>${money(best.value)} / quintal · ${best.date}</p></div><div class="rec-spread"><small>PRICE GAP</small><strong>+${money(diff)}</strong><span>${pct.toFixed(1)}% above ${escapeHtml(low.market)}</span></div><div class="recommendation-note"><b>Market signal:</b> ${escapeHtml(best.market)} has the highest observed quote for ${escapeHtml(best.name)} (${money(best.value)}/qtl) among ${offers.length} markets. ${isVeg ? "Freshness, travel time, and unsold stock can change the best choice." : "Check grade, fees, and transport costs before deciding."} These are indicative comparisons, not a guaranteed sale price.${illustrative ? " All figures here are illustrative demo values." : ""}</div>`;
  }

  function renderAll(preferredCrop) { setupFilters(preferredCrop); renderSummary(); renderTrend(); renderArrivals(); renderRecommendation(); }

  function parseDateFromHeader(value) {
    const s = String(value || "").replace(/,/g, "").trim();
    const match = s.match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
    if (!match) return null;
    const d = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
    return Number.isNaN(d.valueOf()) ? null : `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en-GB", { month: "short" })} ${d.getFullYear()}`;
  }
  function cleanNum(v) { if (v === null || v === undefined || v === "" || String(v).trim() === "-") return null; const n = Number(String(v).replace(/[,₹]/g, "")); return Number.isFinite(n) ? n : null; }
  function normalizeWorkbook(workbook, filename) {
    const markets = [];
    for (const sheet of workbook.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1, defval: null, raw: true });
      const h = rows.findIndex((r) => String(r?.[0] || "").toLowerCase().includes("commodity group") && String(r?.[1] || "").toLowerCase().includes("commodity"));
      if (h < 0) continue;
      const title = String(rows.slice(0, h).map((r) => r?.[0]).filter(Boolean).join(" "));
      const titleMarket = title.match(/report\s*\([^)]*\)\s*([^,]+?)(?:\s+\w+\s*)?$/i)?.[1]?.trim() || sheet;
      const headings = rows[h]; const priceCols = []; const arrivalCols = [];
      headings.forEach((header, i) => { const d = parseDateFromHeader(header); const text = String(header || "").toLowerCase(); if (d && text.includes("price")) priceCols.push([i, d]); if (d && text.includes("arrival")) arrivalCols.push([i, d]); });
      const crops = [];
      for (const row of rows.slice(h + 1)) {
        if (!row?.[1]) continue;
        const prices = {}, arrivals = {};
        priceCols.forEach(([i, d]) => { const n = cleanNum(row[i]); if (n !== null) prices[d] = n; });
        arrivalCols.forEach(([i, d]) => { const n = cleanNum(row[i]); if (n !== null) arrivals[d] = n; });
        crops.push({ group: String(row[0] || "Other"), name: String(row[1]), msp: cleanNum(row[2]), prices, arrivals });
      }
      markets.push({ name: titleMarket, district: "Imported", crops });
    }
    if (!markets.length) throw new Error("No market report tables were found. Expected a row with Commodity Group and Commodity headers.");
    const dateCandidate = [...markets.flatMap((m) => m.crops.flatMap((c) => dates(c.prices)))].sort((a, b) => new Date(a) - new Date(b)).at(-1);
    return { reportDate: dateCandidate || "Imported report", sourceName: filename, markets };
  }
  async function ensureXlsx() {
    if (window.XLSX) return;
    await new Promise((resolve, reject) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; s.onload = resolve; s.onerror = () => reject(new Error("The spreadsheet reader could not load. Connect to the internet and try again.")); document.head.appendChild(s); });
  }
  async function readCsv(file) {
    const text = await file.text();
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) { const ch = text[i]; if (quoted && ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = !quoted; else if (ch === "," && !quoted) { row.push(cell); cell = ""; } else if ((ch === "\n" || ch === "\r") && !quoted) { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += ch; }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const headerIndex = rows.findIndex((r) => String(r?.[0] || "").toLowerCase().includes("commodity group"));
    if (headerIndex < 0) throw new Error("No market report table was found in the CSV.");
    const headers = rows[headerIndex], priceCols = [], arrivalCols = [];
    headers.forEach((v, i) => { const d = parseDateFromHeader(v), t = String(v || "").toLowerCase(); if (d && t.includes("price")) priceCols.push([i, d]); if (d && t.includes("arrival")) arrivalCols.push([i, d]); });
    const crops = rows.slice(headerIndex + 1).filter((r) => r[1]).map((r) => { const prices = {}, arrivals = {}; priceCols.forEach(([i, d]) => { const n = cleanNum(r[i]); if (n !== null) prices[d] = n; }); arrivalCols.forEach(([i, d]) => { const n = cleanNum(r[i]); if (n !== null) arrivals[d] = n; }); return { group: r[0] || "Other", name: r[1], msp: cleanNum(r[2]), prices, arrivals }; });
    if (!crops.length) throw new Error("The CSV table has no commodity rows.");
    const ds = crops.flatMap((c) => dates(c.prices)).sort((a, b) => new Date(a) - new Date(b));
    return { reportDate: ds.at(-1) || "Imported report", sourceName: file.name, markets: [{ name: "Imported market", district: "Imported", crops }] };
  }

  $("market-filter").addEventListener("change", () => { renderTrend(); });
  $("crop-filter").addEventListener("change", () => { renderTrend(); renderRecommendation(); });
  $("demo-toggle").addEventListener("click", () => { const selected = $("crop-filter").value; illustrative = !illustrative; data = illustrative ? window.HARVESTIQ_ILLUSTRATIVE : source; renderAll(illustrative ? "Tomato" : selected); });
  $("file-input").addEventListener("change", async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      let imported;
      if (file.name.toLowerCase().endsWith(".csv")) imported = await readCsv(file);
      else { await ensureXlsx(); const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false }); imported = normalizeWorkbook(wb, file.name); }
      data = imported; illustrative = false; renderAll(); notify(`Loaded ${imported.markets.length} market sheet${imported.markets.length === 1 ? "" : "s"} from ${file.name}`);
    } catch (err) { notify(err.message || "Could not read this file."); }
    event.target.value = "";
  });
  window.addEventListener("resize", () => { clearTimeout(window.__harvestResize); window.__harvestResize = setTimeout(renderTrend, 100); });
  renderAll(allCrops().some((c) => c.name === "Tomato") ? "Tomato" : undefined);
})();
