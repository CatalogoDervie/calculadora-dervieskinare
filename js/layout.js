import { appConfig } from "./firebase-config.js";

const nav = [
  ["index.html","Dashboard","📊","dashboard"],
  ["productos.html","Productos","🧴","productos"],
  ["ventas.html","Ventas","🧾","ventas"],
  ["pacientes.html","Pacientes","👤","pacientes"],
  ["compras.html","Compras","📦","compras"],
  ["pagos.html","Pagos","💳","pagos"],
  ["reportes.html","Reportes","📈","reportes"]
];

export function mountLayout({ active, title, subtitle, content, uid = "" }) {
  const theme = localStorage.getItem("theme") || "light";
  document.documentElement.dataset.theme = theme;

  document.body.innerHTML = `
  <div class="mobile"><img src="assets/logo.svg"><button class="menubtn" id="menuBtn">☰</button></div>
  <div class="app">
    <aside class="side">
      <a class="logo" href="index.html"><img src="assets/logo.svg" alt="Dervie"></a>
      <nav class="nav">
        ${nav.map(([href,label,icon,key]) => `<a class="${key===active?'active':''}" href="${href}"><span>${icon}</span>${label}</a>`).join("")}
      </nav>
      <div class="side-foot">
        <div class="userbox">
          <strong>${appConfig.clinicName}</strong>
          <span>Firebase Anonymous ${uid ? "· " + uid.slice(0,8) + "..." : ""}</span>
        </div>
        <button class="btn ghost" id="themeBtn">Modo ${theme === "dark" ? "claro" : "oscuro"}</button>
      </div>
    </aside>
    <main class="main">
      <header class="top">
        <div><p class="eyebrow">Gestión interna</p><h1>${title}</h1><p class="muted">${subtitle}</p></div>
        <div class="actions"><button class="btn ghost" id="refreshBtn">Actualizar</button></div>
      </header>
      ${content}
    </main>
  </div>
  <div id="toast" class="toast"></div>
  <div id="loading" class="loading"><div class="loadcard"><div class="spin"></div><strong id="loadingText">Cargando...</strong><p class="muted">No cierres la página.</p></div></div>`;

  document.getElementById("menuBtn").onclick = () => document.body.classList.toggle("menu-open");
  document.getElementById("themeBtn").onclick = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    location.reload();
  };
}
