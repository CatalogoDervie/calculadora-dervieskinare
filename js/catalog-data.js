export const featuredCatalog = [
  { key:"agua-micelar", names:["agua micelar"], title:"Agua Micelar", category:"Limpieza suave", image:"assets/catalogo/agua-micelar.jpg", use:"Primer paso para retirar impurezas sin complejizar la rutina.", stage:"Rutina esencial", detail:"Ideal como limpiador de entrada para pacientes que necesitan una rutina simple. Puede usarse en packs iniciales o como alternativa para piel sensible.", pairing:"Combina bien con Niacinamida y una hidratante liviana." },
  { key:"serum-niacinamida", names:["serum niacinamida","niacinamida"], title:"Serum Niacinamida", category:"Serum diario", image:"assets/catalogo/serum-niacinamida.jpg", use:"Producto central por textura liviana y buena rotacion.", stage:"Rutina esencial", detail:"Funciona como paso de tratamiento cosmetico dentro de rutinas simples. Es facil de explicar porque no obliga a cambiar toda la rutina.", pairing:"Base de la rutina esencial junto a Agua Micelar e Hialcrem." },
  { key:"hialcrem", names:["hialcrem"], title:"Hialcrem", category:"Hidratacion liviana", image:"assets/catalogo/hialcrem.jpg", use:"Cierra la rutina diaria con hidratacion de uso cotidiano.", stage:"Rutina esencial", detail:"Hidratante de uso diario para completar packs iniciales. Conviene tenerla como producto de rotacion porque acompana varias rutinas.", pairing:"Cierre natural para Agua Micelar + Niacinamida." },
  { key:"dermocalmante", names:["dermocalmante"], title:"Dermocalmante", category:"Piel sensible", image:"assets/catalogo/dermocalmante.jpg", use:"Alternativa de confort para piel sensible o sensibilizada.", stage:"Segunda etapa", detail:"Buena opcion cuando la paciente necesita una crema orientada a tolerancia y confort. En packs con Vitamina C debe contarse como una alternativa a Calendula, no como crema adicional.", pairing:"Opcion de crema para Serum Vitamina C cuando se busca confort." },
  { key:"espuma-termal", names:["espuma termal"], title:"Espuma Termal", category:"Higiene diaria", image:"assets/catalogo/espuma-termal.jpg", use:"Limpieza con enjuague para rutina general.", stage:"Alternativa limpieza", detail:"Permite ofrecer una rutina de limpieza con enjuague sin modificar el resto del pack. Es util para pacientes que prefieren espuma.", pairing:"Reemplaza Agua Micelar en la rutina esencial." },
  { key:"espuma-oil-control", names:["espuma oil control","oil control"], title:"Espuma Oil Control", category:"Piel grasa", image:"assets/catalogo/espuma-oil-control.jpg", use:"Limpieza especifica para mayor oleosidad.", stage:"Alternativa limpieza", detail:"Limpieza mas especifica para rutinas orientadas a piel grasa o con mayor oleosidad.", pairing:"Reemplaza Agua Micelar en la rutina para piel grasa." },
  { key:"serum-vitamina-c", names:["serum vitamina c","vitamina c +","vitamina c"], title:"Serum Vitamina C", category:"Luminosidad", image:"assets/catalogo/serum-vitamina-c.jpg", use:"Incorporacion diurna para luminosidad y aspecto general.", stage:"Segunda etapa", detail:"Producto para sumar luego de la rutina esencial. En packs de dia se acompana con una crema a eleccion: Dermocalmante o Calendula.", pairing:"Puede venderse con Dermocalmante o Calendula segun perfil de piel." },
  { key:"calendula", names:["calendula"], title:"Calendula", category:"Nutricion y confort", image:"assets/catalogo/calendula.jpg", use:"Textura mas nutritiva para ampliar la propuesta.", stage:"Segunda etapa", detail:"Crema de textura mas nutritiva. En packs con Vitamina C debe contarse como alternativa a Dermocalmante, no como producto adicional.", pairing:"Opcion de crema para Serum Vitamina C cuando se busca mas nutricion." }
];

export const packGuides = [
  { key:"rutina-esencial", title:"Rutina esencial", tag:"Inicio recomendado", products:["Agua Micelar","Serum Niacinamida","Hialcrem"], note:"El pack mas simple para comenzar: limpieza + serum + hidratacion." },
  { key:"limpieza-espuma", title:"Rutina con limpieza en espuma", tag:"General", products:["Espuma Termal","Serum Niacinamida","Hialcrem"], note:"Mantiene los tres pasos, reemplazando el limpiador por espuma." },
  { key:"piel-grasa", title:"Rutina para piel grasa", tag:"Oil control", products:["Espuma Oil Control","Serum Niacinamida","Hialcrem"], note:"Una alternativa clara para pacientes con mayor oleosidad." },
  { key:"piel-sensible", title:"Piel sensible o sensibilizada", tag:"Confort", products:["Agua Micelar","Serum Niacinamida","Dermocalmante"], note:"Rutina suave orientada a confort y tolerancia." },
  { key:"luminosidad-diurna", title:"Luminosidad diurna", tag:"Dia", note:"Serum Vitamina C + una crema a eleccion. No suma dos cremas en el valor del pack.", variants:[
    { label:"Con Dermocalmante", products:["Serum Vitamina C","Dermocalmante"] },
    { label:"Con Calendula", products:["Serum Vitamina C","Calendula"] }
  ] },
  { key:"segunda-etapa", title:"Ampliacion con Vitamina C", tag:"Ampliacion", note:"Para ampliar la linea: elegir una crema de confort y sumarla al Serum Vitamina C.", variants:[
    { label:"Vitamina C + Dermocalmante", products:["Serum Vitamina C","Dermocalmante"] },
    { label:"Vitamina C + Calendula", products:["Serum Vitamina C","Calendula"] }
  ] }
];

export function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function findProduct(products, names) {
  const expandedNames = (names || []).flatMap(name => {
    const normalizedName = normalize(name);
    const catalogItem = featuredCatalog.find(item => normalize(item.title) === normalizedName || item.names.some(alias => normalize(alias) === normalizedName));
    return catalogItem ? [name, catalogItem.title, ...catalogItem.names] : [name];
  });
  return (products || []).find(product => expandedNames.some(name => normalize(product.name).includes(normalize(name))));
}

export function marginFor(product, num) {
  const buy = num(product?.purchasePrice || product?.resalePrice);
  const sale = num(product?.suggestedSalePrice);
  const profit = sale - buy;
  return { buy, sale, profit, margin: sale > 0 ? profit / sale : 0 };
}

export function packProducts(pack, variantIndex = 0) {
  if (pack.variants?.length) return pack.variants[variantIndex]?.products || pack.variants[0].products;
  return pack.products || [];
}
