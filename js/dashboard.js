import { initAnonymousAuth, loadAll } from "./firebase-service.js?v=20260627f";
import { mountLayout } from "./layout.js?v=20260627f";
import { $, money, num, esc, badge, setLoading, daysBetween, lineChart } from "./ui.js";
const user = await initAnonymousAuth();

const content = `
<div class="grid cols4">
  <article class="card kpi"><span>Ventas del mes</span><strong id="kSales">$0</strong><small>Total vendido</small></article>
  <article class="card kpi"><span>Ganancia estimada</span><strong id="kProfit">$0</strong><small>Venta menos precio compra</small></article>
  <article class="card kpi"><span>Deuda pendiente</span><strong id="kDebt">$0</strong><small>Saldo por cobrar</small></article>
  <article class="card kpi"><span>Productos a reponer</span><strong id="kReponer">0</strong><small>Bajo stock o sin stock</small></article>
</div>
<div class="grid cols4">
  <article class="card kpi"><span>Stock valorizado</span><strong id="kStock">$0</strong><small>Precio compra x stock</small></article>
  <article class="card kpi"><span>Ticket promedio</span><strong id="kTicket">$0</strong><small>Promedio por venta</small></article>
  <article class="card kpi"><span>Pacientes deudores</span><strong id="kDebtors">0</strong><small>Con saldo pendiente</small></article>
  <article class="card kpi"><span>Stock parado</span><strong id="kStuck">0</strong><small>Sin ventas recientes</small></article>
</div>
<div class="grid cols2">
  <section class="card"><h2>Alertas inteligentes</h2><div class="alert-list" id="alerts"></div></section>
  <section class="card chart"><h2>Ventas vs ganancia</h2><div id="chart"></div><p class="help">Línea oscura: ventas. Línea verde: ganancia estimada.</p></section>
</div>
<div class="grid cols2">
  <section class="card"><h2>Top productos por ganancia</h2><div class="tablewrap"><table><thead><tr><th>Producto</th><th>Unidades</th><th>Ganancia</th></tr></thead><tbody id="topProfit"></tbody></table></div></section>
  <section class="card"><h2>Top productos más vendidos</h2><div class="tablewrap"><table><thead><tr><th>Producto</th><th>Unidades</th><th>Total vendido</th></tr></thead><tbody id="topUnits"></tbody></table></div></section>
</div>
<div class="grid cols2">
  <section class="card"><h2>Principales deudores</h2><div class="tablewrap"><table><thead><tr><th>Paciente</th><th>Saldo</th><th>Días</th></tr></thead><tbody id="debtorsRows"></tbody></table></div></section>
  <section class="card"><h2>Productos con stock parado</h2><div class="tablewrap"><table><thead><tr><th>Producto</th><th>Stock</th><th>Última venta</th></tr></thead><tbody id="stuckRows"></tbody></table></div></section>
</div>`;
mountLayout({active:"dashboard",title:"Dashboard",subtitle:"Vista gerencial: ventas, ganancia, deuda, reposición y stock parado.",content,uid:user.uid});
document.getElementById("refreshBtn").onclick=render;
await render();

async function render(){
  setLoading(true,"Cargando dashboard...");
  const d = await loadAll();
  setLoading(false);
  const month = new Date().toISOString().slice(0,7);
  const validSales = d.sales.filter(s=>!s.canceled);
  const salesMonth = validSales.filter(s=>String(s.date||"").slice(0,7)===month);
  const stockValue = d.products.reduce((a,p)=>a+num(p.stock)*num(p.purchasePrice||p.resalePrice),0);
  const debt = validSales.reduce((a,s)=>a+num(s.balance),0);
  const debtPatients = new Set(validSales.filter(s=>num(s.balance)>0).map(s=>s.patientId)).size;
  const monthProfit = salesMonth.reduce((acc,s)=>acc+(s.items||[]).reduce((a,i)=>a+num(i.quantity)*(num(i.unitPrice)-num(i.costPrice)),0),0);
  const reponer = d.products.filter(p=>p.active!==false && num(p.stock)<=num(p.minStock||0));
  const noStock = d.products.filter(p=>p.active!==false && num(p.stock)<=0);
  const avgTicket = validSales.length ? validSales.reduce((a,s)=>a+num(s.total),0)/validSales.length : 0;
  const productStats = statsByProduct(validSales);
  const stuck = stuckProducts(d.products, validSales);

  $("kSales").textContent=money.format(salesMonth.reduce((a,s)=>a+num(s.total),0));
  $("kProfit").textContent=money.format(monthProfit);
  $("kDebt").textContent=money.format(debt);
  $("kReponer").textContent=reponer.length;
  $("kStock").textContent=money.format(stockValue);
  $("kTicket").textContent=money.format(avgTicket);
  $("kDebtors").textContent=debtPatients;
  $("kStuck").textContent=stuck.length;

  $("alerts").innerHTML = [
    noStock.length ? alert("Productos sin stock", `${noStock.length} productos no tienen stock disponible.`, "SIN STOCK") : "",
    reponer.length ? alert("Reposición necesaria", `${reponer.length} productos están en stock mínimo o por debajo.`, "BAJO STOCK") : "",
    debt ? alert("Deuda pendiente", `Hay ${money.format(debt)} pendientes de cobro.`, "PENDIENTE") : "",
    stuck.length ? alert("Stock parado", `${stuck.length} productos tienen stock y no se vendieron recientemente.`, "INFO") : ""
  ].filter(Boolean).join("") || `<div class="empty">Sin alertas importantes.</div>`;

  $("chart").innerHTML = lineChart(chartPoints(validSales));
  $("topProfit").innerHTML = productStats.sort((a,b)=>b.profit-a.profit).slice(0,8).map(r=>`<tr><td>${esc(r.product)}</td><td>${r.units}</td><td>${money.format(r.profit)}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">Sin datos.</td></tr>`;
  $("topUnits").innerHTML = productStats.sort((a,b)=>b.units-a.units).slice(0,8).map(r=>`<tr><td>${esc(r.product)}</td><td>${r.units}</td><td>${money.format(r.total)}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">Sin datos.</td></tr>`;
  $("debtorsRows").innerHTML = validSales.filter(s=>num(s.balance)>0).sort((a,b)=>num(b.balance)-num(a.balance)).slice(0,8).map(s=>`<tr><td>${esc(s.patientName)}</td><td>${money.format(num(s.balance))}</td><td>${daysBetween(s.date)}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">Sin deudores.</td></tr>`;
  $("stuckRows").innerHTML = stuck.slice(0,8).map(p=>`<tr><td>${esc(p.name)}</td><td>${num(p.stock)}</td><td>${p.last || "Sin ventas"}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">Sin stock parado.</td></tr>`;
}
function alert(title, text, status){return `<div class="alert"><div><strong>${title}</strong><span class="help">${text}</span></div>${badge(status)}</div>`}
function statsByProduct(sales){const map={};sales.forEach(s=>(s.items||[]).forEach(i=>{map[i.productId]??={product:i.productName,units:0,total:0,profit:0};map[i.productId].units+=num(i.quantity);map[i.productId].total+=num(i.quantity)*num(i.unitPrice);map[i.productId].profit+=num(i.quantity)*(num(i.unitPrice)-num(i.costPrice));}));return Object.values(map)}
function chartPoints(sales){const map={};sales.forEach(s=>{const key=String(s.date).slice(5,10);map[key]??={label:key,sales:0,profit:0};map[key].sales+=num(s.total);map[key].profit+=(s.items||[]).reduce((a,i)=>a+num(i.quantity)*(num(i.unitPrice)-num(i.costPrice)),0)});return Object.values(map).slice(-12)}
function stuckProducts(products,sales){return products.filter(p=>p.active!==false&&num(p.stock)>0).map(p=>{let lastSale=null;sales.forEach(s=>(s.items||[]).forEach(i=>{if(i.productId===p.id && (!lastSale||new Date(s.date)>new Date(lastSale)))lastSale=s.date;}));return {...p,last:lastSale?new Date(lastSale).toLocaleDateString("es-AR"):null,days:lastSale?daysBetween(lastSale):9999}}).filter(p=>p.days>60).sort((a,b)=>b.days-a.days)}
