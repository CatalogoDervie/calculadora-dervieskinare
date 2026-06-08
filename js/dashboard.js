import { initAnonymousAuth, loadAll } from "./firebase-service.js";
import * as FS from "./firebase-service.js";
import { mountLayout } from "./layout.js";
import { $, money, num, round, esc, norm, badge, toast, setLoading, openModal, closeModal, csv, today } from "./ui.js";
const user = await initAnonymousAuth();

const content = `
<div class="grid cols4">
  <article class="card kpi"><span>Stock valorizado</span><strong id="kStock">$0</strong><small>reventa x stock</small></article>
  <article class="card kpi"><span>Productos sin stock</span><strong id="kNoStock">0</strong><small>stock igual a cero</small></article>
  <article class="card kpi"><span>Ventas del mes</span><strong id="kSales">$0</strong><small>total vendido</small></article>
  <article class="card kpi"><span>Deuda pendiente</span><strong id="kDebt">$0</strong><small>saldo de ventas</small></article>
</div>
<div class="grid cols2">
  <section class="card"><h2>Rentabilidad estimada</h2><div class="grid cols3"><div class="kpi"><span>Ganancia clínica</span><strong id="kProfit">$0</strong></div><div class="kpi"><span>Margen</span><strong id="kMargin">0%</strong></div><div class="kpi"><span>Pacientes</span><strong id="kPatients">0</strong></div></div></section>
  <section class="card"><h2>Acciones rápidas</h2><div class="grid"><a class="btn dark" href="ventas.html">Nueva venta</a><a class="btn primary" href="compras.html">Registrar compra</a><a class="btn" href="pacientes.html">Nuevo paciente</a></div></section>
</div>
<div class="grid cols2">
  <section class="card"><h2>Productos críticos</h2><div class="tablewrap"><table><thead><tr><th>Producto</th><th>Stock</th><th>Mín.</th></tr></thead><tbody id="criticalRows"></tbody></table></div></section>
  <section class="card"><h2>Últimas ventas</h2><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Paciente</th><th>Total</th><th>Estado</th></tr></thead><tbody id="salesRows"></tbody></table></div></section>
</div>`;
mountLayout({active:"dashboard",title:"Dashboard",subtitle:"Control general de stock, ventas, deuda y rentabilidad.",content,uid:user.uid});
document.getElementById("refreshBtn").onclick = render;
await render();

async function render(){
  setLoading(true,"Cargando dashboard...");
  const d = await loadAll();
  setLoading(false);
  const month = new Date().toISOString().slice(0,7);
  const validSales = d.sales.filter(s=>!s.canceled);
  const salesMonth = validSales.filter(s=>String(s.date||"").slice(0,7)===month);
  const stockValue = d.products.reduce((a,p)=>a+num(p.stock)*num(p.resalePrice),0);
  const debt = validSales.reduce((a,s)=>a+num(s.balance),0);
  let revenue=0, cost=0;
  validSales.forEach(s=>(s.items||[]).forEach(i=>{ revenue+=num(i.quantity)*num(i.unitPrice); cost+=num(i.quantity)*num(i.costPrice); }));
  const profit = revenue-cost;
  $("kStock").textContent=money.format(stockValue);
  $("kNoStock").textContent=d.products.filter(p=>p.active!==false&&num(p.stock)<=0).length;
  $("kSales").textContent=money.format(salesMonth.reduce((a,s)=>a+num(s.total),0));
  $("kDebt").textContent=money.format(debt);
  $("kProfit").textContent=money.format(profit);
  $("kMargin").textContent=revenue?Math.round(profit/revenue*100)+"%":"0%";
  $("kPatients").textContent=d.patients.filter(p=>p.active!==false).length;
  const critical=d.products.filter(p=>p.active!==false&&num(p.stock)<=num(p.minStock||0));
  $("criticalRows").innerHTML=critical.map(p=>`<tr><td><strong>${esc(p.name)}</strong><div class="help">${esc(p.code||"")}</div></td><td>${num(p.stock)<=0?badge("SIN STOCK"):badge("PENDIENTE")} ${num(p.stock)}</td><td>${num(p.minStock)}</td></tr>`).join("")||`<tr><td colspan="3" class="empty">Sin productos críticos.</td></tr>`;
  $("salesRows").innerHTML=validSales.slice(0,8).map(s=>`<tr><td>${new Date(s.date).toLocaleDateString("es-AR")}</td><td>${esc(s.patientName)}</td><td>${money.format(num(s.total))}</td><td>${badge(s.status)}</td></tr>`).join("")||`<tr><td colspan="4" class="empty">Sin ventas.</td></tr>`;
}
