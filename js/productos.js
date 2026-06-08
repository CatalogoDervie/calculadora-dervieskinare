import { initAnonymousAuth, loadAll } from "./firebase-service.js";
import * as FS from "./firebase-service.js";
import { mountLayout } from "./layout.js";
import { $, money, num, round, esc, norm, badge, toast, setLoading, openModal, closeModal, csv, today } from "./ui.js";
const user = await initAnonymousAuth();

const content = `<section class="card"><div class="actions"><button class="btn primary" id="newBtn">Nuevo producto</button><button class="btn" id="importBtn">Importar Excel de precios</button><input id="excelInput" type="file" accept=".xlsx,.xls" style="display:none"><button class="btn" id="exportBtn">Exportar CSV</button></div><p class="help">Formato esperado: Código, Nombre, Importe venta, Importe reventa. Al importar se actualizan precios y se conserva el stock existente.</p><div class="formgrid form3"><div><label>Buscar</label><input id="search" placeholder="Nombre, código, marca..."></div><div><label>Estado</label><select id="filter"><option value="active">Activos</option><option value="all">Todos</option><option value="inactive">Inactivos</option><option value="critical">Críticos</option></select></div><div><label>Orden</label><select id="sort"><option value="name">Nombre</option><option value="stock">Menor stock</option><option value="margin">Menor margen</option></select></div></div></section><section class="card"><div class="tablewrap"><table><thead><tr><th>Producto</th><th>Marca</th><th>Categoría</th><th>Precio compra</th><th>Reventa</th><th>Venta sugerida</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="rows"></tbody></table></div></section>`;
mountLayout({active:"productos",title:"Productos",subtitle:"Alta, baja, modificación, precios y stock.",content,uid:user.uid});
let data=[];document.getElementById("refreshBtn").onclick=load;$("newBtn").onclick=()=>form();$("search").oninput=draw;$("filter").onchange=draw;$("sort").onchange=draw;$("exportBtn").onclick=()=>csv("productos.csv", rows());$("importBtn").onclick=()=>$("excelInput").click();$("excelInput").onchange=importExcel;
await load();
async function load(){setLoading(true,"Cargando productos...");data=(await loadAll()).products;setLoading(false);draw();}
function margin(p){return num(p.suggestedSalePrice)?(num(p.suggestedSalePrice)-num(p.resalePrice))/num(p.suggestedSalePrice):0}
function rows(){let r=[...data];const q=norm($("search").value);r=r.filter(p=>norm(`${p.name} ${p.code} ${p.brand} ${p.category}`).includes(q));const f=$("filter").value;if(f==="active")r=r.filter(p=>p.active!==false);if(f==="inactive")r=r.filter(p=>p.active===false);if(f==="critical")r=r.filter(p=>p.active!==false&&num(p.stock)<=num(p.minStock));const s=$("sort").value;if(s==="stock")r.sort((a,b)=>num(a.stock)-num(b.stock));else if(s==="margin")r.sort((a,b)=>margin(a)-margin(b));else r.sort((a,b)=>String(a.name).localeCompare(String(b.name),"es"));return r}
function draw(){const r=rows();$("rows").innerHTML=r.map(p=>`<tr><td><strong>${esc(p.name)}</strong><div class="help">${esc(p.code||"")}</div></td><td>${esc(p.brand||"")}</td><td>${esc(p.category||"")}</td><td>${money.format(num(p.purchasePrice))}</td><td>${money.format(num(p.resalePrice))}</td><td>${money.format(num(p.suggestedSalePrice))}</td><td>${num(p.stock)<=num(p.minStock)?badge("PENDIENTE"):""} ${num(p.stock)}</td><td>${badge(p.active===false?"INACTIVO":"ACTIVO")}</td><td><button class="btn" onclick="editProd('${p.id}')">Editar</button> <button class="btn danger" onclick="delProd('${p.id}')">Baja</button></td></tr>`).join("")||`<tr><td colspan="9" class="empty">Sin productos.</td></tr>`}
window.editProd=(id)=>form(data.find(p=>p.id===id));
window.delProd=async(id)=>{if(!confirm("¿Dar de baja este producto?"))return;setLoading(true,"Dando de baja...");await FS.deactivateProduct(id);toast("Producto inactivado","ok");await load();setLoading(false)}
function form(p={}){openModal(p.id?"Editar producto":"Nuevo producto",`<form id="f"><input type="hidden" name="id" value="${esc(p.id||"")}"><div class="formgrid form3"><div><label>Código</label><input name="code" value="${esc(p.code||"")}"></div><div><label>Nombre</label><input name="name" required value="${esc(p.name||"")}"></div><div><label>Marca</label><input name="brand" value="${esc(p.brand||"")}"></div></div><div class="formgrid form3"><div><label>Categoría</label><input name="category" value="${esc(p.category||"")}"></div><div><label>Stock</label><input name="stock" type="number" min="0" value="${num(p.stock)}"></div><div><label>Stock mínimo</label><input name="minStock" type="number" min="0" value="${num(p.minStock||3)}"></div></div><div class="formgrid form3"><div><label>Precio compra</label><input name="purchasePrice" type="number" min="0" value="${num(p.purchasePrice)}"></div><div><label>Precio compra / reventa</label><input name="resalePrice" type="number" min="0" value="${num(p.resalePrice)}"></div><div><label>Venta sugerida</label><input name="suggestedSalePrice" type="number" min="0" value="${num(p.suggestedSalePrice)}"></div></div><div class="modal-actions"><button class="btn ghost" type="button" onclick="document.getElementById('modal').close()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`);document.getElementById("f").onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));setLoading(true,"Guardando producto...");await FS.saveProduct(o);toast("Producto guardado","ok");closeModal();await load();setLoading(false)}}



async function importExcel(event){
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if(!file) return;

  if(!window.XLSX){
    toast("No se cargó la librería para leer Excel. Revisá conexión a internet.", "bad");
    return;
  }

  try{
    setLoading(true, "Leyendo Excel...");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const mapped = rows.map(mapExcelProduct).filter(Boolean);

    if(!mapped.length){
      throw new Error("No encontré productos válidos. El Excel debe tener Código, Nombre, Importe venta e Importe reventa.");
    }

    const ok = confirm(`Se detectaron ${mapped.length} productos válidos.\n\nSe van a actualizar precios y agregar productos nuevos.\nEl stock existente NO se toca.\n\n¿Continuar?`);
    if(!ok) return;

    setLoading(true, "Importando productos...");
    const result = await FS.importProductsFromRows(mapped);
    toast(`Importación lista. Nuevos: ${result.inserted}. Actualizados: ${result.updated}. Omitidos: ${result.skipped}.`, "ok");
    await load();
  }catch(error){
    console.error(error);
    toast(error.message, "bad");
  }finally{
    setLoading(false);
  }
}

function mapExcelProduct(row){
  const normalized = {};
  Object.keys(row).forEach(key => normalized[normalizeHeader(key)] = row[key]);

  const code = cleanText(normalized.codigo || normalized.cod || normalized.código);
  const name = cleanText(normalized.nombre || normalized.producto || normalized.descripcion || normalized.descripción);
  const salePrice = toNumber(normalized.importe_venta || normalized.precio_venta || normalized.precio_venta_sugerido || normalized.venta_sugerida);
  const resalePrice = toNumber(normalized.importe_reventa || normalized.precio_reventa || normalized.precio_compra || normalized.compra);

  if(!code || !name || salePrice <= 0 || resalePrice <= 0) return null;

  return {
    code,
    name,
    brand: cleanText(normalized.marca || "DERVIE"),
    category: cleanText(normalized.categoria || normalized.categoría || ""),
    purchasePrice: resalePrice,
    resalePrice,
    suggestedSalePrice: salePrice,
    minStock: 3
  };
}

function normalizeHeader(value){
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanText(value){
  return String(value ?? "").trim();
}

function toNumber(value){
  if(value === null || value === undefined || value === "") return 0;
  if(typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value)
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

