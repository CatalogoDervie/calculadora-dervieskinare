export const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
export const $ = (id) => document.getElementById(id);
export const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
export const round = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
export const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
export const norm = (v) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
export const today = () => new Date().toISOString().slice(0,10);
export const monthKey = (date) => String(date || new Date().toISOString()).slice(0,7);
export const daysBetween = (a,b=new Date()) => Math.floor((new Date(b)-new Date(a))/(1000*60*60*24));

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
  if (["PARCIAL","PENDIENTE","BAJO STOCK"].includes(s)) return `<span class="badge warn">${s}</span>`;
  return `<span class="badge blue">${s || "INFO"}</span>`;
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

export function lineChart(points, width=720, height=240) {
  if (!points.length) return `<div class="empty">Sin datos para graficar.</div>`;
  const max = Math.max(...points.flatMap(p => [p.sales, p.profit]), 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const y = v => height - (v / max) * (height - 30) - 10;
  const salesPath = points.map((p,i)=>`${i?'L':'M'}${i*step},${y(p.sales)}`).join(" ");
  const profitPath = points.map((p,i)=>`${i?'L':'M'}${i*step},${y(p.profit)}`).join(" ");
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img">
    <path d="${salesPath}" fill="none" stroke="currentColor" stroke-width="3" opacity=".8"/>
    <path d="${profitPath}" fill="none" stroke="#2f7d55" stroke-width="3" opacity=".9"/>
    ${points.map((p,i)=>`<text x="${i*step}" y="${height-2}" font-size="10" fill="currentColor" opacity=".55">${p.label}</text>`).join("")}
  </svg>`;
}
