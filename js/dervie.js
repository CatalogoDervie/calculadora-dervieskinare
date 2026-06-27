import { mountLayout } from "./layout.js?v=20260627f";
import { $, esc, toast, setLoading } from "./ui.js";
import { featuredCatalog } from "./catalog-data.js?v=20260627f";

const contentUrl = new URL("../content/dervie-profesionales.json", import.meta.url);
const page = await fetch(contentUrl).then(response => {
  if (!response.ok) throw new Error("No se pudo cargar el contenido de Dervie.");
  return response.json();
});

const asset = path => `../${path}`;
const productByKey = key => featuredCatalog.find(product => product.key === key);

mountLayout({
  active: "dervie",
  title: "Dervie para profesionales",
  subtitle: "Presentacion institucional y comercial para medicas y profesionales de la salud.",
  content: renderPage(page),
  basePath: "../",
  eyebrow: "Propuesta profesional",
  showRefresh: false
});

bindInteractions(page);

function renderPage(data) {
  const products = data.products.featuredKeys.map(productByKey).filter(Boolean);
  return `
    <nav class="pro-nav" aria-label="Secciones de Dervie para profesionales">
      ${data.nav.map(item => `<a href="${esc(item.href)}">${esc(item.label)}</a>`).join("")}
    </nav>

    <section class="pro-hero" id="inicio">
      <article class="pro-hero-copy">
        <span class="section-kicker">${esc(data.hero.kicker)}</span>
        <h2>${esc(data.hero.title)}</h2>
        <p class="pro-lead">${esc(data.hero.lead)}</p>
        <p>${esc(data.hero.support)}</p>
        <div class="actions">
          <a class="btn primary" href="#contacto">${esc(data.hero.primaryCta)}</a>
          <a class="btn ghost" href="#como-funciona">${esc(data.hero.secondaryCta)}</a>
        </div>
      </article>
      <div class="pro-hero-products" aria-label="Productos Dervie destacados">
        ${products.slice(0, 5).map((product, index) => `
          <figure class="pro-product-float pro-product-float-${index + 1}">
            <img src="${asset(product.image)}" alt="${esc(product.title)}" ${index > 1 ? 'loading="lazy"' : ""}>
          </figure>`).join("")}
      </div>
    </section>

    <section class="pro-section pro-split" id="nace">
      <article class="card">
        <span class="section-kicker">Por que nace Dervie</span>
        <h2>${esc(data.origin.title)}</h2>
        <p>${esc(data.origin.text)}</p>
        <p class="pro-note">${esc(data.origin.closing)}</p>
      </article>
      <div class="pro-question-grid">
        ${data.origin.questions.map(question => `<div class="pro-question">${esc(question)}</div>`).join("")}
      </div>
    </section>

    <section class="pro-section pro-split" id="que-es">
      <article>
        <span class="section-kicker">Que es Dervie</span>
        <h2>${esc(data.definition.title)}</h2>
        ${data.definition.paragraphs.map(text => `<p>${esc(text)}</p>`).join("")}
      </article>
      <aside class="pro-notice">
        <strong>Criterio profesional</strong>
        <p>${esc(data.definition.notice)}</p>
      </aside>
    </section>

    <section class="pro-section" aria-labelledby="respaldo-title">
      <div class="section-head">
        <div>
          <span class="section-kicker">Respaldo del proyecto</span>
          <h2 id="respaldo-title">${esc(data.proof.title)}</h2>
        </div>
      </div>
      <div class="pro-proof-grid">
        ${data.proof.items.map(item => `
          <article class="card kpi pro-proof">
            <span>${esc(item.value)}</span>
            <p>${esc(item.label)}</p>
          </article>`).join("")}
      </div>
    </section>

    <section class="pro-section" id="productos">
      <div class="catalog-section-head">
        <div>
          <span class="section-kicker">Productos</span>
          <h2>${esc(data.products.title)}</h2>
          <p class="muted">${esc(data.products.text)}</p>
        </div>
        <a class="btn ghost" href="${esc(data.links.catalog)}">${esc(data.products.cta)}</a>
      </div>
      <div class="pro-products">
        ${products.map(product => `
          <article class="catalog-product">
            <img src="${asset(product.image)}" alt="${esc(product.title)}" loading="lazy">
            <div class="catalog-product-body">
              <small>${esc(product.stage)}</small>
              <h3>${esc(product.title)}</h3>
              <span>${esc(product.category)}</span>
              <p>${esc(product.use)}</p>
            </div>
          </article>`).join("")}
      </div>
    </section>

    <section class="pro-section" id="como-funciona">
      <span class="section-kicker">Funcionamiento</span>
      <h2>${esc(data.steps.title)}</h2>
      <div class="pro-steps">
        ${data.steps.items.map((step, index) => `
          <article class="pro-step">
            <span>${index + 1}</span>
            <h3>${esc(step.title)}</h3>
            <p>${esc(step.text)}</p>
          </article>`).join("")}
      </div>
    </section>

    <section class="pro-section pro-simulator">
      <article>
        <span class="section-kicker">Simulador existente</span>
        <h2>${esc(data.simulator.title)}</h2>
        <p>${esc(data.simulator.text)}</p>
        <a class="btn primary" href="${esc(data.links.simulator)}">${esc(data.simulator.cta)}</a>
      </article>
      <p class="pro-note">${esc(data.simulator.note)}</p>
    </section>

    <section class="pro-section" id="beneficios">
      <span class="section-kicker">Beneficios</span>
      <h2>${esc(data.professionalBenefits.title)}</h2>
      <div class="pro-benefits">
        ${data.professionalBenefits.items.map(item => `
          <article class="card">
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.text)}</p>
          </article>`).join("")}
      </div>
    </section>

    <section class="pro-section pro-split">
      <article>
        <span class="section-kicker">Para pacientes</span>
        <h2>${esc(data.patientBenefits.title)}</h2>
        <ul class="pro-check-list">
          ${data.patientBenefits.items.map(item => `<li>${esc(item)}</li>`).join("")}
        </ul>
      </article>
      <article class="card">
        <span class="section-kicker">Modalidad</span>
        <h2>${esc(data.participation.title)}</h2>
        <p>${esc(data.participation.text)}</p>
        <div class="pro-topic-list">
          ${data.participation.topics.map(topic => `<span>${esc(topic)}</span>`).join("")}
        </div>
        <a class="btn primary block" href="#contacto">${esc(data.participation.cta)}</a>
      </article>
    </section>

    <section class="pro-section" id="faq">
      <span class="section-kicker">Dudas habituales</span>
      <h2>${esc(data.faq.title)}</h2>
      <div class="pro-faq">
        ${data.faq.items.map(item => `
          <details>
            <summary>${esc(item.question)}</summary>
            <p>${esc(item.answer)}</p>
          </details>`).join("")}
      </div>
    </section>

    <section class="pro-section pro-contact" id="contacto">
      <article>
        <span class="section-kicker">Contacto</span>
        <h2>${esc(data.contactForm.title)}</h2>
        <p>${esc(data.contactForm.text)}</p>
        <p class="muted">${esc(data.contactForm.secondary)}</p>
        <div id="whatsappSlot">${renderWhatsApp(data)}</div>
      </article>
      <form class="card pro-form" id="professionalForm" novalidate>
        <div class="formgrid form2">
          <div><label for="fullName">Nombre y apellido</label><input id="fullName" name="fullName" autocomplete="name" required></div>
          <div><label for="specialty">Especialidad</label><input id="specialty" name="specialty" required></div>
        </div>
        <div class="formgrid form3">
          <div><label for="city">Ciudad</label><input id="city" name="city" required></div>
          <div><label for="province">Provincia</label><input id="province" name="province" required></div>
          <div><label for="phone">Telefono</label><input id="phone" name="phone" autocomplete="tel" required></div>
        </div>
        <div class="formgrid form2">
          <div><label for="email">Correo electronico</label><input id="email" name="email" type="email" autocomplete="email" required></div>
          <div><label for="center">Consultorio o centro <span class="muted">opcional</span></label><input id="center" name="center"></div>
        </div>
        <label for="preferredContact">Medio de contacto preferido</label>
        <select id="preferredContact" name="preferredContact" required>
          <option value="">Seleccionar</option>
          <option>WhatsApp</option>
          <option>Telefono</option>
          <option>Correo electronico</option>
        </select>
        <label for="comments">Comentarios</label>
        <textarea id="comments" name="comments" rows="4"></textarea>
        <label class="pro-consent"><input id="consent" name="consent" type="checkbox" required> <span>${esc(data.contactForm.consent)}</span></label>
        <div class="modal-actions">
          <button class="btn primary" type="submit">${esc(data.contactForm.submit)}</button>
        </div>
        <p class="help" id="formStatus" role="status" aria-live="polite"></p>
      </form>
    </section>
  `;
}

function renderWhatsApp(data) {
  if (!data.contact.whatsappPhone) {
    return `<p class="pro-pending">WhatsApp pendiente de configurar en <code>content/dervie-profesionales.json</code>.</p>`;
  }
  const phone = String(data.contact.whatsappPhone).replace(/[^\d]/g, "");
  const message = encodeURIComponent(data.contact.whatsappMessage);
  return `<a class="btn ghost" href="https://wa.me/${phone}?text=${message}" target="_blank" rel="noopener">${esc(data.contactForm.whatsapp)}</a>`;
}

function bindInteractions(data) {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const form = $("professionalForm");
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const status = $("formStatus");
    if (!form.checkValidity()) {
      form.reportValidity();
      status.textContent = "Revisa los campos obligatorios para poder continuar.";
      return;
    }
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.consent = $("consent").checked;

    if (!data.contact.apiUrl) {
      status.textContent = "El formulario esta listo para conectarse a una API. Por ahora no se enviaron datos porque falta configurar contact.apiUrl.";
      toast("Falta configurar la API del formulario.", "warn");
      return;
    }

    setLoading(true, "Enviando solicitud...");
    try {
      const response = await fetch(data.contact.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("No se pudo enviar la solicitud.");
      form.reset();
      status.textContent = "Solicitud enviada. Nos comunicaremos para coordinar la presentacion.";
      toast("Solicitud enviada.", "ok");
    } catch (error) {
      status.textContent = error.message || "No se pudo enviar la solicitud.";
      toast("No se pudo enviar la solicitud.", "bad");
    } finally {
      setLoading(false);
    }
  });
}
