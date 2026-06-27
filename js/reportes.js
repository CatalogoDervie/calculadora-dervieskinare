import { initAnonymousAuth, loadReportingData } from "./firebase-service.js?v=20260627b";
import { mountLayout } from "./layout.js?v=20260627b";
import { $, money, num, round, esc, toast, setLoading, csv } from "./ui.js";

const user = await initAnonymousAuth();
const DAY = 86400000;

const content = `
<section class="card report-toolbar">
  <div>
    <span class="access-label">Informe gerencial · acceso aún no restringido</span>
    <h2>Período analizado</h2>
    <p class="help">Los indicadores se comparan contra el período anterior de igual duración.</p>
  </div>
  <div class="quick-periods" aria-label="Períodos rápidos">
    <button class="btn period" data-days="30">30 días</button>
    <button class="btn period" data-days="90">90 días</button>
    <button class="btn period" data-period="month">Este mes</button>
    <button class="btn period" data-period="year">Este año</button>
  </div>
  <div class="formgrid form3 report-filters">
    <div><label>Desde</label><input id="from" type="date"></div>
    <div><label>Hasta</label><input id="to" type="date"></div>
    <div><label>&nbsp;</label><button class="btn ghost block" id="exportBtn">Exportar resumen CSV</button></div>
  </div>
</section>

<section class="report-note" id="periodNote"></section>
<section class="grid cols4" id="kpis"></section>

<section class="grid cols2 report-primary">
  <article class="card">
    <div class="section-head"><div><span class="section-kicker">Evolución</span><h2>Ventas por semana</h2></div><span class="help" id="trendTotal"></span></div>
    <div class="report-chart" id="trend"></div>
  </article>
  <article class="card">
    <div class="section-head"><div><span class="section-kicker">Prioridades</span><h2>Atención de la médica</h2></div><span class="badge blue" id="actionCount">0 alertas</span></div>
    <div class="decision-list" id="actions"></div>
  </article>
</section>

<section class="card">
  <div class="section-head"><div><span class="section-kicker">Rentabilidad</span><h2>Productos que impulsan el resultado</h2></div><span class="help">Venta neta después del descuento proporcional.</span></div>
  <div class="tablewrap"><table><thead><tr><th>Producto</th><th>Unidades</th><th>Venta neta</th><th>Ganancia</th><th>Margen</th><th>Participación</th></tr></thead><tbody id="products"></tbody></table></div>
</section>

<section class="grid cols2">
  <article class="card">
    <div class="section-head"><div><span class="section-kicker">Cobranza</span><h2>Deuda por antigüedad</h2></div><span class="help">Foto actual, no limitada por el período.</span></div>
    <div class="aging-grid" id="aging"></div>
    <div class="tablewrap compact-table"><table><thead><tr><th>Paciente</th><th>Saldo</th><th>Antigüedad</th><th>Ventas</th></tr></thead><tbody id="debtors"></tbody></table></div>
  </article>
  <article class="card">
    <div class="section-head"><div><span class="section-kicker">Inventario</span><h2>Rotación y cobertura</h2></div><span class="help">Cobertura estimada según ventas del período.</span></div>
    <div class="tablewrap compact-table"><table><thead><tr><th>Producto</th><th>Stock</th><th>Vendidas</th><th>Cobertura</th><th>Estado</th></tr></thead><tbody id="inventory"></tbody></table></div>
  </article>
</section>

<section class="grid cols2">
  <article class="card">
    <div class="section-head"><div><span class="section-kicker">Control</span><h2>Calidad de los datos</h2></div><span class="badge" id="qualityBadge"></span></div>
    <div class="quality-list" id="quality"></div>
  </article>
  <article class="card">
    <div class="section-head"><div><span class="section-kicker">Trazabilidad</span><h2>Últimos movimientos del período</h2></div><span class="help">Hasta 20 movimientos recientes.</span></div>
    <div class="tablewrap compact-table"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Cantidad</th><th>Stock</th></tr></thead><tbody id="movements"></tbody></table></div>
  </article>
</section>`;

mountLayout({
  active: "reportes",
  title: "Reporte para dirección médica",
  subtitle: "Seguimiento de ventas, rentabilidad, cobranza, inventario y calidad de datos.",
  content,
  uid: user.uid
});

let all = {};
document.getElementById("refreshBtn").onclick = load;
$("from").onchange = draw;
$("to").onchange = draw;
$("exportBtn").onclick = exportSummary;
document.querySelectorAll(".period").forEach(button => button.onclick = () => setQuickPeriod(button));

setLastDays(30);
await load();

async function load() {
  setLoading(true, "Preparando informe gerencial...");
  try {
    all = await loadReportingData();
    draw();
  } catch (error) {
    toast(error.message || "No se pudieron cargar los datos del informe.", "bad");
  } finally {
    setLoading(false);
  }
}

function dateOnly(value) {
  const raw = String(value || "");
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function localDate(value) {
  const clean = dateOnly(value);
  return clean ? new Date(`${clean}T12:00:00`) : null;
}

function formatDate(value) {
  const date = localDate(value);
  return date && !Number.isNaN(date.valueOf()) ? date.toLocaleDateString("es-AR") : "Sin fecha";
}

function period() {
  const from = $("from").value;
  const to = $("to").value;
  const fromDate = localDate(from);
  const toDate = localDate(to);
  const days = fromDate && toDate ? Math.max(1, Math.round((toDate - fromDate) / DAY) + 1) : 1;
  const previousTo = new Date(fromDate - DAY);
  const previousFrom = new Date(previousTo - (days - 1) * DAY);
  return { from, to, days, previousFrom: iso(previousFrom), previousTo: iso(previousTo) };
}

function iso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setLastDays(days) {
  const to = new Date();
  const from = new Date(to - (days - 1) * DAY);
  $("from").value = iso(from);
  $("to").value = iso(to);
}

function setQuickPeriod(button) {
  const now = new Date();
  if (button.dataset.days) setLastDays(Number(button.dataset.days));
  if (button.dataset.period === "month") {
    $("from").value = iso(new Date(now.getFullYear(), now.getMonth(), 1));
    $("to").value = iso(now);
  }
  if (button.dataset.period === "year") {
    $("from").value = `${now.getFullYear()}-01-01`;
    $("to").value = iso(now);
  }
  draw();
}

function within(value, from, to) {
  const date = dateOnly(value);
  return Boolean(date && date >= from && date <= to);
}

function validSales(from, to) {
  return (all.sales || []).filter(s => !s.canceled && within(s.date, from, to));
}

function saleMetrics(sales) {
  let revenue = 0, units = 0, knownRevenue = 0, profit = 0, completeCostSales = 0;
  const productMap = new Map();

  sales.forEach(sale => {
    const items = sale.items || [];
    const total = round(num(sale.total));
    const grossLines = items.reduce((sum, item) => sum + num(item.quantity) * num(item.unitPrice), 0);
    const hasCompleteCosts = items.length > 0 && items.every(item => num(item.costPrice) > 0);
    const totalCost = items.reduce((sum, item) => sum + num(item.quantity) * num(item.costPrice), 0);
    revenue += total;
    units += items.reduce((sum, item) => sum + num(item.quantity), 0);
    if (hasCompleteCosts) {
      knownRevenue += total;
      profit += total - totalCost;
      completeCostSales++;
    }

    items.forEach(item => {
      const key = item.productId || item.productName;
      const quantity = num(item.quantity);
      const lineGross = quantity * num(item.unitPrice);
      const netRevenue = grossLines > 0 ? total * lineGross / grossLines : 0;
      const costKnown = num(item.costPrice) > 0;
      const row = productMap.get(key) || { productId: item.productId || "", product: item.productName || "Sin nombre", units: 0, revenue: 0, profit: 0, knownRevenue: 0 };
      row.units += quantity;
      row.revenue += netRevenue;
      if (costKnown) {
        row.knownRevenue += netRevenue;
        row.profit += netRevenue - quantity * num(item.costPrice);
      }
      productMap.set(key, row);
    });
  });

  return {
    revenue: round(revenue),
    units: round(units),
    profit: round(profit),
    knownRevenue: round(knownRevenue),
    coverage: revenue > 0 ? knownRevenue / revenue : null,
    completeCostSales,
    count: sales.length,
    ticket: sales.length ? round(revenue / sales.length) : 0,
    margin: knownRevenue > 0 ? profit / knownRevenue : 0,
    products: [...productMap.values()]
  };
}

function purchaseSpend(from, to) {
  return round((all.purchases || []).filter(p => within(p.date, from, to)).reduce((sum, p) => sum + num(p.total), 0));
}

function comparison(current, previous) {
  if (!previous && !current) return "Sin variación";
  if (!previous) return "Sin base anterior";
  const change = (current - previous) / Math.abs(previous);
  const sign = change > 0 ? "+" : "";
  return `${sign}${(change * 100).toFixed(1)}% vs. período anterior`;
}

function kpi(label, value, detail, tone = "") {
  return `<article class="card kpi report-kpi ${tone}"><span>${esc(label)}</span><strong>${value}</strong><small>${esc(detail)}</small></article>`;
}

function draw() {
  if (!all.sales) return;
  const p = period();
  if (!p.from || !p.to || p.from > p.to) return toast("El rango de fechas no es válido.", "bad");

  const sales = validSales(p.from, p.to);
  const previousSales = validSales(p.previousFrom, p.previousTo);
  const current = saleMetrics(sales);
  const previous = saleMetrics(previousSales);
  const purchases = purchaseSpend(p.from, p.to);
  const debt = debtSnapshot();
  const stockValue = round((all.products || []).filter(x => x.active !== false).reduce((sum, product) => sum + num(product.stock) * num(product.purchasePrice || product.resalePrice), 0));

  $("periodNote").innerHTML = `<strong>${formatDate(p.from)} al ${formatDate(p.to)}</strong><span>${p.days} días · comparación: ${formatDate(p.previousFrom)} al ${formatDate(p.previousTo)}</span>`;
  $("kpis").innerHTML = [
    kpi("Facturación", money.format(current.revenue), comparison(current.revenue, previous.revenue)),
    kpi("Ganancia bruta", money.format(current.profit), current.coverage == null ? "Sin ventas para evaluar costos" : `${Math.round(current.coverage * 100)}% de ventas con costo completo`, current.coverage != null && current.coverage < .9 ? "needs-review" : ""),
    kpi("Margen bruto", `${(current.margin * 100).toFixed(1)}%`, comparison(current.margin, previous.margin)),
    kpi("Ticket promedio", money.format(current.ticket), comparison(current.ticket, previous.ticket)),
    kpi("Ventas / unidades", `${current.count} / ${current.units}`, comparison(current.count, previous.count)),
    kpi("Compras del período", money.format(purchases), "Egreso registrado en compras"),
    kpi("Deuda pendiente", money.format(debt.total), `${debt.patients.length} pacientes · foto actual`, debt.over60 > 0 ? "needs-review" : ""),
    kpi("Stock valorizado", money.format(stockValue), "Costo de compra × stock actual")
  ].join("");

  drawTrend(sales, p);
  drawProducts(current.products, current.revenue);
  drawDebt(debt);
  const inventory = inventoryRows(current.products, p.days);
  drawInventory(inventory);
  const quality = qualityChecks(sales, current);
  drawQuality(quality);
  drawActions(debt, inventory, quality, current.products);
  drawMovements(p);
}

function drawTrend(sales, p) {
  const buckets = new Map();
  for (let cursor = localDate(p.from); cursor <= localDate(p.to); cursor = new Date(cursor.valueOf() + 7 * DAY)) {
    const key = iso(cursor);
    buckets.set(key, { label: formatDate(key), total: 0 });
  }
  sales.forEach(sale => {
    const offset = Math.floor((localDate(sale.date) - localDate(p.from)) / DAY);
    const start = new Date(localDate(p.from).valueOf() + Math.floor(offset / 7) * 7 * DAY);
    const key = iso(start);
    const bucket = buckets.get(key);
    if (bucket) bucket.total += num(sale.total);
  });
  const rows = [...buckets.values()];
  const max = Math.max(...rows.map(row => row.total), 1);
  $("trend").innerHTML = rows.map(row => `<div class="chart-row"><span>${esc(row.label)}</span><div class="chart-track"><i style="width:${Math.max(2, row.total / max * 100)}%"></i></div><strong>${money.format(row.total)}</strong></div>`).join("") || `<div class="empty">Sin ventas en el período.</div>`;
  $("trendTotal").textContent = `${rows.length} semanas`;
}

function drawProducts(products, totalRevenue) {
  const rows = [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 12);
  $("products").innerHTML = rows.map(row => {
    const margin = row.knownRevenue > 0 ? row.profit / row.knownRevenue : null;
    const participation = totalRevenue > 0 ? row.revenue / totalRevenue : 0;
    return `<tr><td><strong>${esc(row.product)}</strong>${row.knownRevenue < row.revenue ? `<div class="help bad-text">Costo incompleto</div>` : ""}</td><td>${row.units}</td><td>${money.format(row.revenue)}</td><td>${margin == null ? "Sin dato" : money.format(row.profit)}</td><td>${margin == null ? "—" : `${(margin * 100).toFixed(1)}%`}</td><td><div class="mini-progress"><i style="width:${participation * 100}%"></i></div>${(participation * 100).toFixed(1)}%</td></tr>`;
  }).join("") || `<tr><td colspan="6" class="empty">Sin ventas en el período.</td></tr>`;
}

function debtSnapshot() {
  const map = new Map();
  (all.sales || []).filter(s => !s.canceled && num(s.balance) > 0).forEach(sale => {
    const key = sale.patientId || sale.patientName;
    const saleDate = localDate(sale.date);
    const age = saleDate ? Math.max(0, Math.floor((new Date() - saleDate) / DAY)) : 0;
    const row = map.get(key) || { patient: sale.patientName || "Sin paciente", balance: 0, oldest: 0, sales: 0 };
    row.balance += num(sale.balance);
    row.oldest = Math.max(row.oldest, age);
    row.sales++;
    map.set(key, row);
  });
  const patients = [...map.values()].sort((a, b) => b.balance - a.balance);
  const buckets = [
    { label: "0–7 días", value: patients.filter(x => x.oldest <= 7).reduce((s, x) => s + x.balance, 0), tone: "ok" },
    { label: "8–30 días", value: patients.filter(x => x.oldest > 7 && x.oldest <= 30).reduce((s, x) => s + x.balance, 0), tone: "blue" },
    { label: "31–60 días", value: patients.filter(x => x.oldest > 30 && x.oldest <= 60).reduce((s, x) => s + x.balance, 0), tone: "warn" },
    { label: "+60 días", value: patients.filter(x => x.oldest > 60).reduce((s, x) => s + x.balance, 0), tone: "bad" }
  ];
  return { patients, buckets, total: round(patients.reduce((s, x) => s + x.balance, 0)), over60: buckets[3].value };
}

function drawDebt(debt) {
  $("aging").innerHTML = debt.buckets.map(bucket => `<div class="aging-card ${bucket.tone}"><span>${bucket.label}</span><strong>${money.format(bucket.value)}</strong></div>`).join("");
  $("debtors").innerHTML = debt.patients.slice(0, 10).map(row => `<tr><td>${esc(row.patient)}</td><td><strong>${money.format(row.balance)}</strong></td><td>${row.oldest} días</td><td>${row.sales}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">No hay deuda pendiente.</td></tr>`;
}

function inventoryRows(productStats, days) {
  const sold = new Map(productStats.map(row => [row.productId || row.product, row.units]));
  return (all.products || []).filter(product => product.active !== false).map(product => {
    const units = num(sold.get(product.id) ?? sold.get(product.name));
    const stock = num(product.stock);
    const daily = units / Math.max(days, 1);
    const coverage = daily > 0 ? stock / daily : null;
    let status = "SALUDABLE";
    if (stock <= 0) status = "SIN STOCK";
    else if (stock <= num(product.minStock)) status = "BAJO STOCK";
    else if (!units) status = "SIN ROTACIÓN";
    else if (coverage > 120) status = "SOBRESTOCK";
    return { name: product.name, stock, units, coverage, status };
  }).sort((a, b) => statusWeight(a.status) - statusWeight(b.status) || b.stock - a.stock);
}

function statusWeight(status) {
  return { "SIN STOCK": 0, "BAJO STOCK": 1, "SIN ROTACIÓN": 2, "SOBRESTOCK": 3, "SALUDABLE": 4 }[status] ?? 9;
}

function statusBadge(status) {
  const tone = status === "SALUDABLE" ? "ok" : status === "SOBRESTOCK" || status === "SIN ROTACIÓN" ? "warn" : "bad";
  return `<span class="badge ${tone}">${status}</span>`;
}

function drawInventory(rows) {
  $("inventory").innerHTML = rows.slice(0, 12).map(row => `<tr><td>${esc(row.name)}</td><td>${row.stock}</td><td>${row.units}</td><td>${row.coverage == null ? "Sin consumo" : `${Math.round(row.coverage)} días`}</td><td>${statusBadge(row.status)}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">Sin productos activos.</td></tr>`;
}

function qualityChecks(sales, metrics) {
  const invalidSales = (all.sales || []).filter(s => !dateOnly(s.date));
  const negativeStock = (all.products || []).filter(p => num(p.stock) < 0);
  const productsWithoutCost = (all.products || []).filter(p => p.active !== false && num(p.purchasePrice || p.resalePrice) <= 0);
  const salesWithoutPatient = sales.filter(s => !s.patientId || !s.patientName);
  return [
    { label: "Cobertura de costos en ventas", value: metrics.coverage == null ? "Sin ventas" : `${Math.round(metrics.coverage * 100)}%`, ok: metrics.coverage == null || metrics.coverage >= .9, detail: metrics.coverage == null ? "Todavía no hay ventas en el período para evaluar." : metrics.coverage >= .9 ? "La ganancia tiene buena cobertura." : "La ganancia excluye ventas con costos incompletos." },
    { label: "Productos activos sin costo", value: productsWithoutCost.length, ok: productsWithoutCost.length === 0, detail: "Deben corregirse para medir rentabilidad." },
    { label: "Productos con stock negativo", value: negativeStock.length, ok: negativeStock.length === 0, detail: "Indican una inconsistencia de inventario." },
    { label: "Ventas del período sin paciente", value: salesWithoutPatient.length, ok: salesWithoutPatient.length === 0, detail: "Dificultan el seguimiento de cobranza." },
    { label: "Registros de venta sin fecha válida", value: invalidSales.length, ok: invalidSales.length === 0, detail: "No se incluyen correctamente en períodos." },
    { label: "Carga del informe", value: "Completa", ok: true, detail: `${(all.sales || []).length} ventas y ${(all.stockMovements || []).length} movimientos leídos sin límite de 900.` }
  ];
}

function drawQuality(checks) {
  const issues = checks.filter(check => !check.ok).length;
  $("qualityBadge").className = `badge ${issues ? "warn" : "ok"}`;
  $("qualityBadge").textContent = issues ? `${issues} puntos a revisar` : "Datos consistentes";
  $("quality").innerHTML = checks.map(check => `<div class="quality-row"><span class="quality-icon ${check.ok ? "ok" : "warn"}">${check.ok ? "✓" : "!"}</span><div><strong>${esc(check.label)}</strong><p>${esc(check.detail)}</p></div><b>${esc(check.value)}</b></div>`).join("");
}

function drawActions(debt, inventory, quality, products) {
  const actions = [];
  const criticalStock = inventory.filter(row => ["SIN STOCK", "BAJO STOCK"].includes(row.status)).length;
  const stagnant = inventory.filter(row => row.status === "SIN ROTACIÓN" && row.stock > 0).length;
  const negativeMargin = products.filter(row => row.knownRevenue > 0 && row.profit < 0).length;
  const qualityIssues = quality.filter(check => !check.ok).length;
  if (debt.over60 > 0) actions.push({ tone: "bad", title: "Cobranza vencida", text: `${money.format(debt.over60)} tienen más de 60 días.` });
  if (criticalStock) actions.push({ tone: "bad", title: "Reposición necesaria", text: `${criticalStock} productos están sin stock o debajo del mínimo.` });
  if (negativeMargin) actions.push({ tone: "warn", title: "Venta con margen negativo", text: `${negativeMargin} productos vendieron por debajo de su costo neto.` });
  if (stagnant) actions.push({ tone: "warn", title: "Capital inmovilizado", text: `${stagnant} productos tienen stock pero no rotaron en el período.` });
  if (qualityIssues) actions.push({ tone: "blue", title: "Mejorar datos", text: `${qualityIssues} controles afectan la confianza del análisis.` });
  $("actionCount").textContent = `${actions.length} ${actions.length === 1 ? "alerta" : "alertas"}`;
  $("actions").innerHTML = actions.map(action => `<div class="decision ${action.tone}"><span></span><div><strong>${esc(action.title)}</strong><p>${esc(action.text)}</p></div></div>`).join("") || `<div class="empty success-empty">No hay alertas prioritarias en este momento.</div>`;
}

function drawMovements(p) {
  const movements = (all.stockMovements || []).filter(m => within(m.date, p.from, p.to)).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 20);
  $("movements").innerHTML = movements.map(row => `<tr><td>${formatDate(row.date)}</td><td>${esc(row.type)}</td><td>${esc(row.productName)}</td><td class="${num(row.quantity) < 0 ? "bad-text" : "ok-text"}">${num(row.quantity) > 0 ? "+" : ""}${num(row.quantity)}</td><td>${num(row.resultingStock)}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">Sin movimientos en el período.</td></tr>`;
}

function exportSummary() {
  const p = period();
  const metrics = saleMetrics(validSales(p.from, p.to));
  const debt = debtSnapshot();
  const rows = [
    { Indicador: "Período", Valor: `${p.from} a ${p.to}`, Nota: `${p.days} días` },
    { Indicador: "Facturación", Valor: metrics.revenue, Nota: "Total final después de descuentos" },
    { Indicador: "Ganancia bruta", Valor: metrics.profit, Nota: metrics.coverage == null ? "Sin ventas para evaluar costos" : `${Math.round(metrics.coverage * 100)}% de cobertura de costos` },
    { Indicador: "Margen bruto", Valor: `${(metrics.margin * 100).toFixed(1)}%`, Nota: "Solo ventas con costo completo" },
    { Indicador: "Ticket promedio", Valor: metrics.ticket, Nota: `${metrics.count} ventas` },
    { Indicador: "Unidades vendidas", Valor: metrics.units, Nota: "Productos en ventas válidas" },
    { Indicador: "Compras", Valor: purchaseSpend(p.from, p.to), Nota: "Egreso del período" },
    { Indicador: "Deuda actual", Valor: debt.total, Nota: `${debt.patients.length} pacientes` },
    { Indicador: "Deuda +60 días", Valor: debt.over60, Nota: "Prioridad de cobranza" }
  ];
  csv(`reporte-gerencial-${p.from}-${p.to}.csv`, rows);
}
