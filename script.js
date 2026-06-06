/*
  Dervie SkinCare - Control de Cremas

  DEFAULT_API_URL queda vacío para que la página funcione en modo demo.
  Cuando tengas la URL de Apps Script que termina en /exec, podés:
  A) pegarla en la pantalla Configurar, o
  B) reemplazar DEFAULT_API_URL y subir de nuevo el archivo.
*/

const DEFAULT_API_URL = '';
const STORAGE_API_URL = 'dervie_api_url';
const STORAGE_DEMO = 'dervie_demo_state_v2';

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

let state = {
  productos: [],
  clientes: [],
  ventas: [],
  deudores: [],
  detallesVentas: [],
  dashboard: {},
  saleItems: []
};

const demoBase = {
  productos: [
    { ID_PRODUCTO:'P0001', CODIGO:'58', PRODUCTO:'AA + fin. 2,5 mg x 60', DESCRIPCION:'Mujeres menopáusicas', CATEGORIA:'Cápsulas', PRECIO_COSTO:25700, PRECIO_REVENTA:36700, PRECIO_VENTA_SUGERIDO:36700, STOCK_ACTUAL:12, STOCK_MINIMO:3, ACTIVO:'SI', CANT_DESC_1:15, DESC_1:0.2 },
    { ID_PRODUCTO:'P0004', CODIGO:'89', PRODUCTO:'Agua micelar', DESCRIPCION:'Limpieza piel sensible', CATEGORIA:'Facial', PRECIO_COSTO:10300, PRECIO_REVENTA:16000, PRECIO_VENTA_SUGERIDO:16000, STOCK_ACTUAL:4, STOCK_MINIMO:3, ACTIVO:'SI', CANT_DESC_1:15, DESC_1:0.2 },
    { ID_PRODUCTO:'P0008', CODIGO:'28', PRODUCTO:'Argireline', DESCRIPCION:'Símil Botox', CATEGORIA:'Facial', PRECIO_COSTO:20600, PRECIO_REVENTA:29900, PRECIO_VENTA_SUGERIDO:29900, STOCK_ACTUAL:7, STOCK_MINIMO:3, ACTIVO:'SI', CANT_DESC_1:15, DESC_1:0.2 },
    { ID_PRODUCTO:'P0021', CODIGO:'4', PRODUCTO:'Despigmentante Noche', DESCRIPCION:'Hidroquinona 3%', CATEGORIA:'Despigmentante', PRECIO_COSTO:23100, PRECIO_REVENTA:35200, PRECIO_VENTA_SUGERIDO:35200, STOCK_ACTUAL:2, STOCK_MINIMO:3, ACTIVO:'SI', CANT_DESC_1:15, DESC_1:0.2 },
    { ID_PRODUCTO:'P0037', CODIGO:'11', PRODUCTO:'Glicólico 12%', DESCRIPCION:'Renovador', CATEGORIA:'Ácidos', PRECIO_COSTO:15700, PRECIO_REVENTA:24400, PRECIO_VENTA_SUGERIDO:24400, STOCK_ACTUAL:0, STOCK_MINIMO:3, ACTIVO:'SI', CANT_DESC_1:15, DESC_1:0.2 }
  ],
  clientes: [
    { ID_CLIENTE:'CLI-1', APELLIDO:'Clínica Depiel', NOMBRE:'', DNI:'', TELEFONO:'', OBSERVACIONES:'Cliente demo', ACTIVO:'SI' },
    { ID_CLIENTE:'CLI-2', APELLIDO:'Dra. Martínez', NOMBRE:'Laura', DNI:'', TELEFONO:'', OBSERVACIONES:'Cliente demo', ACTIVO:'SI' }
  ],
  ventas: [],
  deudores: [],
  detallesVentas: []
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindEvents();
  setApiInput();
  await loadData();
  updateConnectionCard();
  renderAll();
}

function bindEvents() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  document.querySelectorAll('[data-jump]').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.jump));
  });

  byId('btnReload').addEventListener('click', reload);
  byId('btnAddSaleItem').addEventListener('click', addSaleItem);
  byId('btnSaveSale').addEventListener('click', saveSale);
  byId('btnClearSale').addEventListener('click', clearSale);
  byId('btnSaveClient').addEventListener('click', saveClient);
  byId('btnSaveProduct').addEventListener('click', saveProduct);
  byId('btnClearProduct').addEventListener('click', clearProductForm);
  byId('btnSaveStock').addEventListener('click', saveStock);

  byId('btnSaveApiUrl').addEventListener('click', saveApiUrl);
  byId('btnClearApiUrl').addEventListener('click', clearApiUrl);
  byId('btnTestApiUrl').addEventListener('click', testApiUrl);

  byId('btnConfirmPayment').addEventListener('click', confirmPayment);

  byId('saleGeneralDiscount').addEventListener('input', renderSaleItems);
  byId('salePaid').addEventListener('input', renderSaleItems);
  byId('saleProductSearch').addEventListener('input', () => renderProductSelect('saleProduct', byId('saleProductSearch').value));
  byId('stockProductSearch').addEventListener('input', () => renderProductSelect('stockProduct', byId('stockProductSearch').value));
  byId('productSearch').addEventListener('input', renderProducts);
  byId('clientSearch').addEventListener('input', renderClients);

  byId('btnExportVentas').addEventListener('click', () => exportCsv('ventas.csv', state.ventas));
  byId('btnExportClientes').addEventListener('click', () => exportCsv('clientes.csv', state.clientes));
  byId('btnExportProductos').addEventListener('click', () => exportCsv('productos.csv', state.productos));
  byId('btnExportStock').addEventListener('click', () => exportCsv('stock.csv', state.productos.map(p => ({
    CODIGO:p.CODIGO,
    PRODUCTO:p.PRODUCTO,
    STOCK_ACTUAL:p.STOCK_ACTUAL,
    STOCK_MINIMO:p.STOCK_MINIMO,
    PRECIO_REVENTA:getResalePrice(p),
    VALOR_STOCK: getResalePrice(p) * toNumber(p.STOCK_ACTUAL)
  }))));
  byId('btnExportDeudores').addEventListener('click', () => exportCsv('deudores.csv', getDebtors()));
}

function byId(id) {
  return document.getElementById(id);
}

function getApiUrl() {
  return localStorage.getItem(STORAGE_API_URL) || DEFAULT_API_URL || '';
}

function isConnected() {
  const url = getApiUrl();
  return url && url.startsWith('http') && url.includes('/exec');
}

function setApiInput() {
  byId('apiUrlInput').value = getApiUrl();
}

function updateConnectionCard() {
  const card = byId('connectionCard');
  if (isConnected()) {
    card.innerHTML = '<span class="status-dot good"></span><div><strong>Conectado</strong><small>GitHub + Apps Script + Sheets</small></div>';
  } else {
    card.innerHTML = '<span class="status-dot warning"></span><div><strong>Modo demo</strong><small>Sin conexión real todavía</small></div>';
  }
}

async function api(action, payload = {}) {
  const url = getApiUrl();
  if (!isConnected()) throw new Error('Falta configurar la URL de Apps Script.');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload })
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error desconocido');
  return data.data;
}

async function loadData() {
  if (!isConnected()) {
    loadDemo();
    return;
  }

  try {
    const data = await api('getAppData');
    state.productos = data.productos || [];
    state.clientes = data.clientes || data.pacientes || [];
    state.ventas = data.ventas || [];
    state.deudores = data.deudores || [];
    state.detallesVentas = data.detallesVentas || [];
    state.dashboard = data.dashboard || {};
    state.saleItems = state.saleItems || [];
  } catch (err) {
    console.error(err);
    toast('No pude conectar con Apps Script. Uso modo demo.', 'error');
    loadDemo();
  }
}

function loadDemo() {
  const saved = localStorage.getItem(STORAGE_DEMO);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...demoBase, ...parsed, saleItems: [] };
      recalcDemo();
      return;
    } catch {}
  }
  state = JSON.parse(JSON.stringify({ ...demoBase, saleItems: [] }));
  recalcDemo();
  saveDemo();
}

function saveDemo() {
  localStorage.setItem(STORAGE_DEMO, JSON.stringify({
    productos: state.productos,
    clientes: state.clientes,
    ventas: state.ventas,
    deudores: state.deudores,
    detallesVentas: state.detallesVentas
  }));
}

async function reload() {
  await loadData();
  updateConnectionCard();
  renderAll();
  toast('Datos actualizados', 'ok');
}

function showView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  byId(`view-${viewName}`).classList.add('active');

  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === viewName));
}

function renderAll() {
  renderSelects();
  renderDashboard();
  renderProducts();
  renderClients();
  renderStock();
  renderDebtors();
  renderReports();
  renderSaleItems();
}

function renderSelects() {
  renderClientSelect();
  renderProductSelect('saleProduct', byId('saleProductSearch').value);
  renderProductSelect('stockProduct', byId('stockProductSearch').value);
}

function renderClientSelect() {
  const select = byId('saleClient');
  select.innerHTML = '';
  const activeClients = state.clientes.filter(c => normalizeActive(c.ACTIVO));
  if (!activeClients.length) {
    select.innerHTML = '<option value="">Cargá un cliente primero</option>';
    return;
  }

  activeClients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.ID_CLIENTE || c.ID_PACIENTE;
    opt.textContent = clientName(c);
    select.appendChild(opt);
  });
}

function renderProductSelect(selectId, query = '') {
  const select = byId(selectId);
  const q = normalize(query);
  const rows = state.productos
    .filter(p => normalizeActive(p.ACTIVO))
    .filter(p => normalize(`${p.CODIGO} ${p.PRODUCTO} ${p.DESCRIPCION}`).includes(q));

  select.innerHTML = '';
  if (!rows.length) {
    select.innerHTML = '<option value="">Sin productos</option>';
    return;
  }

  rows.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.ID_PRODUCTO;
    opt.textContent = `${p.CODIGO || '-'} | ${p.PRODUCTO} | stock ${toNumber(p.STOCK_ACTUAL)} | ${money.format(getResalePrice(p))}`;
    select.appendChild(opt);
  });
}

function renderDashboard() {
  const activeSales = state.ventas.filter(v => v.ESTADO !== 'Anulada');
  const d = state.dashboard || {};
  const ventas = d.ventasMes ?? sum(activeSales, 'TOTAL_FINAL');
  const cobrado = d.cobradoMes ?? sum(activeSales, 'TOTAL_PAGADO');
  const saldo = d.saldoPendiente ?? sum(activeSales, 'SALDO');
  const ganancia = d.gananciaEstimada ?? estimateProfit();

  byId('kpiVentas').textContent = money.format(ventas);
  byId('kpiCobrado').textContent = money.format(cobrado);
  byId('kpiSaldo').textContent = money.format(saldo);
  byId('kpiGanancia').textContent = money.format(ganancia);

  byId('salesCount').textContent = `${state.ventas.length} ventas`;

  const recent = [...state.ventas].slice(-10).reverse();
  byId('recentSalesRows').innerHTML = recent.length ? recent.map(v => `
    <tr>
      <td>${formatDate(v.FECHA)}</td>
      <td><strong>${escapeHtml(v.CLIENTE || v.PACIENTE || '')}</strong></td>
      <td>${money.format(toNumber(v.TOTAL_FINAL))}</td>
      <td>${money.format(toNumber(v.TOTAL_PAGADO))}</td>
      <td>${money.format(toNumber(v.SALDO))}</td>
      <td>${statusBadge(v.ESTADO)}</td>
    </tr>
  `).join('') : emptyRow(6, 'Todavía no hay ventas.');

  const low = state.productos.filter(p => toNumber(p.STOCK_ACTUAL) <= minStock(p) && normalizeActive(p.ACTIVO));
  byId('lowStockList').innerHTML = low.length ? low.map(p => `
    <div class="card-row">
      <div>
        <strong>${escapeHtml(p.PRODUCTO)}</strong>
        <small>Código ${escapeHtml(p.CODIGO || '-')} · mínimo ${minStock(p)}</small>
      </div>
      <span class="badge ${toNumber(p.STOCK_ACTUAL) <= 0 ? 'bad' : 'warn'}">${toNumber(p.STOCK_ACTUAL)} u.</span>
    </div>
  `).join('') : '<p class="muted">No hay alertas de stock.</p>';
}

function renderProducts() {
  const q = normalize(byId('productSearch').value);
  const rows = state.productos.filter(p => normalize(`${p.CODIGO} ${p.PRODUCTO} ${p.DESCRIPCION} ${p.CATEGORIA}`).includes(q));
  byId('productCount').textContent = `${rows.length} productos`;

  byId('productRows').innerHTML = rows.length ? rows.map(p => {
    const margin = getResalePrice(p) - toNumber(p.PRECIO_COSTO);
    return `
      <tr>
        <td>${escapeHtml(p.CODIGO || '')}</td>
        <td>
          <strong>${escapeHtml(p.PRODUCTO || '')}</strong>
          <div class="muted">${escapeHtml(p.DESCRIPCION || '')}</div>
        </td>
        <td>${money.format(getResalePrice(p))}</td>
        <td>${toNumber(p.STOCK_ACTUAL)} ${stockBadge(p)}</td>
        <td>${money.format(margin)}</td>
        <td><button class="btn ghost small" onclick="editProduct('${escapeAttr(p.ID_PRODUCTO)}')">Editar</button></td>
      </tr>
    `;
  }).join('') : emptyRow(6, 'No hay productos.');
}

function renderClients() {
  const q = normalize(byId('clientSearch').value);
  const rows = state.clientes.filter(c => normalize(`${c.APELLIDO} ${c.NOMBRE} ${c.DNI} ${c.TELEFONO} ${c.OBSERVACIONES}`).includes(q));

  byId('clientRows').innerHTML = rows.length ? rows.map(c => `
    <tr>
      <td><strong>${escapeHtml(clientName(c))}</strong></td>
      <td>${escapeHtml(c.TELEFONO || '')}</td>
      <td>${escapeHtml(c.DNI || '')}</td>
      <td>${escapeHtml(c.OBSERVACIONES || '')}</td>
    </tr>
  `).join('') : emptyRow(4, 'No hay clientes.');
}

function renderStock() {
  byId('stockRows').innerHTML = state.productos.length ? state.productos.map(p => `
    <tr>
      <td>
        <strong>${escapeHtml(p.PRODUCTO || '')}</strong>
        <div class="muted">Código ${escapeHtml(p.CODIGO || '-')}</div>
      </td>
      <td>${toNumber(p.STOCK_ACTUAL)} ${stockBadge(p)}</td>
      <td>${minStock(p)}</td>
      <td>${money.format(getResalePrice(p) * toNumber(p.STOCK_ACTUAL))}</td>
    </tr>
  `).join('') : emptyRow(4, 'No hay productos.');
}

function renderDebtors() {
  const rows = getDebtors();
  byId('debtRows').innerHTML = rows.length ? rows.map(v => `
    <tr>
      <td>${formatDate(v.FECHA)}</td>
      <td><strong>${escapeHtml(v.CLIENTE || v.PACIENTE || '')}</strong></td>
      <td>${money.format(toNumber(v.TOTAL_FINAL))}</td>
      <td>${money.format(toNumber(v.TOTAL_PAGADO))}</td>
      <td><strong>${money.format(toNumber(v.SALDO))}</strong></td>
      <td>${statusBadge(v.ESTADO)}</td>
      <td>
        <button class="btn secondary small" onclick="openPaymentDialog('${escapeAttr(v.ID_VENTA)}')">Pago</button>
        <button class="btn danger small" onclick="cancelSale('${escapeAttr(v.ID_VENTA)}')">Anular</button>
      </td>
    </tr>
  `).join('') : emptyRow(7, 'No hay deudores pendientes.');
}

function renderReports() {
  const activeSales = state.ventas.filter(v => v.ESTADO !== 'Anulada');
  const avg = activeSales.length ? sum(activeSales, 'TOTAL_FINAL') / activeSales.length : 0;
  const stockValue = state.productos.reduce((acc, p) => acc + getResalePrice(p) * toNumber(p.STOCK_ACTUAL), 0);
  const pending = getDebtors().length;

  byId('reportAvgTicket').textContent = money.format(avg);
  byId('reportStockValue').textContent = money.format(stockValue);
  byId('reportPendingSales').textContent = pending;

  const qtyMap = {};
  state.detallesVentas.forEach(d => {
    if (!qtyMap[d.PRODUCTO]) qtyMap[d.PRODUCTO] = 0;
    qtyMap[d.PRODUCTO] += toNumber(d.CANTIDAD);
  });
  const topQty = Object.entries(qtyMap).sort((a,b) => b[1]-a[1]).slice(0, 8);
  byId('topProductsQty').innerHTML = topQty.length ? topQty.map(([name, qty]) => `
    <div class="card-row"><strong>${escapeHtml(name)}</strong><span class="badge info">${qty} u.</span></div>
  `).join('') : '<p class="muted">Todavía no hay detalle de ventas para calcular top.</p>';

  const topMargin = [...state.productos]
    .map(p => ({ name:p.PRODUCTO, code:p.CODIGO, margin:getResalePrice(p) - toNumber(p.PRECIO_COSTO) }))
    .sort((a,b) => b.margin - a.margin)
    .slice(0, 8);

  byId('topMarginProducts').innerHTML = topMargin.length ? topMargin.map(p => `
    <div class="card-row">
      <div><strong>${escapeHtml(p.name)}</strong><small>Código ${escapeHtml(p.code || '-')}</small></div>
      <span class="badge ok">${money.format(p.margin)}</span>
    </div>
  `).join('') : '<p class="muted">No hay productos para calcular margen.</p>';
}

function addSaleItem() {
  const id = byId('saleProduct').value;
  const product = state.productos.find(p => p.ID_PRODUCTO === id);
  if (!product) return toast('Seleccioná un producto válido.', 'error');

  const qty = toNumber(byId('saleQty').value);
  if (qty <= 0) return toast('La cantidad debe ser mayor a cero.', 'error');
  if (toNumber(product.STOCK_ACTUAL) < qty) return toast(`Stock insuficiente. Disponible: ${product.STOCK_ACTUAL}`, 'error');

  const manualPrice = toNumber(byId('saleCustomPrice').value);
  const itemDiscount = percentFromInput(byId('saleItemDiscount').value);

  state.saleItems.push({
    idProducto: product.ID_PRODUCTO,
    producto: product.PRODUCTO,
    codigo: product.CODIGO,
    cantidad: qty,
    precioVenta: manualPrice > 0 ? manualPrice : getResalePrice(product),
    descuentoProducto: itemDiscount,
    costoUnitario: toNumber(product.PRECIO_COSTO)
  });

  byId('saleQty').value = 1;
  byId('saleItemDiscount').value = 0;
  byId('saleCustomPrice').value = '';
  renderSaleItems();
}

function renderSaleItems() {
  const generalDiscount = percentFromInput(byId('saleGeneralDiscount').value);
  const paid = toNumber(byId('salePaid').value);

  let bruto = 0;
  let final = 0;

  const rows = state.saleItems.map((item, index) => {
    const desc = item.descuentoProducto > 0 ? item.descuentoProducto : generalDiscount;
    const lineBruto = item.cantidad * item.precioVenta;
    const lineFinal = lineBruto * (1 - desc);
    bruto += lineBruto;
    final += lineFinal;

    return `
      <tr>
        <td>
          <strong>${escapeHtml(item.producto)}</strong>
          <div class="muted">Código ${escapeHtml(item.codigo || '-')}</div>
        </td>
        <td>${item.cantidad}</td>
        <td>${money.format(item.precioVenta)}</td>
        <td>${Math.round(desc * 100)}%</td>
        <td><strong>${money.format(lineFinal)}</strong></td>
        <td><button class="btn ghost small" onclick="removeSaleItem(${index})">Quitar</button></td>
      </tr>
    `;
  }).join('');

  byId('saleItemsRows').innerHTML = rows || emptyRow(6, 'Agregá productos al detalle.');
  byId('saleBruto').textContent = money.format(bruto);
  byId('saleDescuento').textContent = money.format(bruto - final);
  byId('saleFinal').textContent = money.format(final);
  byId('saleSaldo').textContent = money.format(Math.max(0, final - paid));
}

function removeSaleItem(index) {
  state.saleItems.splice(index, 1);
  renderSaleItems();
}

function clearSale() {
  state.saleItems = [];
  byId('saleGeneralDiscount').value = 0;
  byId('salePaid').value = 0;
  byId('saleNotes').value = '';
  byId('saleItemDiscount').value = 0;
  byId('saleCustomPrice').value = '';
  renderSaleItems();
}

async function saveSale() {
  if (!state.saleItems.length) return toast('Agregá al menos un producto.', 'error');
  const clientId = byId('saleClient').value;
  if (!clientId) return toast('Seleccioná un cliente.', 'error');

  const payload = {
    clienteId: clientId,
    pacienteId: clientId,
    formaPago: byId('salePayment').value,
    descuentoGeneral: percentFromInput(byId('saleGeneralDiscount').value),
    pagado: toNumber(byId('salePaid').value),
    observaciones: byId('saleNotes').value,
    items: state.saleItems
  };

  try {
    if (isConnected()) {
      await api('guardarVenta', payload);
      await loadData();
    } else {
      demoSaveSale(payload);
    }
    clearSale();
    renderAll();
    showView('dashboard');
    toast('Venta guardada correctamente.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function saveClient() {
  const payload = {
    apellido: byId('clientLastName').value,
    nombre: byId('clientName').value,
    dni: byId('clientDni').value,
    telefono: byId('clientPhone').value,
    observaciones: byId('clientNotes').value
  };

  if (!payload.apellido && !payload.nombre) return toast('Cargá apellido/razón social o nombre.', 'error');

  try {
    if (isConnected()) {
      await api('crearCliente', payload);
      await loadData();
    } else {
      state.clientes.push({
        ID_CLIENTE: `CLI-${Date.now()}`,
        FECHA_ALTA: new Date().toISOString(),
        APELLIDO: payload.apellido,
        NOMBRE: payload.nombre,
        DNI: payload.dni,
        TELEFONO: payload.telefono,
        OBSERVACIONES: payload.observaciones,
        ACTIVO: 'SI'
      });
      saveDemo();
    }

    ['clientLastName','clientName','clientDni','clientPhone','clientNotes'].forEach(id => byId(id).value = '');
    renderAll();
    toast('Cliente guardado.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function readProductForm() {
  return {
    idProducto: byId('productIdEdit').value,
    codigo: byId('productCode').value,
    producto: byId('productName').value,
    descripcion: byId('productDescription').value,
    categoria: byId('productCategory').value,
    precioCosto: toNumber(byId('productCost').value),
    precioReventa: toNumber(byId('productResale').value),
    precioVentaSugerido: toNumber(byId('productSuggested').value),
    stockActual: toNumber(byId('productStock').value),
    stockMinimo: toNumber(byId('productMinStock').value),
    activo: byId('productActive').value
  };
}

async function saveProduct() {
  const payload = readProductForm();
  if (!payload.producto) return toast('Cargá el nombre del producto.', 'error');

  try {
    if (isConnected()) {
      await api('guardarProducto', payload);
      await loadData();
    } else {
      demoSaveProduct(payload);
    }

    clearProductForm();
    renderAll();
    toast('Producto guardado.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function editProduct(id) {
  const p = state.productos.find(x => x.ID_PRODUCTO === id);
  if (!p) return;

  byId('productIdEdit').value = p.ID_PRODUCTO || '';
  byId('productCode').value = p.CODIGO || '';
  byId('productName').value = p.PRODUCTO || '';
  byId('productDescription').value = p.DESCRIPCION || '';
  byId('productCategory').value = p.CATEGORIA || '';
  byId('productCost').value = toNumber(p.PRECIO_COSTO);
  byId('productResale').value = getResalePrice(p);
  byId('productSuggested').value = toNumber(p.PRECIO_VENTA_SUGERIDO);
  byId('productStock').value = toNumber(p.STOCK_ACTUAL);
  byId('productMinStock').value = minStock(p);
  byId('productActive').value = normalizeActive(p.ACTIVO) ? 'SI' : 'NO';

  showView('productos');
  toast('Producto cargado para editar.', 'ok');
}

function clearProductForm() {
  ['productIdEdit','productCode','productName','productDescription','productCategory','productCost','productResale','productSuggested'].forEach(id => byId(id).value = '');
  byId('productStock').value = 0;
  byId('productMinStock').value = 3;
  byId('productActive').value = 'SI';
}

async function saveStock() {
  const payload = {
    idProducto: byId('stockProduct').value,
    cantidad: toNumber(byId('stockQty').value),
    costoUnitario: toNumber(byId('stockCost').value),
    observaciones: byId('stockNotes').value
  };

  if (!payload.idProducto || payload.cantidad <= 0) return toast('Producto o cantidad inválida.', 'error');

  try {
    if (isConnected()) {
      await api('registrarIngresoStock', payload);
      await loadData();
    } else {
      const p = state.productos.find(x => x.ID_PRODUCTO === payload.idProducto);
      if (p) {
        p.STOCK_ACTUAL = toNumber(p.STOCK_ACTUAL) + payload.cantidad;
        if (payload.costoUnitario > 0) p.PRECIO_COSTO = payload.costoUnitario;
      }
      saveDemo();
    }

    byId('stockQty').value = 1;
    byId('stockCost').value = 0;
    byId('stockNotes').value = '';
    renderAll();
    toast('Stock actualizado.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function openPaymentDialog(idVenta) {
  const venta = state.ventas.find(v => v.ID_VENTA === idVenta);
  if (!venta) return;

  byId('paymentSaleId').value = idVenta;
  byId('paymentAmount').value = toNumber(venta.SALDO);
  byId('paymentNotes').value = '';
  byId('paymentSaleInfo').textContent = `${venta.CLIENTE || venta.PACIENTE} · saldo ${money.format(toNumber(venta.SALDO))}`;
  byId('paymentDialog').showModal();
}

async function confirmPayment(event) {
  event.preventDefault();

  const payload = {
    idVenta: byId('paymentSaleId').value,
    importe: toNumber(byId('paymentAmount').value),
    formaPago: byId('paymentMethod').value,
    observaciones: byId('paymentNotes').value
  };

  if (payload.importe <= 0) return toast('El importe debe ser mayor a cero.', 'error');

  try {
    if (isConnected()) {
      await api('registrarPago', payload);
      await loadData();
    } else {
      demoRegisterPayment(payload);
    }

    byId('paymentDialog').close();
    renderAll();
    toast('Pago registrado.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function cancelSale(idVenta) {
  if (!confirm('¿Seguro querés anular esta venta? Si está conectada, se devolverá el stock.')) return;

  try {
    if (isConnected()) {
      await api('anularVenta', { idVenta });
      await loadData();
    } else {
      const v = state.ventas.find(x => x.ID_VENTA === idVenta);
      if (v) {
        v.ESTADO = 'Anulada';
        v.SALDO = 0;
      }
      saveDemo();
      recalcDemo();
    }

    renderAll();
    toast('Venta anulada.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function demoSaveSale(payload) {
  const cliente = state.clientes.find(c => (c.ID_CLIENTE || c.ID_PACIENTE) === payload.clienteId);
  const idVenta = `VTA-${Date.now()}`;
  let bruto = 0;
  let final = 0;
  let ganancia = 0;

  payload.items.forEach(item => {
    const product = state.productos.find(p => p.ID_PRODUCTO === item.idProducto);
    const desc = item.descuentoProducto > 0 ? item.descuentoProducto : payload.descuentoGeneral;
    const lineBruto = item.cantidad * item.precioVenta;
    const lineFinal = lineBruto * (1 - desc);
    bruto += lineBruto;
    final += lineFinal;
    ganancia += lineFinal - (toNumber(item.costoUnitario) * item.cantidad);

    state.detallesVentas.push({
      ID_VENTA: idVenta,
      ID_PRODUCTO: item.idProducto,
      PRODUCTO: item.producto,
      CANTIDAD: item.cantidad,
      PRECIO_VENTA_UNIT: item.precioVenta,
      DESC_APLICADO: desc,
      TOTAL_LINEA: lineFinal,
      COSTO_UNITARIO: item.costoUnitario,
      GANANCIA_LINEA: lineFinal - (toNumber(item.costoUnitario) * item.cantidad)
    });

    if (product) product.STOCK_ACTUAL = Math.max(0, toNumber(product.STOCK_ACTUAL) - item.cantidad);
  });

  const pagado = Math.min(toNumber(payload.pagado), final);
  const saldo = Math.max(0, final - pagado);

  state.ventas.push({
    ID_VENTA: idVenta,
    FECHA: new Date().toISOString(),
    ID_CLIENTE: payload.clienteId,
    CLIENTE: clientName(cliente),
    FORMA_PAGO_PRINCIPAL: payload.formaPago,
    TOTAL_BRUTO: bruto,
    DESCUENTO_TOTAL: bruto - final,
    TOTAL_FINAL: final,
    TOTAL_PAGADO: pagado,
    SALDO: saldo,
    ESTADO: saldo <= 0 ? 'Pagada' : (pagado > 0 ? 'Parcial' : 'Pendiente'),
    GANANCIA_ESTIMADA: ganancia,
    OBSERVACIONES: payload.observaciones
  });

  recalcDemo();
  saveDemo();
}

function demoSaveProduct(payload) {
  if (payload.idProducto) {
    const p = state.productos.find(x => x.ID_PRODUCTO === payload.idProducto);
    if (!p) return;
    Object.assign(p, {
      CODIGO: payload.codigo,
      PRODUCTO: payload.producto,
      DESCRIPCION: payload.descripcion,
      CATEGORIA: payload.categoria,
      PRECIO_COSTO: payload.precioCosto,
      PRECIO_REVENTA: payload.precioReventa,
      PRECIO_VENTA_SUGERIDO: payload.precioVentaSugerido,
      STOCK_ACTUAL: payload.stockActual,
      STOCK_MINIMO: payload.stockMinimo,
      ACTIVO: payload.activo
    });
  } else {
    state.productos.push({
      ID_PRODUCTO: `P-${Date.now()}`,
      CODIGO: payload.codigo,
      PRODUCTO: payload.producto,
      DESCRIPCION: payload.descripcion,
      CATEGORIA: payload.categoria,
      PRECIO_COSTO: payload.precioCosto,
      PRECIO_REVENTA: payload.precioReventa,
      PRECIO_VENTA_SUGERIDO: payload.precioVentaSugerido,
      STOCK_ACTUAL: payload.stockActual,
      STOCK_MINIMO: payload.stockMinimo,
      ACTIVO: payload.activo
    });
  }
  saveDemo();
}

function demoRegisterPayment(payload) {
  const v = state.ventas.find(x => x.ID_VENTA === payload.idVenta);
  if (!v) return;
  v.TOTAL_PAGADO = Math.min(toNumber(v.TOTAL_FINAL), toNumber(v.TOTAL_PAGADO) + payload.importe);
  v.SALDO = Math.max(0, toNumber(v.TOTAL_FINAL) - toNumber(v.TOTAL_PAGADO));
  v.ESTADO = v.SALDO <= 0 ? 'Pagada' : 'Parcial';
  recalcDemo();
  saveDemo();
}

function recalcDemo() {
  state.deudores = getDebtors();
  state.dashboard = {
    ventasMes: sum(state.ventas.filter(v => v.ESTADO !== 'Anulada'), 'TOTAL_FINAL'),
    cobradoMes: sum(state.ventas.filter(v => v.ESTADO !== 'Anulada'), 'TOTAL_PAGADO'),
    saldoPendiente: sum(getDebtors(), 'SALDO'),
    gananciaEstimada: estimateProfit()
  };
}

function saveApiUrl() {
  const url = byId('apiUrlInput').value.trim();
  if (!url || !url.startsWith('http') || !url.includes('/exec')) {
    return toast('Pegá una URL válida de Apps Script que termine en /exec.', 'error');
  }

  localStorage.setItem(STORAGE_API_URL, url);
  updateConnectionCard();
  toast('URL guardada en este navegador.', 'ok');
}

function clearApiUrl() {
  localStorage.removeItem(STORAGE_API_URL);
  byId('apiUrlInput').value = '';
  updateConnectionCard();
  loadData().then(() => {
    renderAll();
    toast('Volviste a modo demo.', 'warn');
  });
}

async function testApiUrl() {
  saveApiUrl();
  try {
    const data = await api('getAppData');
    toast(`Conexión correcta. Productos: ${(data.productos || []).length}`, 'ok');
    await reload();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function getDebtors() {
  return state.ventas.filter(v => toNumber(v.SALDO) > 0 && v.ESTADO !== 'Anulada');
}

function estimateProfit() {
  if (state.detallesVentas.length) {
    return sum(state.detallesVentas, 'GANANCIA_LINEA');
  }

  return state.ventas.reduce((acc, v) => acc + toNumber(v.GANANCIA_ESTIMADA), 0);
}

function getResalePrice(p) {
  return firstPositive(
    p.PRECIO_REVENTA,
    p.PRECIO_COMPRA_REVENTA,
    p.PRECIO_VENTA_PROPIO,
    p.PRECIO_VENTA_SUGERIDO
  );
}

function minStock(p) {
  const n = toNumber(p.STOCK_MINIMO);
  return n > 0 ? n : 3;
}

function stockBadge(p) {
  const stock = toNumber(p.STOCK_ACTUAL);
  if (stock <= 0) return '<span class="badge bad">sin stock</span>';
  if (stock <= minStock(p)) return '<span class="badge warn">bajo</span>';
  return '<span class="badge ok">ok</span>';
}

function statusBadge(status = '') {
  const s = String(status || 'Pendiente');
  if (s === 'Pagada') return '<span class="badge ok">Pagada</span>';
  if (s === 'Anulada') return '<span class="badge bad">Anulada</span>';
  if (s === 'Parcial') return '<span class="badge info">Parcial</span>';
  return `<span class="badge warn">${escapeHtml(s)}</span>`;
}

function clientName(c = {}) {
  return `${c.APELLIDO || ''} ${c.NOMBRE || ''}`.trim() || c.CLIENTE || c.PACIENTE || 'Sin nombre';
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-AR');
}

function emptyRow(cols, text) {
  return `<tr><td colspan="${cols}">${escapeHtml(text)}</td></tr>`;
}

function sum(rows, field) {
  return rows.reduce((acc, row) => acc + toNumber(row[field]), 0);
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function firstPositive(...values) {
  for (const value of values) {
    const n = toNumber(value);
    if (n > 0) return n;
  }
  return 0;
}

function percentFromInput(value) {
  let n = toNumber(value);
  if (n > 1) n = n / 100;
  if (n < 0) n = 0;
  if (n > 1) n = 1;
  return n;
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeActive(value) {
  return String(value || 'SI').toUpperCase() !== 'NO';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function toast(message, type = '') {
  const el = byId('toast');
  el.textContent = message;
  el.className = `toast show ${type}`;
  setTimeout(() => el.className = 'toast', 3600);
}

function exportCsv(filename, rows) {
  if (!rows || !rows.length) return toast('No hay datos para exportar.', 'warn');

  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const csv = [
    headers.join(';'),
    ...rows.map(row => headers.map(h => csvValue(row[h])).join(';'))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvValue(value) {
  const v = String(value ?? '').replaceAll('"', '""');
  return `"${v}"`;
}

window.removeSaleItem = removeSaleItem;
window.editProduct = editProduct;
window.openPaymentDialog = openPaymentDialog;
window.cancelSale = cancelSale;
