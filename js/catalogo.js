import { initAnonymousAuth, loadAll } from "./firebase-service.js?v=20260627b";
import { mountLayout } from "./layout.js?v=20260627b";
import { $, money, num, esc, setLoading } from "./ui.js";

const user = await initAnonymousAuth();

const featuredCatalog = [
  { key:"agua-micelar", names:["agua micelar"], title:"Agua Micelar", category:"Limpieza suave", image:"assets/catalogo/agua-micelar.jpg", use:"Primer paso para retirar impurezas sin complejizar la rutina.", stage:"Rutina esencial" },
  { key:"serum-niacinamida", names:["serum niacinamida","niacinamida"], title:"Serum Niacinamida", category:"Serum diario", image:"assets/catalogo/serum-niacinamida.jpg", use:"Producto central por textura liviana y buena rotacion.", stage:"Rutina esencial" },
  { key:"hialcrem", names:["hialcrem"], title:"Hialcrem", category:"Hidratacion liviana", image:"assets/catalogo/hialcrem.jpg", use:"Cierra la rutina diaria con hidratacion de uso cotidiano.", stage:"Rutina esencial" },
  { key:"dermocalmante", names:["dermocalmante"], title:"Dermocalmante", category:"Piel sensible", image:"assets/catalogo/dermocalmante.jpg", use:"Alternativa de confort para piel sensible o sensibilizada.", stage:"Segunda etapa" },
  { key:"espuma-termal", names:["espuma termal"], title:"Espuma Termal", category:"Higiene diaria", image:"assets/catalogo/espuma-termal.jpg", use:"Limpieza con enjuague para rutina general.", stage:"Alternativa limpieza" },
  { key:"espuma-oil-control", names:["espuma oil control","oil control"], title:"Espuma Oil Control", category:"Piel grasa", image:"assets/catalogo/espuma-oil-control.jpg", use:"Limpieza especifica para mayor oleosidad.", stage:"Alternativa limpieza" },
  { key:"serum-vitamina-c", names:["serum vitamina c","vitamina c +","vitamina c"], title:"Serum Vitamina C", category:"Luminosidad", image:"assets/catalogo/serum-vitamina-c.jpg", use:"Incorporacion diurna para luminosidad y aspecto general.", stage:"Segunda etapa" },
  { key:"calendula", names:["calendula"], title:"Calendula", category:"Nutricion y confort", image:"assets/catalogo/calendula.jpg", use:"Textura mas nutritiva para ampliar la propuesta.", stage:"Segunda etapa" }
];

const packGuides = [
  { title:"Rutina esencial", tag:"Inicio recomendado", products:["Agua Micelar","Serum Niacinamida","Hialcrem"], note:"El pack mas simple para comenzar: limpieza + serum + hidratacion." },
  { title:"Rutina con limpieza en espuma", tag:"General", products:["Espuma Termal","Serum Niacinamida","Hialcrem"], note:"Mantiene los tres pasos, reemplazando el limpiador por espuma." },
  { title:"Rutina para piel grasa", tag:"Oil control", products:["Espuma Oil Control","Serum Niacinamida","Hialcrem"], note:"Una alternativa clara para pacientes con mayor oleosidad." },
  { title:"Piel sensible o sensibilizada", tag:"Confort", products:["Agua Micelar","Serum Niacinamida","Dermocalmante"], note:"Rutina suave orientada a confort y tolerancia." },
  { title:"Luminosidad diurna", tag:"Dia", products:["Agua Micelar","Serum Vitamina C","Hialcrem"], note:"Pack facil de explicar para luminosidad y cuidado diario." },
  { title:"Segunda etapa de stock", tag:"Ampliacion", products:["Dermocalmante","Calendula","Serum Vitamina C"], note:"Productos para sumar luego de evaluar consultas y reposicion." }
];

const content = `<section class="card"><h2>Catalogo principal para vender mejor</h2><p class="muted">Ocho productos para presentar la linea sin hacer una propuesta demasiado extensa. Cada tarjeta toma los precios cargados en Productos para calcular margen y ganancia estimada.</p><div class="featured-catalog" id="featuredCatalog"></div></section><section class="card"><h2>Packs recomendados</h2><p class="muted">Formas simples de ofrecer la linea: empezar con tres pasos, cambiar el limpiador segun piel y ampliar luego segun rotacion.</p><div class="pack-grid" id="packGrid"></div></section>`;

mountLayout({ active:"catalogo", title:"Catalogo Dervie", subtitle:"Productos principales, margen por unidad y packs recomendados para vender la linea.", content, uid:user.uid });

document.getElementById("refreshBtn").onclick = load;

let all = {};
await load();

async function load(){
  setLoading(true, "Cargando catalogo...");
  all = await loadAll();
  setLoading(false);
  drawCatalog();
}

function normalize(value){ return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function findProduct(names){ return all.products.find(p => names.some(name => normalize(p.name).includes(normalize(name)))); }
function marginFor(product){ const buy = num(product?.purchasePrice || product?.resalePrice); const sale = num(product?.suggestedSalePrice); const profit = sale - buy; return { buy, sale, profit, margin: sale > 0 ? profit / sale : 0 }; }

function drawCatalog(){
  $("featuredCatalog").innerHTML = featuredCatalog.map(item => {
    const product = findProduct(item.names);
    const m = marginFor(product);
    return `<article class="catalog-product">
      <img src="${item.image}" alt="${esc(item.title)}" loading="lazy">
      <div class="catalog-product-body">
        <small>${esc(item.stage)}</small>
        <h3>${esc(item.title)}</h3>
        <span>${esc(item.category)}</span>
        <p>${esc(item.use)}</p>
        <div class="catalog-metrics">
          <b>${product ? money.format(m.sale) : "Sin precio"}</b>
          <em>Margen ${product ? Math.round(m.margin * 100) + "%" : "-"}</em>
          <em>Gana ${product ? money.format(m.profit) : "-"}</em>
        </div>
      </div>
    </article>`;
  }).join("");

  $("packGrid").innerHTML = packGuides.map(pack => {
    const found = pack.products.map(name => findProduct([name])).filter(Boolean);
    const totals = found.reduce((acc, product) => {
      const m = marginFor(product);
      acc.sale += m.sale;
      acc.profit += m.profit;
      return acc;
    }, { sale:0, profit:0 });
    return `<article class="pack-card">
      <small>${esc(pack.tag)}</small>
      <h3>${esc(pack.title)}</h3>
      <p>${esc(pack.note)}</p>
      <ul>${pack.products.map(product => `<li>${esc(product)}</li>`).join("")}</ul>
      <div class="pack-total"><span>Venta pack</span><strong>${found.length ? money.format(totals.sale) : "Completar precios"}</strong><span>Ganancia estimada</span><strong>${found.length ? money.format(totals.profit) : "-"}</strong></div>
    </article>`;
  }).join("");
}
