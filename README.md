# Dervie SkinCare Manager

Sistema interno para gestión de venta de dermocosméticos.

## Modelo del proyecto

```text
1 médica / clínica
1 repositorio GitHub
1 proyecto Firebase
1 Firestore
1 Firebase Hosting
Authentication Anonymous
```

## Menú operativo

La app abre directamente en **Ventas**.

```text
Ventas
Pacientes
Simulador
Compras
Productos
Deudores / Pagos
Dashboard
Reportes
```

## Cambios principales

### Ventas

- Es la pantalla inicial (`index.html`).
- Tiene botón superior **+ Cargar nuevo paciente**.
- Permite venta con varios productos.
- Permite múltiples medios de pago.
- Permite anular ventas devolviendo stock.

### Pacientes

- Pantalla operativa para carga, edición, baja lógica e historial.
- Muestra última compra y saldo pendiente.
- Las estadísticas de pacientes quedan para Dashboard y Reportes.

### Simulador

Nueva pantalla separada:

```text
simulador.html
js/simulador.js
```

No toca stock hasta confirmar.

Regla de descuento por producto:

```text
1 a 9 unidades     = 0%
10 a 14 unidades   = 10%
15 a 19 unidades   = 15%
20 o más unidades  = 20%
```

Muestra:

```text
Total compra
Ahorro
Venta sugerida
Ganancia estimada
Margen estimado
Recomendaciones para comprar mejor
```

### Compras

Queda para registrar compras reales y sumar stock.

Muestra antes de guardar:

```text
Subtotal
Descuento
Total a pagar
Ganancia estimada
```

### Productos

La pantalla ya no muestra “reventa”.

El Excel puede traer `Importe reventa`, pero la app lo interpreta como:

```text
Precio compra
```

Columnas visibles:

```text
Producto
Marca
Categoría
Precio compra
Venta sugerida
Stock
Estado
Acciones
```

### Dashboard

Incluye indicadores y tablas accionables:

```text
Ventas del mes
Ganancia estimada
Deuda pendiente
Productos a reponer
Stock valorizado
Ticket promedio
Pacientes deudores
Stock parado
Top productos por ganancia
Top productos más vendidos
Principales deudores
Productos con stock parado
```

## Firestore

Colecciones directas:

```text
products
patients
purchases
sales
payments
stockMovements
```

## Firebase

Activar:

```text
Authentication > Anonymous
Firestore Database
Firebase Hosting
```

Reglas básicas:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Deploy

```bash
firebase deploy
```

Después de cada cambio fuerte, actualizar navegador con:

```text
Ctrl + F5
```
