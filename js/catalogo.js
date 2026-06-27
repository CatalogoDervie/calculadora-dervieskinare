import { initAnonymousAuth, loadAll } from "./firebase-service.js?v=20260627e";
import { mountLayout } from "./layout.js?v=20260627e";
import { $, money, num, esc, setLoading } from "./ui.js";
import { featuredCatalog, packGuides, findProduct, marginFor, packProducts } from "./catalog-data.js?v=20260627e";

const user = await initAnonymousAuth();

const content = `
<section class="catalog-brief">
  <article>
    <span class="section-kicker">Catalogo comercial</span>
    <h2>Ocho productos para comenzar con una propuesta clara</h2>
    <p>Una seleccion breve para presentar la linea, calcular margen por unidad y ordenar las primeras rutinas sin cargar un stock demasiado amplio.</p>
  </article>
  <div class="catalog-brief-actions">
    <a class="btn primary" href="simulador.html">Abrir simulador</a>
    <a class="btn ghost" href="productos.html">Ver productos</a>
  </div>
</section>

<section class="grid cols3" id="catalogStats"></section>

<section class="card">
  <div class="catalog-section-head">
    <div>
      <h2>Catalogo principal para vender mejor</h2>
      <p class="muted">Cada tarjeta toma los precios cargados en Productos para calcular margen y ganancia estimada.</p>
    </div>
    <div class="catalog-filters" id="stageFilters"></div>
  </div>
  <div class="featured-catalog" id="featuredCatalog"></div>
</section>

<section class="card">
  <div class="catalog-section-head">
    <div>
      <h2>Packs recomendados</h2>
      <p class="muted">Formas simples de ofrecer la linea: empezar con tres pasos, cambiar el limpiador segun piel y ampliar luego segun rotacion.</p>
    </div>
  </div>
  <div class="pack-grid" id="packGrid"></div>
</section>`;

mountLayout({ active:"catalogo", title:"Catalogo Dervie", subtitle:"Productos principales, margen por unidad y packs recomendados para vender la linea.", content, uid:user.uid });

document.getElementById("refreshBtn").onclick = load;

let all = {};
let currentStage = "Todos";

await load();

async function load(){
  setLoading(true, "Cargando catalogo...");
  all = await loadAll();
  setLoading(false);
  drawStageFilters();
  drawCatalog();
}

function drawStageFilters(){
  const stages = ["Todos", ...new Set(featuredCatalog.map(item => item.stage))];
  $("stageFilters").innerHTML = stages.map(stage => `<button class="btn ${stage === currentStage ? "primary" : "ghost"}" data-stage="${esc(stage)}">${esc(stage)}</button>`).join("");
  $("stageFilters").querySelectorAll("button").forEach(button => {
    button.onclick = () => {
      currentStage = button.dataset.stage;
      drawStageFilters();
      drawCatalog();
    };
  });
}

function catalogRows(){
  return featuredCatalog.map(item => {
    const product = findProduct(all.products, item.names);
    return { item, product, margin: marginFor(product, num) };
  });
}

function drawStats(rows){
  const priced = rows.filter(row => row.product);
  const avgMargin = priced.length ? priced.reduce((acc, row) => acc + row.margin.margin, 0) / priced.length : 0;
  const avgProfit = priced.length ? priced.reduce((acc, row) => acc + row.margin.profit, 0) / priced.length : 0;
  $("catalogStats").innerHTML = `
    <article class="card kpi"><span>Productos principales</span><strong>${rows.length}</strong><small>Seleccion inicial de catalogo</small></article>
    <article class="card kpi"><span>Margen promedio</span><strong>${Math.round(avgMargin * 100)}%</strong><small>Segun precios cargados</small></article>
    <article class="card kpi"><span>Ganancia promedio</span><strong>${money.format(avgProfit)}</strong><small>Por unidad sugerida</small></article>`;
}

function drawCatalog(){
  const rows = catalogRows();
  const visibleRows = currentStage === "Todos" ? rows : rows.filter(row => row.item.stage === currentStage);
  drawStats(rows);

  $("featuredCatalog").innerHTML = visibleRows.map(({ item, product, margin }) => `
    <article class="catalog-product">
      <img src="${item.image}" alt="${esc(item.title)}" loading="lazy">
      <div class="catalog-product-body">
        <small>${esc(item.stage)}</small>
        <h3>${esc(item.title)}</h3>
        <span>${esc(item.category)}</span>
        <p>${esc(item.use)}</p>
        <details class="product-detail">
          <summary>Ver detalles</summary>
          <p>${esc(item.detail)}</p>
          <span>${esc(item.pairing)}</span>
        </details>
        <div class="catalog-metrics">
          <b>${product ? money.format(margin.sale) : "Sin precio"}</b>
          <em>Margen ${product ? Math.round(margin.margin * 100) + "%" : "-"}</em>
          <em>Gana ${product ? money.format(margin.profit) : "-"}</em>
        </div>
      </div>
    </article>`).join("");

  $("packGrid").innerHTML = packGuides.map(pack => {
    const variants = pack.variants?.length ? pack.variants : [{ label:"Pack completo", products: packProducts(pack) }];
    return `<article class="pack-card">
      <small>${esc(pack.tag)}</small>
      <h3>${esc(pack.title)}</h3>
      <p>${esc(pack.note)}</p>
      <div class="pack-variants">
        ${variants.map((variant, index) => {
          const found = variant.products.map(name => findProduct(all.products, [name])).filter(Boolean);
          const totals = found.reduce((acc, product) => {
            const m = marginFor(product, num);
            acc.sale += m.sale;
            acc.profit += m.profit;
            return acc;
          }, { sale:0, profit:0 });
          const complete = found.length === variant.products.length;
          return `<div class="pack-variant">
            <b>${esc(variant.label)}</b>
            <ul>${variant.products.map(product => `<li>${esc(product)}</li>`).join("")}</ul>
            <div class="pack-total"><span>Venta pack</span><strong>${complete ? money.format(totals.sale) : "Completar precios"}</strong><span>Ganancia estimada</span><strong>${complete ? money.format(totals.profit) : "-"}</strong></div>
            <a class="btn ghost block pack-action" href="simulador.html?pack=${encodeURIComponent(pack.key)}&variant=${index}">Simular esta opcion</a>
          </div>`;
        }).join("")}
      </div>
    </article>`;
  }).join("");
}
