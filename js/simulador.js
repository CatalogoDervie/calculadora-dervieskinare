import { initAnonymousAuth, loadAll } from "./firebase-service.js?v=20260627b";
import * as FS from "./firebase-service.js?v=20260627b";
import { mountLayout } from "./layout.js?v=20260627b";
import { $, money, num, esc, badge, toast, setLoading } from "./ui.js";

const user = await initAnonymousAuth();

const content = `<section class="split"><article class="card"><h2>Armar simulacion</h2><p class="muted">No toca stock hasta que confirmes Registrar como compra.</p><label>Producto</label><select id="product"></select><div class="formgrid form3"><div><label>Cantidad</label><input id="qty" type="number" min="1" value="1"></div><div><label>Precio compra</label><input id="unitPrice" type="number" min="0"></div><div><label>&nbsp;</label><button class="btn primary block" id="addBtn">Agregar</button></div></div><div id="suggestion" class="help"></div></article><article class="card"><h2>Resultado comercial</h2><div class="totals"><div class="total"><span>Total compra</span><strong id="totalBuy">$0</strong></div><div class="total"><span>Ahorro</span><strong id="saving">$0</strong></div><div class="total"><span>Venta sugerida</span><strong id="suggested">$0</strong></div><div class="total"><span>Ganancia estimada</span><strong id="profit">$0</strong></div></div><div class="totals"><div class="total"><span>Margen estimado</span><strong id="margin">0%</strong></div><div class="total"><span>Unidades</span><strong id="units">0</strong></div><div class="total"><span>Productos</span><strong id="products">0</strong></div><div class="total"><span>Descuento maximo</span><strong id="maxDiscount">0%</strong></div></div><div class="actions" style="margin-top:16px"><button class="btn ghost" id="clearBtn">Limpiar</button><button class="btn dark" id="registerBtn">Registrar como compra y sumar stock</button></div></article></section><section class="card"><h2>Detalle de simulacion</h2><div class="tablewrap"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio compra</th><th>Desc.</th><th>Total compra</th><th>Venta sugerida</th><th>Ganancia</th><th></th></tr></thead><tbody id="rows"></tbody></table></div></section><section class="card"><h2>Recomendaciones para comprar mejor</h2><div class="alert-list" id="tips"></div></section>`;
mountLayout({ active:"simulador", title:"Simulador de compra", subtitle:"Calcula descuento, ahorro, total a pagar y ganancia estimada antes de registrar stock.", content, uid:user.uid });

let all = {};
let items = [];

document.getElementById("refreshBtn").onclick = load;
$("addBtn").onclick = add;
$("clearBtn").onclick = () => { items = []; draw(); };
$("registerBtn").onclick = register;

await load();

async function load(){
  setLoading(true, "Cargando simulador...");
  all = await loadAll();
  setLoading(false);
  $("product").innerHTML = all.products.filter(p => p.active !== false).map(p => `<option value="${p.id}">${esc(p.name)} · compra ${money.format(num(p.purchasePrice || p.resalePrice))}</option>`).join("");
  $("product").onchange = () => { const p = prod(); $("unitPrice").value = num(p?.purchasePrice || p?.resalePrice); suggest(); };
  $("qty").oninput = suggest;
  $("product").dispatchEvent(new Event("change"));
  draw();
}

function prod(){ return all.products.find(p => p.id === $("product").value); }
function discount(q){ if(q >= 20) return .20; if(q >= 15) return .15; if(q >= 10) return .10; return 0; }
function nextTip(q){ if(q < 10) return { target:10, rate:.10, missing:10-q }; if(q < 15) return { target:15, rate:.15, missing:15-q }; if(q < 20) return { target:20, rate:.20, missing:20-q }; return null; }

function suggest(){
  const p = prod();
  const q = num($("qty").value);
  const t = nextTip(q);
  if(!p || !t){ $("suggestion").textContent = q >= 20 ? "Ya tenes el descuento maximo del 20%." : ""; return; }
  const price = num($("unitPrice").value) || num(p.purchasePrice || p.resalePrice);
  const improved = t.target * price * (1 - t.rate);
  $("suggestion").textContent = `Te faltan ${t.missing} unidades para llegar al ${Math.round(t.rate * 100)}% de descuento. Total estimado al subir: ${money.format(improved)}.`;
}

function add(){
  const p = prod();
  const q = num($("qty").value);
  const price = num($("unitPrice").value) || num(p?.purchasePrice || p?.resalePrice);
  if(!p || q <= 0) return toast("Producto/cantidad invalida", "bad");
  items.push({ productId:p.id, productName:p.name, quantity:q, unitPrice:price, suggestedSalePrice:num(p.suggestedSalePrice) });
  draw();
}

function calcItem(i){
  const subtotal = i.quantity * i.unitPrice;
  const rate = discount(i.quantity);
  const saving = subtotal * rate;
  const total = subtotal - saving;
  const suggested = i.quantity * i.suggestedSalePrice;
  const profit = suggested - total;
  return { subtotal, rate, saving, total, suggested, profit };
}

function draw(){
  let total = 0, saving = 0, suggested = 0, profit = 0, units = 0, maxD = 0;
  items.forEach(i => { const c = calcItem(i); total += c.total; saving += c.saving; suggested += c.suggested; profit += c.profit; units += num(i.quantity); maxD = Math.max(maxD, c.rate); });
  $("totalBuy").textContent = money.format(total);
  $("saving").textContent = money.format(saving);
  $("suggested").textContent = money.format(suggested);
  $("profit").textContent = money.format(profit);
  $("margin").textContent = suggested ? Math.round(profit / suggested * 100) + "%" : "0%";
  $("units").textContent = units;
  $("products").textContent = items.length;
  $("maxDiscount").textContent = Math.round(maxD * 100) + "%";
  $("rows").innerHTML = items.map((i,k) => { const c = calcItem(i); return `<tr><td>${esc(i.productName)}</td><td>${i.quantity}</td><td>${money.format(i.unitPrice)}</td><td>${Math.round(c.rate * 100)}%</td><td>${money.format(c.total)}</td><td>${money.format(c.suggested)}</td><td>${money.format(c.profit)}</td><td><button class="btn danger" onclick="removeItem(${k})">Quitar</button></td></tr>`; }).join("") || `<tr><td colspan="8" class="empty">Agrega productos para simular.</td></tr>`;
  drawTips();
}

window.removeItem = k => { items.splice(k, 1); draw(); };

function drawTips(){
  const tips = items.map(i => {
    const t = nextTip(num(i.quantity));
    if(!t) return `<div class="alert"><div><strong>${esc(i.productName)}</strong><span class="help">Ya esta en descuento maximo de 20%.</span></div>${badge("OK")}</div>`;
    return `<div class="alert"><div><strong>${esc(i.productName)}</strong><span class="help">Sumando ${t.missing} unidades llegas al ${Math.round(t.rate * 100)}% de descuento.</span></div>${badge("INFO")}</div>`;
  });
  $("tips").innerHTML = tips.join("") || `<div class="empty">Las recomendaciones aparecen al agregar productos.</div>`;
}

async function register(){
  if(!items.length) return toast("Agrega productos primero.", "warn");
  if(!confirm("Registrar esta simulacion como compra real y sumar stock?")) return;
  setLoading(true, "Registrando compra...");
  await FS.createPurchaseBatch(items, "Registrado desde simulador");
  toast("Compra registrada y stock actualizado", "ok");
  items = [];
  await load();
  setLoading(false);
}
