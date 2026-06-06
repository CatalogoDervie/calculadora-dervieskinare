# Dervie SkinCare - Control de Cremas

Sistema web para controlar productos, stock, ventas, pagos parciales, deudores, compras y reportes de cremas Dervie.

## Qué incluye

- Página lista para GitHub Pages.
- Modo demo sin conexión, para probar antes de configurar.
- Backend de Google Apps Script.
- Conexión con Google Sheets.
- Alta de clientes / médicas / centros.
- Alta y edición de productos.
- Nueva venta con varios productos.
- Descuento general y descuento por producto.
- Pago total, parcial o pendiente.
- Deudores y registro de pagos.
- Anulación de venta con devolución de stock.
- Ingreso de stock / compras.
- Reportes básicos.
- Exportación CSV desde la página.

## Estructura del ZIP

```text
index.html
style.css
script.js
.nojekyll
README.md
apps-script/
  Code.gs
  appsscript.json
docs/
  GUIA_INSTALACION.md
  ESTRUCTURA_PLANILLA.md
  CHECKLIST_PRUEBAS.md
  FLUJO_NEGOCIO.md
sample-data/
  productos_ejemplo.csv
```

## Cómo se usa

La página visible se sube a GitHub Pages.

```text
GitHub Pages → Apps Script → Google Sheets
```

GitHub muestra la página. Apps Script guarda y lee datos. Google Sheets funciona como base.

## Importante

No usar el repo `CatalogoDervie/Prueba` porque queda reservado para lentes.

Este proyecto corresponde a:

```text
CatalogoDervie/calculadora-dervieskinare
```

## Instalación

Leer:

```text
docs/GUIA_INSTALACION.md
```
