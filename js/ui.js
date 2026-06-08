export const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
export const $ = (id) => document.getElementById(id);
export const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
export const round = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
export const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
export const norm = (v) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
export const today = () => new Date().toISOString().slice(0,10);

export function toast(message, type="") {
  let el = $("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `toast show ${type}`;
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => el.className = "toast", 3500);
}

export function setLoading(show, text="Cargando...") {
  let el = $("loading");
  if (!el) {
    el = document.createElement("div");
    el.id = "loading";
    el.className = "loading";
    el.innerHTML = `<div class="loadcard"><div class="spin"></div><strong id="loadingText"></strong><p class="muted">No cierres la página.</p></div>`;
    document.body.appendChild(el);
  }
  $("loadingText").textContent = text;
  el.classList.toggle("show", Boolean(show));
}

export function badge(status) {
  const s = String(status || "");
  if (["ACTIVO","PAGADA","OK"].includes(s)) return `<span class="badge ok">${s}</span>`;
  if (["ANULADA","INACTIVO","SIN STOCK"].includes(s)) return `<span class="badge bad">${s}</span>`;
  return `<span class="badge warn">${s || "PENDIENTE"}</span>`;
}

export function openModal(title, html) {
  let d = $("modal");
  if (!d) {
    d = document.createElement("dialog");
    d.id = "modal";
    document.body.appendChild(d);
  }
  d.innerHTML = `<div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button class="btn ghost" id="modalClose">✕</button></div>${html}</div>`;
  $("modalClose").onclick = () => d.close();
  d.showModal();
  return d;
}

export function closeModal() {
  const d = $("modal");
  if (d?.open) d.close();
}

export function csv(filename, rows) {
  if (!rows.length) return toast("No hay datos para exportar.", "warn");
  const headers = Object.keys(rows[0]);
  const body = [headers.join(";"), ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replaceAll('"','""')}"`).join(";"))].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
