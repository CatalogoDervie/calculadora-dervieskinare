import { initAnonymousAuth, loadAll } from "./firebase-service.js";
import * as FS from "./firebase-service.js";
import { mountLayout } from "./layout.js";
import { $, money, num, esc, badge, toast, setLoading } from "./ui.js";

const user = await initAnonymousAuth();

const featuredCatalog = [
  { key:"agua-micelar", names:["agua micelar"], title:"Agua Micelar", category:"Limpieza suave", image:"assets/catalogo/agua-micelar.jpg", use:"Primer paso para retirar impurezas sin complejizar la rutina.", stage:"Rutina esencial" },
  { key:"serum-niacinamida", names:["serum niacinamida","niacinamida"], title:"Serum Niacinamida", category:"Serum diario", image:"assets/catalogo/serum-niacinamida.jpg", use:"Producto central por textura liviana y buena rotacion.", stage:"Rutina esencial" },
  { key:"hialcrem", names:["hialcrem"], title:"Hialcrem", category:"Hidratacion liviana", image:"assets/catalogo/hialcrem.jpg", use:"Cierra la rutina diaria con hidratacion de uso cotidiano.", stage:"Rutina esencial" },
  { key:"dermocalmante", names:["dermocalmante"], title:"Dermocalmante", category:"Piel sensible", image:"assets/catalogo/dermocalmante.jpg", use:"Alternativa de confort para piel sensible o sensibilizada.", stage:"Segunda etapa" },
  { key:"espuma-termal", names:["espuma termal"], title:"Espuma Termal", category:"Higiene diaria", image:"assets/catalogo/espuma-termal.jpg", use:"Limpieza con enjuague para rutina general.", stage:"Alternativa limpieza" },
  { key:"espuma-oil-control", names:["espuma oil control","oil control"], title:"Espuma Oil Control", category:"Piel grasa", image:"assets/catalogo/espuma-oil-control.jpg", use:"Limpieza especifica para mayor oleosidad.", stage:"Alternativa limpieza" },
  { key:"serum-vitamina-c", names:["serum vitamina c","vitamina c +","vitamina c"], title:"Serum Vitamina C", category:"Luminosidad", image:"assets/catalogo/serum-vitamina-c.jpg", use:"Incorporacion diurna para luminosidad y aspecto general.", stage:"Segunda etapa" },
  { key:"calendula", names:["calendula"], title:"Calendula", category:"Nutricion y confort", image:"assets/catalogo/calendula.jpg", use:"Textura mas nutritiva para ampliar la propuesta.", stage:"Segunda etapa" }
];

const packGuides = [
  { title:"Rutina esencial", tag:"Inicio recomendado", products:["Agua Micelar","Serum Niacinamida","Hialcrem"], note:"El pack mas simple para comenzar: limpieza + serum + hidratacion." },
  { title:"Rutina con limpieza en espuma", tag:"General", products:["Espuma Termal","Serum Niacinamida","Hialcrem"], note:"Mantiene los tres pasos, reemplazando el limpiador por espuma." },
  { title:"Rutina para piel grasa", tag:"Oil control", products:["Espuma Oil Control","Serum Niacinamida","Hialcrem"], note:"Una alternativa clara para pacientes con mayor oleosidad." },
  { title:"Piel sensible o sensibilizada", tag:"Confort", products:["Agua Micelar","Serum Niacinamida","Dermocalmante"], note:"Rutina suave orientada a confort y tolerancia." },
  { title:"Luminosidad diurna", tag:"Dia", products:["Agua Micelar","Serum Vitamina C","Hialcrem"], note:"Pack facil de explicar para luminosidad y cuidado diario." },
  { title:"Segunda etapa de stock", tag:"Ampliacion", products:["Dermocalmante","Calendula","Serum Vitamina C"], note:"Productos para sumar luego de evaluar consultas y reposicion." }
];

const content = `
<section class="split">
  <article class="card">
    <h2>Armar simulacion</h2>
    <p class="muted">No toca stock hasta que confirmes Registrar como compra.</p>
    <label>Producto</label>
    <select id="product"></select>
    <div class="formgrid form3">
      <div><label>Cantidad</label><input id="qty" type="number" min="1" value="1"></div>
      <div><label>Precio compra</label><input id="unitPrice" type="number" min="0"></div>
      <div><label>&nbsp;</label><button class="btn primary block" id="addBtn">Agregar</button></div>
    </div>
    <div id="suggestion" class="help"></div>
  </article>

  <article class="card">
    <h2>Resultado comercial</h2>
    <div class="totals">
      <div class="total"><span>Total compra</span><strong id="totalBuy">$0</strong></div>
      <div class="total"><span>Ahorro</span><strong id="saving">$0</strong></div>
      <div class="total"><span>Venta sugerida</span><strong id="suggested">$0</strong></div>
      <div class="total"><span>Ganancia estimada</span><strong id="profit">$0</strong></div>
    </div>
    <div class="totals">
      <div class="total"><span>Margen estimado</span><strong id="margin">0%</strong></div>
      <div class="total"><span>Unidades</span><strong id="units">0</strong></div>
      <div class="total"><span>Productos</span><strong id="products">0</strong></div>
      <div class="total"><span>Descuento maximo</span><strong id="maxDiscount">0%</strong></div>
    </div>
    <div class="actions" style="margin-top:16px">
      <button class="btn ghost" id="clearBtn">Limpiar</button>
      <button class="btn dark" id="registerBtn">Registrar como compra y sumar stock</button>
    </div>
  </article>
</section>

<section class="card">
  <h2>Catalogo principal para vender mejor</h2>
  <p class="muted">Ocho productos para presentar la linea sin hacer una propuesta demasiado extensa. Cada tarjeta toma los precios cargados en Productos para calcular margen.</p>
  <div class="featured-catalog" id="featuredCatalog"></div>
</section>

<section class="card">
  <h2>Packs recomendados</h2>
  <p class="muted">Formas simples de ofrecer la linea: empezar con tres pasos, cambiar el limpiador segun piel y ampliar luego segun rotacion.</p>
  <div class="pack-grid" id="packGrid"></div>
</section>

<section class="card">
  <h2>Detalle de simulacion</h2>
  <div class="tablewrap">
    <table>
      <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio compra</th><th>Desc.</th><th>Total compra</th><th>Venta sugerida</th><th>Ganancia</th><th></th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
  </div>
</section>

<section class="card">
  <h2>Recomendaciones para comprar mejor</h2>
  <div class="alert-list" id="tips"></div>
</section>`;

mountLayout({ active:"simulador", title:"Simulador de compra", subtitle:"Calcula descuento, ahorro, total a pagar, ganancia estimada y packs recomendados.", content, uid:user.uid });

let all = {};
let items = [];

document.getElementById("refreshBtn").onclick = load;
$("addBtn").onclick = add;
$("clearBtn").onclick = () => { items = []; draw(); };
$("registerBtn").onclick = register;

await load();

async function load() {
  setLoading(true, "Cargando simulador...");
  all = await loadAll();
  setLoading(false);
  $("product").innerHTML = all.products.filter(p => p.active !== false).map(p => `<option value="${p.id}">${esc(p.name)} · compra ${money.format(num(p.purchasePrice || p.resalePrice))}</option>`).join("");
  $("product").onchange = () => { const p = prod(); $("unitPrice").value = num(p?.purchasePrice || p?.resalePrice); suggest(); };
  $("qty").oninput = suggest;
  $("product").dispatchEvent(new Event("change"));
  drawCatalog();
  draw();
}

function prod(){ return all.products.find(p => p.id === $("product").value); }
function discount(q){ if(q>=20)return .20; if(q>=15)return .15; if(q>=10)return .10; return 0; }
function nextTip(q){ if(q<10)return {target:10,rate:.10,missing:10-q}; if(q<15)return {target:15,rate:.15,missing:15-q}; if(q<20)return {target:20,rate:.20,missing:20-q}; return null; }
function normalize(value){ return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function findProduct(names){ return all.products.find(p => names.some(name => normalize(p.name).includes(normalize(name)))); }
function marginFor(product){ const buy = num(product?.purchasePrice || product?.resalePrice); const sale = num(product?.suggestedSalePrice); const profit = sale - buy; return { buy, sale, profit, margin: sale > 0 ? profit / sale : 0 }; }

function suggest(){
  const p = prod();
  const q = num($("qty").value);
  const t = nextTip(q);
  if(!p || !t){ $("suggestion").textContent = q >= 20 ? "Ya tenes el descuento maximo del 20%." : ""; return; }
  const price = num($("unitPrice").value) || num(p.purchasePrice || p.resalePrice);
  const improved = t.target * price * (1 - t.rate);
  $("suggestion").textContent = `Te faltan ${t.missing} unidades para llegar al ${Math.round(t.rate*100)}% de descuento. Total estimado al subir: ${money.format(improved)}.`;
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
  let total=0, saving=0, suggested=0, profit=0, units=0, maxD=0;
  items.forEach(i => { const c = calcItem(i); total += c.total; saving += c.saving; suggested += c.suggested; profit += c.profit; units += num(i.quantity); maxD = Math.max(maxD, c.rate); });
  $("totalBuy").textContent = money.format(total);
  $("saving").textContent = money.format(saving);
  $("suggested").textContent = money.format(suggested);
  $("profit").textContent = money.format(profit);
  $("margin").textContent = suggested ? Math.round(profit / suggested * 100) + "%" : "0%";
  $("units").textContent = units;
  $("products").textContent = items.length;
  $("maxDiscount").textContent = Math.round(maxD * 100) + "%";
  $("rows").innerHTML = items.map((i,k) => { const c = calcItem(i); return `<tr><td>${esc(i.productName)}</td><td>${i.quantity}</td><td>${money.format(i.unitPrice)}</td><td>${Math.round(c.rate*100)}%</td><td>${money.format(c.total)}</td><td>${money.format(c.suggested)}</td><td>${money.format(c.profit)}</td><td><button class="btn danger" onclick="removeItem(${k})">Quitar</button></td></tr>`; }).join("") || `<tr><td colspan="8" class="empty">Agrega productos para simular.</td></tr>`;
  drawTips();
}

window.removeItem = k => { items.splice(k, 1); draw(); };

function drawTips(){
  const tips = items.map(i => {
    const t = nextTip(num(i.quantity));
    if(!t) return `<div class="alert"><div><strong>${esc(i.productName)}</strong><span class="help">Ya esta en descuento maximo de 20%.</span></div>${badge("OK")}</div>`;
    return `<div class="alert"><div><strong>${esc(i.productName)}</strong><span class="help">Sumando ${t.missing} unidades llegas al ${Math.round(t.rate*100)}% de descuento.</span></div>${badge("INFO")}</div>`;
  });
  $("tips").innerHTML = tips.join("") || `<div class="empty">Las recomendaciones aparecen al agregar productos.</div>`;
}

function drawCatalog(){
  $("featuredCatalog").innerHTML = featuredCatalog.map(item => {
    const product = findProduct(item.names);
    const m = marginFor(product);
    return `<article class="catalog-product">
      <img src="${item.image}" alt="${esc(item.title)}" loading="lazy">
      <div class="catalog-product-body">
        <small>${esc(item.stage)}</small>
        <h3>${esc(item.title)}</h3>
        <span>${esc(item.category)}</span>
        <p>${esc(item.use)}</p>
        <div class="catalog-metrics">
          <b>${product ? money.format(m.sale) : "Sin precio"}</b>
          <em>Margen ${product ? Math.round(m.margin * 100) + "%" : "-"}</em>
          <em>Gana ${product ? money.format(m.profit) : "-"}</em>
        </div>
      </div>
    </article>`;
  }).join("");

  $("packGrid").innerHTML = packGuides.map(pack => {
    const found = pack.products.map(name => findProduct([name])).filter(Boolean);
    const totals = found.reduce((acc, product) => {
      const m = marginFor(product);
      acc.sale += m.sale;
      acc.profit += m.profit;
      return acc;
    }, { sale:0, profit:0 });
    return `<article class="pack-card">
      <small>${esc(pack.tag)}</small>
      <h3>${esc(pack.title)}</h3>
      <p>${esc(pack.note)}</p>
      <ul>${pack.products.map(product => `<li>${esc(product)}</li>`).join("")}</ul>
      <div class="pack-total"><span>Venta pack</span><strong>${found.length ? money.format(totals.sale) : "Completar precios"}</strong><span>Ganancia estimada</span><strong>${found.length ? money.format(totals.profit) : "-"}</strong></div>
    </article>`;
  }).join("");
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
