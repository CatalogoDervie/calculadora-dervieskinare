import { appConfig } from "./firebase-config.js";

const navGroups = [
  {
    label: "Operación diaria",
    items: [
      ["index.html", "Ventas", "ventas"],
      ["pacientes.html", "Pacientes", "pacientes"],
      ["compras.html", "Compras", "compras"],
      ["productos.html", "Productos y stock", "productos"]
    ]
  },
  {
    label: "Gestión y análisis",
    items: [
      ["pagos.html", "Cobros pendientes", "pagos"],
      ["dashboard.html", "Resumen", "dashboard"],
      ["reportes.html", "Reportes", "reportes"],
      ["simulador.html", "Simulador", "simulador"],
      ["catalogo.html", "Catalogo", "catalogo"]
    ]
  }
];

export function mountLayout({ active, title, subtitle, content, uid = "" }) {
  document.documentElement.dataset.theme = "light";

  const navigation = navGroups.map(group => `
    <div class="nav-group">
      <p class="nav-title">${group.label}</p>
      ${group.items.map(([href, label, key]) => `
        <a class="${key === active ? "active" : ""}" href="${href}">
          <span class="nav-dot" aria-hidden="true"></span>
          <span>${label}</span>
        </a>`).join("")}
    </div>`).join("");

  document.body.innerHTML = `
  <div class="mobile">
    <a href="index.html"><img src="assets/logo.svg" alt="Dervie SkinCare Manager"></a>
    <button class="menubtn" id="menuBtn" aria-label="Abrir menú" aria-expanded="false">Menú</button>
  </div>
  <div class="app">
    <aside class="side">
      <a class="logo" href="index.html"><img src="assets/logo.svg" alt="Dervie SkinCare Manager"></a>
      <nav class="nav" aria-label="Navegación principal">${navigation}</nav>
      <div class="side-foot">
        <div class="userbox">
          <strong>${appConfig.clinicName}</strong>
          <span>Sesión segura ${uid ? `· ${uid.slice(0, 8)}` : ""}</span>
        </div>
      </div>
    </aside>
    <main class="main">
      <header class="top">
        <div class="page-heading">
          <p class="eyebrow">Panel administrativo</p>
          <h1>${title}</h1>
          <p class="muted">${subtitle}</p>
        </div>
        <div class="actions"><button class="btn ghost" id="refreshBtn">Actualizar datos</button></div>
      </header>
      ${content}
    </main>
  </div>
  <button class="menu-backdrop" id="menuBackdrop" aria-label="Cerrar menú"></button>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <div id="loading" class="loading"><div class="loadcard"><div class="spin"></div><strong id="loadingText">Cargando...</strong><p class="muted">Estamos actualizando la información.</p></div></div>`;

  const menuButton = document.getElementById("menuBtn");
  const closeMenu = () => {
    document.body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
  };
  menuButton.onclick = () => {
    const isOpen = document.body.classList.toggle("menu-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  };
  document.getElementById("menuBackdrop").onclick = closeMenu;
  document.querySelectorAll(".nav a").forEach(link => link.addEventListener("click", closeMenu));
}
