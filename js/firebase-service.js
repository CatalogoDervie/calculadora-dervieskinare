import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, orderBy, limit, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export function initAnonymousAuth() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve, reject) => {
    let requestedSignIn = false;
    let unsubscribe = () => {};
    unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        unsubscribe();
        resolve(user);
        return;
      }

      if (!requestedSignIn) {
        requestedSignIn = true;
        signInAnonymously(auth).catch(error => {
          unsubscribe();
          reject(error);
        });
      }
    });
  });
}

export function col(name) {
  return collection(db, name);
}

export function ref(name, id) {
  return doc(db, name, id);
}

export async function listDocs(name, orderField = "createdAt", direction = "desc", max = 900) {
  try {
    const snap = await getDocs(query(col(name), orderBy(orderField, direction), limit(max)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(col(name));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

export function makeId(prefix) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0,14)}-${Math.floor(Math.random() * 10000)}`;
}

export function n(v) {
  const x = Number(v || 0);
  return Number.isFinite(x) ? x : 0;
}

export function round(v) {
  return Math.round((n(v) + Number.EPSILON) * 100) / 100;
}

function positiveInteger(value, label = "Cantidad") {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} debe ser un número entero mayor a cero.`);
  return parsed;
}

function nonNegativeMoney(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} debe ser un importe válido mayor o igual a cero.`);
  return round(parsed);
}

export function purchaseDiscountRate(quantity) {
  const q = n(quantity);
  if (q >= 20) return 0.20;
  if (q >= 15) return 0.15;
  if (q >= 10) return 0.10;
  return 0;
}

export async function loadAll() {
  const [products, patients, purchases, sales, payments, stockMovements] = await Promise.all([
    listDocs("products", "name", "asc"),
    listDocs("patients", "searchName", "asc"),
    listDocs("purchases"),
    listDocs("sales"),
    listDocs("payments"),
    listDocs("stockMovements")
  ]);

  return { products, patients, purchases, sales, payments, stockMovements };
}

async function listAllDocs(name) {
  const snap = await getDocs(col(name));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function loadReportingData() {
  const [products, patients, purchases, sales, payments, stockMovements] = await Promise.all([
    listAllDocs("products"),
    listAllDocs("patients"),
    listAllDocs("purchases"),
    listAllDocs("sales"),
    listAllDocs("payments"),
    listAllDocs("stockMovements")
  ]);

  return { products, patients, purchases, sales, payments, stockMovements };
}

export async function saveProduct(product) {
  const id = product.id || product.code || makeId("PROD");
  const priceCompra = n(product.purchasePrice || product.resalePrice);
  const payload = {
    code: String(product.code || "").trim(),
    name: String(product.name || "").trim(),
    brand: String(product.brand || "").trim(),
    category: String(product.category || "").trim(),
    stock: n(product.stock),
    minStock: n(product.minStock || 3),
    purchasePrice: priceCompra,
    resalePrice: priceCompra,
    suggestedSalePrice: n(product.suggestedSalePrice),
    active: product.active !== false,
    updatedAt: serverTimestamp()
  };
  if (!payload.name) throw new Error("El producto necesita nombre.");
  if (!Number.isInteger(Number(product.stock)) || payload.stock < 0) throw new Error("El stock debe ser un entero mayor o igual a cero.");
  if (!Number.isInteger(Number(product.minStock || 3)) || payload.minStock < 0) throw new Error("El stock mínimo debe ser un entero mayor o igual a cero.");
  if (payload.purchasePrice < 0 || payload.suggestedSalePrice < 0) throw new Error("Los precios no pueden ser negativos.");
  await setDoc(ref("products", id), { ...payload, createdAt: product.id ? product.createdAt || serverTimestamp() : serverTimestamp() }, { merge: true });
  return id;
}

export async function importProductsFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("No hay productos válidos para importar.");
  let inserted = 0, updated = 0, skipped = 0;

  for (const raw of rows) {
    const code = String(raw.code || "").trim();
    const name = String(raw.name || "").trim();
    if (!code || !name) { skipped++; continue; }

    const productRef = ref("products", code);
    const current = await getDoc(productRef);
    const previous = current.exists() ? current.data() : {};
    const existingStock = current.exists() ? n(previous.stock) : 0;
    const existingMinStock = current.exists() ? n(previous.minStock || 3) : n(raw.minStock || 3);

    const priceCompra = n(raw.purchasePrice || raw.resalePrice);
    const suggestedSalePrice = n(raw.suggestedSalePrice);
    if (priceCompra <= 0 || suggestedSalePrice <= 0) { skipped++; continue; }

    await setDoc(productRef, {
      code,
      name,
      brand: String(raw.brand || previous.brand || "DERVIE").trim(),
      category: String(raw.category || previous.category || "").trim(),
      purchasePrice: priceCompra,
      resalePrice: priceCompra,
      suggestedSalePrice,
      stock: existingStock,
      minStock: existingMinStock,
      active: true,
      updatedAt: serverTimestamp(),
      createdAt: previous.createdAt || serverTimestamp()
    }, { merge: true });

    current.exists() ? updated++ : inserted++;
  }
  return { inserted, updated, skipped, total: rows.length, created: inserted };
}

export async function deactivateProduct(id) {
  await updateDoc(ref("products", id), { active: false, updatedAt: serverTimestamp() });
}

export async function savePatient(patient) {
  const dni = String(patient.dni || "").replace(/\D/g, "");
  const id = patient.id || dni || makeId("PAC");
  const firstName = String(patient.firstName || "").trim().toUpperCase();
  const lastName = String(patient.lastName || "").trim().toUpperCase();

  if (!firstName || !lastName) throw new Error("Nombre y apellido son obligatorios.");

  if (!patient.id && dni) {
    const exists = await getDoc(ref("patients", dni));
    if (exists.exists()) throw new Error("Ya existe un paciente con ese DNI.");
  }

  const payload = {
    firstName,
    lastName,
    fullName: `${lastName} ${firstName}`,
    searchName: `${lastName} ${firstName} ${dni}`.toLowerCase(),
    dni,
    phone: String(patient.phone || "").trim(),
    birthDate: String(patient.birthDate || ""),
    notes: String(patient.notes || "").trim(),
    active: patient.active !== false,
    updatedAt: serverTimestamp()
  };

  await setDoc(ref("patients", id), { ...payload, createdAt: patient.id ? patient.createdAt || serverTimestamp() : serverTimestamp() }, { merge: true });
  return id;
}

export async function deactivatePatient(id) {
  await updateDoc(ref("patients", id), { active: false, updatedAt: serverTimestamp() });
}

export async function createPurchase(data) {
  const productId = data.productId;
  const quantity = positiveInteger(data.quantity);
  if (!productId) throw new Error("Seleccioná un producto.");

  const id = makeId("COMPRA");

  await runTransaction(db, async tx => {
    const productRef = ref("products", productId);
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists()) throw new Error("Producto inexistente.");

    const product = productSnap.data();
    const unitPrice = data.unitPrice === "" || data.unitPrice == null
      ? nonNegativeMoney(product.purchasePrice || product.resalePrice, "Precio de compra")
      : nonNegativeMoney(data.unitPrice, "Precio de compra");
    if (unitPrice <= 0) throw new Error("El precio de compra debe ser mayor a cero.");
    const subtotal = round(unitPrice * quantity);
    const discountRate = purchaseDiscountRate(quantity);
    const discountAmount = round(subtotal * discountRate);
    const total = round(subtotal - discountAmount);
    const suggestedSaleTotal = round(n(product.suggestedSalePrice) * quantity);
    const estimatedProfit = round(suggestedSaleTotal - total);
    const newStock = n(product.stock) + quantity;

    tx.update(productRef, { stock: newStock, updatedAt: serverTimestamp() });
    tx.set(ref("purchases", id), {
      id,
      productId,
      productName: product.name,
      quantity,
      unitPrice,
      subtotal,
      discountRate,
      discountAmount,
      total,
      suggestedSaleTotal,
      estimatedProfit,
      date: data.date || new Date().toISOString().slice(0, 10),
      notes: String(data.notes || ""),
      createdAt: serverTimestamp()
    });
    tx.set(ref("stockMovements", makeId("MOV")), {
      type: "COMPRA",
      productId,
      productName: product.name,
      quantity,
      resultingStock: newStock,
      referenceId: id,
      date: new Date().toISOString(),
      createdAt: serverTimestamp()
    });
  });

  return id;
}

export async function createPurchaseBatch(items, notes = "") {
  if (!items || !items.length) throw new Error("Agregá productos a la compra.");
  const batchId = makeId("SIMCOMPRA");

  await runTransaction(db, async tx => {
    const reads = [];
    for (const item of items) {
      const productRef = ref("products", item.productId);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists()) throw new Error("Producto inexistente.");
      reads.push({ productRef, productSnap, item });
    }

    for (const { productRef, productSnap, item } of reads) {
      const p = productSnap.data();
      const quantity = positiveInteger(item.quantity);
      const unitPrice = item.unitPrice === "" || item.unitPrice == null
        ? nonNegativeMoney(p.purchasePrice || p.resalePrice, "Precio de compra")
        : nonNegativeMoney(item.unitPrice, "Precio de compra");
      if (unitPrice <= 0) throw new Error("El precio de compra debe ser mayor a cero.");
      const subtotal = round(unitPrice * quantity);
      const discountRate = purchaseDiscountRate(quantity);
      const discountAmount = round(subtotal * discountRate);
      const total = round(subtotal - discountAmount);
      const suggestedSaleTotal = round(n(p.suggestedSalePrice) * quantity);
      const estimatedProfit = round(suggestedSaleTotal - total);
      const newStock = n(p.stock) + quantity;
      const purchaseId = makeId("COMPRA");

      tx.update(productRef, { stock: newStock, updatedAt: serverTimestamp() });
      tx.set(ref("purchases", purchaseId), {
        id: purchaseId,
        batchId,
        productId: item.productId,
        productName: p.name,
        quantity,
        unitPrice,
        subtotal,
        discountRate,
        discountAmount,
        total,
        suggestedSaleTotal,
        estimatedProfit,
        date: new Date().toISOString().slice(0,10),
        notes,
        createdAt: serverTimestamp()
      });
      tx.set(ref("stockMovements", makeId("MOV")), {
        type: "COMPRA",
        batchId,
        productId: item.productId,
        productName: p.name,
        quantity,
        resultingStock: newStock,
        referenceId: purchaseId,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
    }
  });

  return batchId;
}

export async function createSale(data) {
  if (!data.patientId) throw new Error("Seleccioná paciente.");
  if (!data.items || !data.items.length) throw new Error("Agregá productos.");

  const id = makeId("VENTA");

  await runTransaction(db, async tx => {
    const patientSnap = await tx.get(ref("patients", data.patientId));
    if (!patientSnap.exists()) throw new Error("Paciente inexistente.");
    const patient = patientSnap.data();

    const groupedItems = new Map();
    for (const rawItem of data.items) {
      if (!rawItem.productId) throw new Error("Hay un producto inválido en la venta.");
      const quantity = positiveInteger(rawItem.quantity);
      const unitPrice = nonNegativeMoney(rawItem.unitPrice, "Precio de venta");
      if (unitPrice <= 0) throw new Error("El precio de venta debe ser mayor a cero.");
      const current = groupedItems.get(rawItem.productId);
      if (current && current.unitPrice !== unitPrice) throw new Error(`El producto ${rawItem.productName || "seleccionado"} está repetido con precios diferentes.`);
      groupedItems.set(rawItem.productId, current
        ? { ...current, quantity: current.quantity + quantity }
        : { ...rawItem, quantity, unitPrice, costPrice: nonNegativeMoney(rawItem.costPrice, "Precio de compra") });
    }
    const saleItems = [...groupedItems.values()];
    const discountRate = Number(data.discountRate ?? 0);
    if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 1) throw new Error("El descuento debe estar entre 0% y 100%.");

    const productSnaps = [];
    for (const item of saleItems) {
      const productRef = ref("products", item.productId);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists()) throw new Error("Producto inexistente.");
      const p = productSnap.data();
      if (p.active === false) throw new Error(`El producto ${p.name} está inactivo.`);
      if (n(p.stock) <= 0) throw new Error(`Sin stock: ${p.name}.`);
      if (n(p.stock) < item.quantity) throw new Error(`Stock insuficiente: ${p.name}. Disponible: ${n(p.stock)}.`);
      productSnaps.push({ productRef, productSnap, item });
    }

    const subtotal = round(saleItems.reduce((a, i) => a + i.quantity * i.unitPrice, 0));
    const discountAmount = round(subtotal * discountRate);
    const total = round(subtotal - discountAmount);
    const payments = (data.payments || []).map(p => ({ ...p, amount: nonNegativeMoney(p.amount, "Pago") }));
    const paid = round(payments.reduce((a, p) => a + p.amount, 0));

    if (paid > total) throw new Error("El pago no puede superar el total.");

    const balance = round(total - paid);
    const status = balance <= 0 ? "PAGADA" : (paid > 0 ? "PARCIAL" : "PENDIENTE");

    tx.set(ref("sales", id), {
      id,
      patientId: data.patientId,
      patientName: patient.fullName,
      items: saleItems,
      subtotal,
      discountRate,
      discountAmount,
      total,
      paid,
      balance,
      status,
      notes: String(data.notes || ""),
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
      canceled: false
    });

    for (const { productRef, productSnap, item } of productSnaps) {
      const p = productSnap.data();
      const newStock = n(p.stock) - n(item.quantity);
      tx.update(productRef, { stock: newStock, updatedAt: serverTimestamp() });
      tx.set(ref("stockMovements", makeId("MOV")), {
        type: "VENTA",
        productId: item.productId,
        productName: p.name,
        quantity: -n(item.quantity),
        resultingStock: newStock,
        referenceId: id,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
    }

    for (const pay of payments) {
      if (n(pay.amount) <= 0) continue;
      tx.set(ref("payments", makeId("PAGO")), {
        saleId: id,
        patientId: data.patientId,
        patientName: patient.fullName,
        method: pay.method,
        amount: n(pay.amount),
        date: new Date().toISOString(),
        notes: "Pago al crear venta",
        createdAt: serverTimestamp(),
        canceled: false
      });
    }
  });

  return id;
}

export async function registerPayment(data) {
  const amount = n(data.amount);
  if (!data.saleId || amount <= 0) throw new Error("Pago inválido.");

  await runTransaction(db, async tx => {
    const saleRef = ref("sales", data.saleId);
    const saleSnap = await tx.get(saleRef);
    if (!saleSnap.exists()) throw new Error("Venta inexistente.");

    const sale = saleSnap.data();
    if (sale.canceled) throw new Error("La venta está anulada.");

    const newPaid = round(n(sale.paid) + amount);
    if (newPaid > n(sale.total)) throw new Error("El pago supera el saldo.");

    const balance = round(n(sale.total) - newPaid);
    const status = balance <= 0 ? "PAGADA" : "PARCIAL";

    tx.update(saleRef, { paid: newPaid, balance, status, updatedAt: serverTimestamp() });
    tx.set(ref("payments", makeId("PAGO")), {
      saleId: data.saleId,
      patientId: sale.patientId,
      patientName: sale.patientName,
      method: data.method,
      amount,
      date: new Date().toISOString(),
      notes: String(data.notes || ""),
      createdAt: serverTimestamp(),
      canceled: false
    });
  });
}

export async function cancelSale(saleId) {
  await runTransaction(db, async tx => {
    const saleRef = ref("sales", saleId);
    const saleSnap = await tx.get(saleRef);
    if (!saleSnap.exists()) throw new Error("Venta inexistente.");

    const sale = saleSnap.data();
    if (sale.canceled) throw new Error("La venta ya fue anulada.");

    for (const item of sale.items || []) {
      const productRef = ref("products", item.productId);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists()) continue;

      const product = productSnap.data();
      const newStock = n(product.stock) + n(item.quantity);

      tx.update(productRef, { stock: newStock, updatedAt: serverTimestamp() });
      tx.set(ref("stockMovements", makeId("MOV")), {
        type: "ANULACION_VENTA",
        productId: item.productId,
        productName: product.name,
        quantity: n(item.quantity),
        resultingStock: newStock,
        referenceId: saleId,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
    }

    tx.update(saleRef, { canceled: true, status: "ANULADA", balance: 0, updatedAt: serverTimestamp() });
  });
}
