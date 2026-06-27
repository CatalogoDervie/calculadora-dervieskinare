export const featuredCatalog = [
  { key:"agua-micelar", names:["agua micelar"], title:"Agua Micelar", category:"Limpieza suave", image:"assets/catalogo/agua-micelar.jpg", use:"Primer paso para retirar impurezas sin complejizar la rutina.", stage:"Rutina esencial" },
  { key:"serum-niacinamida", names:["serum niacinamida","niacinamida"], title:"Serum Niacinamida", category:"Serum diario", image:"assets/catalogo/serum-niacinamida.jpg", use:"Producto central por textura liviana y buena rotacion.", stage:"Rutina esencial" },
  { key:"hialcrem", names:["hialcrem"], title:"Hialcrem", category:"Hidratacion liviana", image:"assets/catalogo/hialcrem.jpg", use:"Cierra la rutina diaria con hidratacion de uso cotidiano.", stage:"Rutina esencial" },
  { key:"dermocalmante", names:["dermocalmante"], title:"Dermocalmante", category:"Piel sensible", image:"assets/catalogo/dermocalmante.jpg", use:"Alternativa de confort para piel sensible o sensibilizada.", stage:"Segunda etapa" },
  { key:"espuma-termal", names:["espuma termal"], title:"Espuma Termal", category:"Higiene diaria", image:"assets/catalogo/espuma-termal.jpg", use:"Limpieza con enjuague para rutina general.", stage:"Alternativa limpieza" },
  { key:"espuma-oil-control", names:["espuma oil control","oil control"], title:"Espuma Oil Control", category:"Piel grasa", image:"assets/catalogo/espuma-oil-control.jpg", use:"Limpieza especifica para mayor oleosidad.", stage:"Alternativa limpieza" },
  { key:"serum-vitamina-c", names:["serum vitamina c","vitamina c +","vitamina c"], title:"Serum Vitamina C", category:"Luminosidad", image:"assets/catalogo/serum-vitamina-c.jpg", use:"Incorporacion diurna para luminosidad y aspecto general.", stage:"Segunda etapa" },
  { key:"calendula", names:["calendula"], title:"Calendula", category:"Nutricion y confort", image:"assets/catalogo/calendula.jpg", use:"Textura mas nutritiva para ampliar la propuesta.", stage:"Segunda etapa" }
];

export const packGuides = [
  { key:"rutina-esencial", title:"Rutina esencial", tag:"Inicio recomendado", products:["Agua Micelar","Serum Niacinamida","Hialcrem"], note:"El pack mas simple para comenzar: limpieza + serum + hidratacion." },
  { key:"limpieza-espuma", title:"Rutina con limpieza en espuma", tag:"General", products:["Espuma Termal","Serum Niacinamida","Hialcrem"], note:"Mantiene los tres pasos, reemplazando el limpiador por espuma." },
  { key:"piel-grasa", title:"Rutina para piel grasa", tag:"Oil control", products:["Espuma Oil Control","Serum Niacinamida","Hialcrem"], note:"Una alternativa clara para pacientes con mayor oleosidad." },
  { key:"piel-sensible", title:"Piel sensible o sensibilizada", tag:"Confort", products:["Agua Micelar","Serum Niacinamida","Dermocalmante"], note:"Rutina suave orientada a confort y tolerancia." },
  { key:"luminosidad-diurna", title:"Luminosidad diurna", tag:"Dia", products:["Agua Micelar","Serum Vitamina C","Hialcrem"], note:"Pack facil de explicar para luminosidad y cuidado diario." },
  { key:"segunda-etapa", title:"Segunda etapa de stock", tag:"Ampliacion", products:["Dermocalmante","Calendula","Serum Vitamina C"], note:"Productos para sumar luego de evaluar consultas y reposicion." }
];

export function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function findProduct(products, names) {
  return (products || []).find(product => names.some(name => normalize(product.name).includes(normalize(name))));
}

export function marginFor(product, num) {
  const buy = num(product?.purchasePrice || product?.resalePrice);
  const sale = num(product?.suggestedSalePrice);
  const profit = sale - buy;
  return { buy, sale, profit, margin: sale > 0 ? profit / sale : 0 };
}
