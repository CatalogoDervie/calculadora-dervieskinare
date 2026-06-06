/*
  Backend Apps Script - Dervie SkinCare

  Instrucciones:
  1. Abrir la planilla.
  2. Extensiones > Apps Script.
  3. Pegar este archivo como Code.gs.
  4. Ejecutar testConexionPlanilla.
  5. Ejecutar inicializarSistema.
  6. Implementar como Aplicación web.
*/

const SPREADSHEET_ID = '18K0DbRbM9ztIzfTmUIAzAUltrsff96dfjaCcNiLCnVE';

const SHEETS = {
  CONFIG: 'Configuracion',
  PRODUCTOS: 'Productos',
  CLIENTES: 'Clientes',
  LEGACY_PACIENTES: 'Pacientes',
  VENTAS: 'Ventas',
  DETALLE_VENTAS: 'DetalleVentas',
  PAGOS: 'Pagos',
  COMPRAS: 'Compras',
  DETALLE_COMPRAS: 'DetalleCompras',
  MOV_STOCK: 'MovimientosStock',
  LISTAS: 'Listas'
};

const HEADERS = {
  Configuracion: ['Campo','Valor'],
  Productos: ['ID_PRODUCTO','CODIGO','PRODUCTO','DESCRIPCION','CATEGORIA','PRECIO_COSTO','PRECIO_REVENTA','PRECIO_VENTA_SUGERIDO','PRECIO_VENTA_PROPIO','STOCK_ACTUAL','STOCK_MINIMO','ACTIVO','CANT_DESC_1','DESC_1','CANT_DESC_2','DESC_2','FECHA_ACTUALIZACION'],
  Clientes: ['ID_CLIENTE','FECHA_ALTA','APELLIDO','NOMBRE','DNI','TELEFONO','OBSERVACIONES','ACTIVO'],
  Ventas: ['ID_VENTA','FECHA','ID_CLIENTE','CLIENTE','FORMA_PAGO_PRINCIPAL','TOTAL_BRUTO','DESCUENTO_TOTAL','TOTAL_FINAL','TOTAL_PAGADO','SALDO','ESTADO','GANANCIA_ESTIMADA','OBSERVACIONES'],
  DetalleVentas: ['ID_VENTA','ID_PRODUCTO','PRODUCTO','CANTIDAD','PRECIO_VENTA_UNIT','DESCUENTO_PRODUCTO','DESCUENTO_GENERAL','DESC_APLICADO','TOTAL_LINEA','COSTO_UNITARIO','COSTO_TOTAL','GANANCIA_LINEA'],
  Pagos: ['ID_PAGO','ID_VENTA','FECHA','CLIENTE','FORMA_PAGO','IMPORTE','OBSERVACIONES'],
  Compras: ['ID_COMPRA','FECHA','TOTAL_COMPRA','OBSERVACIONES'],
  DetalleCompras: ['ID_COMPRA','ID_PRODUCTO','PRODUCTO','CANTIDAD','PRECIO_COMPRA_UNIT','DESC_APLICADO','TOTAL_LINEA'],
  MovimientosStock: ['ID_MOVIMIENTO','FECHA','TIPO','ID_REFERENCIA','ID_PRODUCTO','PRODUCTO','CANTIDAD','STOCK_RESULTANTE','OBSERVACIONES'],
  Listas: ['FormasPago','EstadosVenta','Activo']
};

function doGet() {
  return json_({ ok: true, data: { message: 'Backend Dervie SkinCare activo' } });
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const action = body.action;
    const payload = body.payload || {};
    let data;

    switch (action) {
      case 'getAppData':
        data = getAppData();
        break;
      case 'crearCliente':
      case 'crearPaciente':
        data = crearCliente(payload);
        break;
      case 'guardarProducto':
        data = guardarProducto(payload);
        break;
      case 'guardarVenta':
        data = guardarVenta(payload);
        break;
      case 'registrarPago':
        data = registrarPago(payload);
        break;
      case 'anularVenta':
        data = anularVenta(payload);
        break;
      case 'registrarIngresoStock':
        data = registrarIngresoStock(payload);
        break;
      case 'inicializarSistema':
        data = inicializarSistema();
        break;
      case 'testConexion':
        data = testConexionPlanilla();
        break;
      default:
        throw new Error('Acción no reconocida: ' + action);
    }

    return json_({ ok: true, data: data });
  } catch (err) {
    return json_({ ok: false, error: err.message || String(err) });
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSS_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'PEGAR_ID_DE_LA_PLANILLA') {
    throw new Error('Falta configurar SPREADSHEET_ID.');
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function testConexionPlanilla() {
  return 'Conexión correcta con: ' + getSS_().getName();
}

function inicializarSistema() {
  const ss = getSS_();

  Object.keys(HEADERS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    ensureHeaderRow_(sh, HEADERS[name]);
  });

  // Compatibilidad: si existe Pacientes, se conserva. Si no existe, no hace falta.
  let legacy = ss.getSheetByName(SHEETS.LEGACY_PACIENTES);
  if (legacy) {
    ensureHeaderRow_(legacy, ['ID_PACIENTE','ID_CLIENTE','FECHA_ALTA','APELLIDO','NOMBRE','DNI','TELEFONO','OBSERVACIONES','ACTIVO']);
  }

  const config = getSheet_(SHEETS.CONFIG);
  if (config.getLastRow() < 2) {
    config.getRange(1,1,9,2).setValues([
      ['Campo','Valor'],
      ['NombreSistema','Control de Cremas Dervie'],
      ['TextoPersona','Cliente'],
      ['PermitirStockNegativo','NO'],
      ['DescuentoGeneralNoAcumulaConIndividual','SI'],
      ['Proveedor','Mayorista'],
      ['ReglaPedidoBase','15 unidades del mismo producto = 20%'],
      ['Frontend','GitHub Pages'],
      ['FechaInstalacion', new Date()]
    ]);
  }

  const listas = getSheet_(SHEETS.LISTAS);
  if (listas.getLastRow() <= 1) {
    listas.getRange(1,1,7,3).setValues([
      ['FormasPago','EstadosVenta','Activo'],
      ['Efectivo','Pagada','SI'],
      ['Transferencia','Parcial','NO'],
      ['Débito','Pendiente',''],
      ['Crédito','Anulada',''],
      ['Mixto','',''],
      ['Pendiente','','']
    ]);
  }

  return 'Sistema inicializado correctamente.';
}

function getAppData() {
  inicializarSistema();

  const productos = getObjects_(SHEETS.PRODUCTOS)
    .map(normalizeProducto_)
    .filter(p => String(p.ACTIVO || 'SI').toUpperCase() !== 'NO');

  const clientes = getClientes_();
  const ventas = getVentasResumen_();
  const detallesVentas = getObjects_(SHEETS.DETALLE_VENTAS);
  const deudores = ventas.filter(v => toNumber_(v.SALDO) > 0 && v.ESTADO !== 'Anulada');

  return {
    productos,
    clientes,
    pacientes: clientes,
    ventas,
    deudores,
    detallesVentas,
    dashboard: getDashboard_(ventas, productos, detallesVentas)
  };
}

function getClientes_() {
  const ss = getSS_();
  const clientes = getObjects_(SHEETS.CLIENTES).map(normalizeCliente_);

  // Si todavía usás la hoja vieja Pacientes, también se suma.
  const legacy = ss.getSheetByName(SHEETS.LEGACY_PACIENTES);
  if (legacy) {
    const legacyRows = getObjectsFromSheet_(legacy).map(normalizeCliente_);
    const ids = {};
    clientes.forEach(c => ids[c.ID_CLIENTE] = true);
    legacyRows.forEach(c => {
      if (!ids[c.ID_CLIENTE]) clientes.push(c);
    });
  }

  return clientes.filter(c => String(c.ACTIVO || 'SI').toUpperCase() !== 'NO');
}

function crearCliente(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const apellido = clean_(data.apellido);
    const nombre = clean_(data.nombre);
    if (!apellido && !nombre) throw new Error('Cargá apellido/razón social o nombre.');

    const obj = {
      ID_CLIENTE: makeId_('CLI'),
      FECHA_ALTA: new Date(),
      APELLIDO: apellido,
      NOMBRE: nombre,
      DNI: clean_(data.dni),
      TELEFONO: clean_(data.telefono),
      OBSERVACIONES: clean_(data.observaciones),
      ACTIVO: 'SI'
    };

    appendObject_(SHEETS.CLIENTES, obj);
    return normalizeCliente_(obj);
  } finally {
    lock.releaseLock();
  }
}

function guardarProducto(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const id = clean_(data.idProducto);
    const obj = {
      ID_PRODUCTO: id || makeId_('PROD'),
      CODIGO: clean_(data.codigo),
      PRODUCTO: clean_(data.producto),
      DESCRIPCION: clean_(data.descripcion),
      CATEGORIA: clean_(data.categoria),
      PRECIO_COSTO: toNumber_(data.precioCosto),
      PRECIO_REVENTA: toNumber_(data.precioReventa),
      PRECIO_VENTA_SUGERIDO: toNumber_(data.precioVentaSugerido),
      PRECIO_VENTA_PROPIO: toNumber_(data.precioVentaPropio),
      STOCK_ACTUAL: toNumber_(data.stockActual),
      STOCK_MINIMO: toNumber_(data.stockMinimo) || 3,
      ACTIVO: clean_(data.activo) || 'SI',
      CANT_DESC_1: toNumber_(data.cantDesc1) || 15,
      DESC_1: normalizePercent_(data.desc1 || 0.2),
      CANT_DESC_2: toNumber_(data.cantDesc2),
      DESC_2: normalizePercent_(data.desc2),
      FECHA_ACTUALIZACION: new Date()
    };

    const sh = getSheet_(SHEETS.PRODUCTOS);
    const values = getValues_(SHEETS.PRODUCTOS);
    const idx = headerIndex_(values[0]);
    const row = id ? findRowIndex_(values, idx.ID_PRODUCTO, id) : -1;

    if (row >= 0) {
      updateRowObject_(sh, row + 1, obj);
    } else {
      appendObject_(SHEETS.PRODUCTOS, obj);
    }

    return normalizeProducto_(obj);
  } finally {
    lock.releaseLock();
  }
}

function guardarVenta(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const clienteId = clean_(payload.clienteId || payload.pacienteId);
    const items = payload.items || [];
    if (!clienteId) throw new Error('Seleccioná un cliente.');
    if (!items.length) throw new Error('Agregá al menos un producto.');

    const productos = getObjects_(SHEETS.PRODUCTOS).map(normalizeProducto_);
    const productoMap = {};
    productos.forEach(p => productoMap[p.ID_PRODUCTO] = p);

    const cliente = getClientes_().find(c => c.ID_CLIENTE === clienteId || c.ID_PACIENTE === clienteId);
    if (!cliente) throw new Error('No encontré el cliente.');

    const clienteNombre = [cliente.APELLIDO, cliente.NOMBRE].filter(Boolean).join(' ').trim();
    const generalDisc = normalizePercent_(payload.descuentoGeneral);

    let totalBruto = 0;
    let descuentoTotal = 0;
    let totalFinal = 0;
    let gananciaTotal = 0;
    const detalles = [];

    items.forEach(raw => {
      const prod = productoMap[clean_(raw.idProducto)];
      if (!prod) throw new Error('Producto inválido.');

      const cantidad = toNumber_(raw.cantidad);
      if (cantidad <= 0) throw new Error('Cantidad inválida en ' + prod.PRODUCTO);

      if (toNumber_(prod.STOCK_ACTUAL) < cantidad) {
        throw new Error('No hay stock suficiente de ' + prod.PRODUCTO + '. Stock actual: ' + prod.STOCK_ACTUAL);
      }

      const precioVenta = toNumber_(raw.precioVenta) || getSalePrice_(prod);
      const descProducto = normalizePercent_(raw.descuentoProducto);
      const descAplicado = descProducto > 0 ? descProducto : generalDisc;

      const brutoLinea = cantidad * precioVenta;
      const totalLinea = round2_(brutoLinea * (1 - descAplicado));
      const costoUnit = toNumber_(prod.PRECIO_COSTO);
      const costoTotal = round2_(cantidad * costoUnit);
      const ganancia = round2_(totalLinea - costoTotal);

      totalBruto += brutoLinea;
      descuentoTotal += brutoLinea - totalLinea;
      totalFinal += totalLinea;
      gananciaTotal += ganancia;

      detalles.push({
        ID_PRODUCTO: prod.ID_PRODUCTO,
        PRODUCTO: prod.PRODUCTO,
        CANTIDAD: cantidad,
        PRECIO_VENTA_UNIT: precioVenta,
        DESCUENTO_PRODUCTO: descProducto,
        DESCUENTO_GENERAL: generalDisc,
        DESC_APLICADO: descAplicado,
        TOTAL_LINEA: totalLinea,
        COSTO_UNITARIO: costoUnit,
        COSTO_TOTAL: costoTotal,
        GANANCIA_LINEA: ganancia
      });
    });

    totalBruto = round2_(totalBruto);
    descuentoTotal = round2_(descuentoTotal);
    totalFinal = round2_(totalFinal);
    gananciaTotal = round2_(gananciaTotal);

    const pagado = Math.min(toNumber_(payload.pagado), totalFinal);
    const saldo = round2_(totalFinal - pagado);
    const estado = saldo <= 0 ? 'Pagada' : (pagado > 0 ? 'Parcial' : 'Pendiente');
    const idVenta = makeId_('VTA');

    appendObject_(SHEETS.VENTAS, {
      ID_VENTA: idVenta,
      FECHA: payload.fecha ? new Date(payload.fecha) : new Date(),
      ID_CLIENTE: clienteId,
      CLIENTE: clienteNombre,
      FORMA_PAGO_PRINCIPAL: clean_(payload.formaPago) || 'Efectivo',
      TOTAL_BRUTO: totalBruto,
      DESCUENTO_TOTAL: descuentoTotal,
      TOTAL_FINAL: totalFinal,
      TOTAL_PAGADO: round2_(pagado),
      SALDO: saldo,
      ESTADO: estado,
      GANANCIA_ESTIMADA: gananciaTotal,
      OBSERVACIONES: clean_(payload.observaciones)
    });

    detalles.forEach(d => {
      appendObject_(SHEETS.DETALLE_VENTAS, Object.assign({ ID_VENTA: idVenta }, d));
      const stock = updateStock_(d.ID_PRODUCTO, -d.CANTIDAD);

      appendObject_(SHEETS.MOV_STOCK, {
        ID_MOVIMIENTO: makeId_('MOV'),
        FECHA: new Date(),
        TIPO: 'VENTA',
        ID_REFERENCIA: idVenta,
        ID_PRODUCTO: d.ID_PRODUCTO,
        PRODUCTO: d.PRODUCTO,
        CANTIDAD: -d.CANTIDAD,
        STOCK_RESULTANTE: stock,
        OBSERVACIONES: 'Venta/entrega a ' + clienteNombre
      });
    });

    if (pagado > 0) {
      appendObject_(SHEETS.PAGOS, {
        ID_PAGO: makeId_('PAG'),
        ID_VENTA: idVenta,
        FECHA: new Date(),
        CLIENTE: clienteNombre,
        FORMA_PAGO: clean_(payload.formaPago) || 'Efectivo',
        IMPORTE: round2_(pagado),
        OBSERVACIONES: 'Pago al crear venta'
      });
    }

    return { idVenta, totalFinal, pagado, saldo, estado };
  } finally {
    lock.releaseLock();
  }
}

function registrarPago(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const idVenta = clean_(payload.idVenta);
    const importe = toNumber_(payload.importe);

    if (!idVenta || importe <= 0) throw new Error('Venta o importe inválido.');

    const sh = getSheet_(SHEETS.VENTAS);
    const values = getValues_(SHEETS.VENTAS);
    const idx = headerIndex_(values[0]);
    const row = findRowIndex_(values, idx.ID_VENTA, idVenta);
    if (row < 0) throw new Error('No encontré la venta.');

    if (String(values[row][idx.ESTADO]) === 'Anulada') {
      throw new Error('La venta está anulada.');
    }

    const total = toNumber_(values[row][idx.TOTAL_FINAL]);
    const actual = toNumber_(values[row][idx.TOTAL_PAGADO]);
    const nuevo = Math.min(total, actual + importe);
    const saldo = round2_(total - nuevo);
    const estado = saldo <= 0 ? 'Pagada' : 'Parcial';

    sh.getRange(row + 1, idx.TOTAL_PAGADO + 1).setValue(round2_(nuevo));
    sh.getRange(row + 1, idx.SALDO + 1).setValue(saldo);
    sh.getRange(row + 1, idx.ESTADO + 1).setValue(estado);

    appendObject_(SHEETS.PAGOS, {
      ID_PAGO: makeId_('PAG'),
      ID_VENTA: idVenta,
      FECHA: new Date(),
      CLIENTE: values[row][idx.CLIENTE],
      FORMA_PAGO: clean_(payload.formaPago) || 'Transferencia',
      IMPORTE: round2_(importe),
      OBSERVACIONES: clean_(payload.observaciones)
    });

    return { idVenta, totalPagado: round2_(nuevo), saldo, estado };
  } finally {
    lock.releaseLock();
  }
}

function anularVenta(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const idVenta = clean_(payload.idVenta);
    if (!idVenta) throw new Error('Venta inválida.');

    const sh = getSheet_(SHEETS.VENTAS);
    const values = getValues_(SHEETS.VENTAS);
    const idx = headerIndex_(values[0]);
    const row = findRowIndex_(values, idx.ID_VENTA, idVenta);
    if (row < 0) throw new Error('No encontré la venta.');
    if (String(values[row][idx.ESTADO]) === 'Anulada') throw new Error('La venta ya está anulada.');

    const detalles = getObjects_(SHEETS.DETALLE_VENTAS).filter(d => clean_(d.ID_VENTA) === idVenta);

    detalles.forEach(d => {
      const cantidad = toNumber_(d.CANTIDAD);
      const stock = updateStock_(d.ID_PRODUCTO, cantidad);

      appendObject_(SHEETS.MOV_STOCK, {
        ID_MOVIMIENTO: makeId_('MOV'),
        FECHA: new Date(),
        TIPO: 'ANULACION_VENTA',
        ID_REFERENCIA: idVenta,
        ID_PRODUCTO: d.ID_PRODUCTO,
        PRODUCTO: d.PRODUCTO,
        CANTIDAD: cantidad,
        STOCK_RESULTANTE: stock,
        OBSERVACIONES: 'Anulación de venta'
      });
    });

    sh.getRange(row + 1, idx.ESTADO + 1).setValue('Anulada');
    sh.getRange(row + 1, idx.SALDO + 1).setValue(0);

    return { idVenta, estado: 'Anulada' };
  } finally {
    lock.releaseLock();
  }
}

function registrarIngresoStock(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const idProducto = clean_(payload.idProducto);
    const cantidad = toNumber_(payload.cantidad);
    const costoUnit = toNumber_(payload.costoUnitario);

    if (!idProducto || cantidad <= 0) throw new Error('Producto o cantidad inválida.');

    const producto = getObjects_(SHEETS.PRODUCTOS).map(normalizeProducto_).find(p => p.ID_PRODUCTO === idProducto);
    if (!producto) throw new Error('No encontré el producto.');

    const idCompra = makeId_('COM');
    const total = round2_(cantidad * costoUnit);

    appendObject_(SHEETS.COMPRAS, {
      ID_COMPRA: idCompra,
      FECHA: new Date(),
      TOTAL_COMPRA: total,
      OBSERVACIONES: clean_(payload.observaciones)
    });

    appendObject_(SHEETS.DETALLE_COMPRAS, {
      ID_COMPRA: idCompra,
      ID_PRODUCTO: idProducto,
      PRODUCTO: producto.PRODUCTO,
      CANTIDAD: cantidad,
      PRECIO_COMPRA_UNIT: costoUnit,
      DESC_APLICADO: 0,
      TOTAL_LINEA: total
    });

    const stock = updateStock_(idProducto, cantidad);

    appendObject_(SHEETS.MOV_STOCK, {
      ID_MOVIMIENTO: makeId_('MOV'),
      FECHA: new Date(),
      TIPO: 'COMPRA',
      ID_REFERENCIA: idCompra,
      ID_PRODUCTO: idProducto,
      PRODUCTO: producto.PRODUCTO,
      CANTIDAD: cantidad,
      STOCK_RESULTANTE: stock,
      OBSERVACIONES: clean_(payload.observaciones)
    });

    if (costoUnit > 0) updateProductField_(idProducto, 'PRECIO_COSTO', costoUnit);

    return { idCompra, stock };
  } finally {
    lock.releaseLock();
  }
}

function getDashboard_(ventas, productos, detalles) {
  const activas = ventas.filter(v => v.ESTADO !== 'Anulada');
  return {
    ventasMes: sum_(activas, 'TOTAL_FINAL'),
    cobradoMes: sum_(activas, 'TOTAL_PAGADO'),
    saldoPendiente: sum_(activas, 'SALDO'),
    gananciaEstimada: detalles && detalles.length ? sum_(detalles, 'GANANCIA_LINEA') : sum_(activas, 'GANANCIA_ESTIMADA'),
    productosActivos: productos.filter(p => String(p.ACTIVO || 'SI').toUpperCase() !== 'NO').length
  };
}

function getVentasResumen_() {
  return getObjects_(SHEETS.VENTAS).map(v => ({
    ID_VENTA: v.ID_VENTA,
    FECHA: v.FECHA,
    ID_CLIENTE: v.ID_CLIENTE || v.ID_PACIENTE,
    CLIENTE: v.CLIENTE || v.PACIENTE,
    PACIENTE: v.CLIENTE || v.PACIENTE,
    FORMA_PAGO_PRINCIPAL: v.FORMA_PAGO_PRINCIPAL,
    TOTAL_BRUTO: toNumber_(v.TOTAL_BRUTO),
    DESCUENTO_TOTAL: toNumber_(v.DESCUENTO_TOTAL),
    TOTAL_FINAL: toNumber_(v.TOTAL_FINAL),
    TOTAL_PAGADO: toNumber_(v.TOTAL_PAGADO),
    SALDO: toNumber_(v.SALDO),
    ESTADO: v.ESTADO || 'Pendiente',
    GANANCIA_ESTIMADA: toNumber_(v.GANANCIA_ESTIMADA),
    OBSERVACIONES: v.OBSERVACIONES
  }));
}

function normalizeProducto_(p) {
  const precioCosto = firstNumber_(p.PRECIO_COSTO, p.PRECIO_COMPRA, p.IMPORTE_COMPRA);
  const precioReventa = firstNumber_(p.PRECIO_REVENTA, p.PRECIO_COMPRA_REVENTA, p.IMPORTE_REVENTA, p.PRECIO_VENTA_PROPIO, p.PRECIO_VENTA_SUGERIDO);

  return {
    ID_PRODUCTO: clean_(p.ID_PRODUCTO),
    CODIGO: clean_(p.CODIGO),
    PRODUCTO: clean_(p.PRODUCTO),
    DESCRIPCION: clean_(p.DESCRIPCION),
    CATEGORIA: clean_(p.CATEGORIA),
    PRECIO_COSTO: precioCosto,
    PRECIO_REVENTA: precioReventa,
    PRECIO_COMPRA_REVENTA: precioReventa,
    PRECIO_VENTA_SUGERIDO: toNumber_(p.PRECIO_VENTA_SUGERIDO || p.IMPORTE_VENTA),
    PRECIO_VENTA_PROPIO: toNumber_(p.PRECIO_VENTA_PROPIO),
    STOCK_ACTUAL: toNumber_(p.STOCK_ACTUAL),
    STOCK_MINIMO: toNumber_(p.STOCK_MINIMO) || 3,
    ACTIVO: p.ACTIVO || 'SI',
    CANT_DESC_1: toNumber_(p.CANT_DESC_1),
    DESC_1: normalizePercent_(p.DESC_1),
    CANT_DESC_2: toNumber_(p.CANT_DESC_2),
    DESC_2: normalizePercent_(p.DESC_2)
  };
}

function normalizeCliente_(c) {
  const id = clean_(c.ID_CLIENTE || c.ID_PACIENTE) || makeId_('CLI');
  return {
    ID_CLIENTE: id,
    ID_PACIENTE: id,
    FECHA_ALTA: c.FECHA_ALTA,
    APELLIDO: clean_(c.APELLIDO),
    NOMBRE: clean_(c.NOMBRE),
    DNI: clean_(c.DNI),
    TELEFONO: clean_(c.TELEFONO),
    OBSERVACIONES: clean_(c.OBSERVACIONES),
    ACTIVO: c.ACTIVO || 'SI'
  };
}

function getSalePrice_(p) {
  return firstNumber_(p.PRECIO_REVENTA, p.PRECIO_COMPRA_REVENTA, p.PRECIO_VENTA_PROPIO, p.PRECIO_VENTA_SUGERIDO);
}

function updateStock_(idProducto, delta) {
  const sh = getSheet_(SHEETS.PRODUCTOS);
  const values = getValues_(SHEETS.PRODUCTOS);
  const idx = headerIndex_(values[0]);
  const row = findRowIndex_(values, idx.ID_PRODUCTO, idProducto);
  if (row < 0) throw new Error('No encontré el producto para stock.');

  const actual = toNumber_(values[row][idx.STOCK_ACTUAL]);
  const nuevo = actual + toNumber_(delta);
  if (nuevo < 0) throw new Error('La operación dejaría stock negativo.');

  sh.getRange(row + 1, idx.STOCK_ACTUAL + 1).setValue(nuevo);
  if (idx.FECHA_ACTUALIZACION !== undefined) {
    sh.getRange(row + 1, idx.FECHA_ACTUALIZACION + 1).setValue(new Date());
  }
  return nuevo;
}

function updateProductField_(idProducto, field, value) {
  const sh = getSheet_(SHEETS.PRODUCTOS);
  const values = getValues_(SHEETS.PRODUCTOS);
  const idx = headerIndex_(values[0]);
  if (idx[field] === undefined) return;

  const row = findRowIndex_(values, idx.ID_PRODUCTO, idProducto);
  if (row < 0) return;

  sh.getRange(row + 1, idx[field] + 1).setValue(value);
}

function getSheet_(name) {
  const sh = getSS_().getSheetByName(name);
  if (!sh) throw new Error('No existe la hoja: ' + name + '. Ejecutá inicializarSistema.');
  return sh;
}

function getValues_(sheetName) {
  const sh = getSheet_(sheetName);
  const values = sh.getDataRange().getValues();
  if (!values.length) return [[]];
  return values;
}

function getObjects_(sheetName) {
  return getObjectsFromSheet_(getSheet_(sheetName));
}

function getObjectsFromSheet_(sh) {
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0].map(h => clean_(h));

  return values.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
}

function appendObject_(sheetName, obj) {
  const sh = getSheet_(sheetName);
  ensureHeaderRow_(sh, HEADERS[sheetName] || Object.keys(obj));
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => clean_(h));
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sh.appendRow(row);
}

function updateRowObject_(sh, rowNumber, obj) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => clean_(h));
  headers.forEach((h, index) => {
    if (obj[h] !== undefined) {
      sh.getRange(rowNumber, index + 1).setValue(obj[h]);
    }
  });
}

function ensureHeaderRow_(sh, requiredHeaders) {
  if (sh.getLastRow() === 0 || sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
  } else {
    const current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(h => clean_(h));
    requiredHeaders.forEach(h => {
      if (current.indexOf(h) === -1) {
        sh.getRange(1, sh.getLastColumn() + 1).setValue(h);
        current.push(h);
      }
    });
  }

  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn())
    .setFontWeight('bold')
    .setBackground('#7b4d39')
    .setFontColor('#ffffff');
}

function headerIndex_(headers) {
  const idx = {};
  headers.forEach((h, i) => idx[clean_(h)] = i);
  return idx;
}

function findRowIndex_(values, colIndex, value) {
  if (colIndex === undefined || colIndex < 0) return -1;
  for (let i = 1; i < values.length; i++) {
    if (clean_(values[i][colIndex]) === clean_(value)) return i;
  }
  return -1;
}

function makeId_(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 1000);
}

function clean_(value) {
  return String(value === undefined || value === null ? '' : value).trim();
}

function toNumber_(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(String(value).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function normalizePercent_(value) {
  let n = toNumber_(value);
  if (n > 1) n = n / 100;
  if (n < 0) n = 0;
  if (n > 1) n = 1;
  return n;
}

function firstNumber_() {
  for (let i = 0; i < arguments.length; i++) {
    const n = toNumber_(arguments[i]);
    if (n > 0) return n;
  }
  return 0;
}

function round2_(n) {
  return Math.round((toNumber_(n) + Number.EPSILON) * 100) / 100;
}

function sum_(rows, field) {
  return rows.reduce((acc, row) => acc + toNumber_(row[field]), 0);
}
