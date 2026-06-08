import { initAnonymousAuth, loadAll } from "./firebase-service.js";
import * as FS from "./firebase-service.js";
import { mountLayout } from "./layout.js";
import { $, money, num, round, esc, toast, setLoading } from "./ui.js";

const user = await initAnonymousAuth();

const content = `
<section class="split">
  <article class="card">
    <h2>Nueva compra / simulador</h2>
    <p class="muted">Esta pantalla sirve para simular cuánto paga la médica y, si acepta, guardar la compra y sumar stock.</p>

    <form id="purchaseForm">
      <label>Producto</label>
      <select id="productId" name="productId"></select>

      <div class="formgrid form3">
        <div>
          <label>Cantidad</label>
          <input id="quantity" name="quantity" type="number" min="1" value="1" required>
        </div>
        <div>
          <label>Precio compra unitario</label>
          <input id="unitPrice" name="unitPrice" type="number" min="0" placeholder="Automático">
          <div class="help">Se toma del Excel: Importe reventa.</div>
        </div>
        <div>
          <label>Fecha</label>
          <input id="purchaseDate" name="date" type="date">
        </div>
      </div>

      <label>Observaciones</label>
      <textarea name="notes" placeholder="Opcional"></textarea>

      <button class="btn primary block" style="margin-top:12px">Aceptar compra y sumar stock</button>
    </form>
  </article>

  <article class="card">
    <h2>Simulación de compra</h2>
    <p class="muted">Regla automática: 10 productos = 10%, 15 productos = 15%, 20 o más = 20%.</p>

    <div class="totals">
      <div class="total"><span>Subtotal</span><strong id="previewSubtotal">$0</strong></div>
      <div class="total"><span>Descuento</span><strong id="previewDiscount">0%</strong></div>
      <div class="total"><span>Ahorro</span><strong id="previewSaving">$0</strong></div>
      <div class="total"><span>Total a pagar</span><strong id="previewTotal">$0</strong></div>
    </div>

    <div class="card" style="box-shadow:none;margin-top:14px;background:var(--card2)">
      <h3>Escalas</h3>
      <div class="tablewrap">
        <table style="min-width:420px">
          <thead><tr><th>Cantidad</th><th>Descuento</th></tr></thead>
          <tbody>
            <tr><td>1 a 9 productos</td><td>0%</td></tr>
            <tr><td>10 a 14 productos</td><td>10%</td></tr>
            <tr><td>15 a 19 productos</td><td>15%</td></tr>
            <tr><td>20 o más productos</td><td>20%</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </article>
</section>

<section class="card">
  <h2>Compras recientes</h2>
  <div class="tablewrap">
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Unitario</th>
          <th>Subtotal</th>
          <th>Desc.</th>
          <th>Total final</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
  </div>
</section>`;

mountLayout({ active: "compras", title: "Compras", subtitle: "Simulador de compra, descuentos por cantidad e ingreso automático de stock.", content, uid: user.uid });

let all = {};
document.getElementById("refreshBtn").onclick = load;

await load();

async function load() {
  setLoading(true, "Cargando compras...");
  all = await loadAll();
  setLoading(false);

  $("productId").innerHTML = all.products
    .filter(p => p.active !== false)
    .map(p => `<option value="${p.id}">${esc(p.name)} · stock ${num(p.stock)} · compra ${money.format(num(p.resalePrice))}</option>`)
    .join("");

  $("purchaseDate").value = new Date().toISOString().slice(0, 10);
  setAutoPrice();
  renderPreview();
  renderRows();
}

function selectedProduct() {
  return all.products.find(p => p.id === $("productId").value);
}

function getDiscountRate(quantity) {
  const q = num(quantity);
  if (q >= 20) return 0.20;
  if (q >= 15) return 0.15;
  if (q >= 10) return 0.10;
  return 0;
}

function getUnitPrice() {
  const manual = num($("unitPrice").value);
  const product = selectedProduct();
  return manual > 0 ? manual : num(product?.resalePrice);
}

function setAutoPrice() {
  const product = selectedProduct();
  $("unitPrice").placeholder = product ? String(num(product.resalePrice)) : "Automático";
}

function renderPreview() {
  const quantity = num($("quantity").value);
  const unitPrice = getUnitPrice();
  const subtotal = round(quantity * unitPrice);
  const discountRate = getDiscountRate(quantity);
  const discountAmount = round(subtotal * discountRate);
  const total = round(subtotal - discountAmount);

  $("previewSubtotal").textContent = money.format(subtotal);
  $("previewDiscount").textContent = Math.round(discountRate * 100) + "%";
  $("previewSaving").textContent = money.format(discountAmount);
  $("previewTotal").textContent = money.format(total);
}

function renderRows() {
  $("rows").innerHTML = all.purchases.map(c => `
    <tr>
      <td>${esc(c.date || "")}</td>
      <td>${esc(c.productName)}</td>
      <td>${num(c.quantity)}</td>
      <td>${money.format(num(c.unitPrice))}</td>
      <td>${money.format(num(c.subtotal ?? (num(c.unitPrice) * num(c.quantity))))}</td>
      <td>${Math.round(num(c.discountRate) * 100)}%</td>
      <td><strong>${money.format(num(c.total))}</strong></td>
    </tr>`).join("") || `<tr><td colspan="7" class="empty">Sin compras.</td></tr>`;
}

$("productId").addEventListener("change", () => {
  $("unitPrice").value = "";
  setAutoPrice();
  renderPreview();
});
$("quantity").addEventListener("input", renderPreview);
$("unitPrice").addEventListener("input", renderPreview);

$("purchaseForm").onsubmit = async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.discountRate = getDiscountRate(data.quantity);

  const quantity = num(data.quantity);
  const unitPrice = getUnitPrice();
  const subtotal = round(quantity * unitPrice);
  const discountAmount = round(subtotal * data.discountRate);
  const total = round(subtotal - discountAmount);

  const ok = confirm(
    `Confirmar compra\n\n` +
    `Cantidad: ${quantity}\n` +
    `Precio unitario: ${money.format(unitPrice)}\n` +
    `Subtotal: ${money.format(subtotal)}\n` +
    `Descuento: ${Math.round(data.discountRate * 100)}% (${money.format(discountAmount)})\n` +
    `Total a pagar: ${money.format(total)}\n\n` +
    `Al aceptar se suma el stock.`
  );
  if (!ok) return;

  setLoading(true, "Guardando compra...");
  await FS.createPurchase(data);
  toast("Compra guardada y stock actualizado", "ok");
  e.target.reset();
  await load();
  setLoading(false);
};
