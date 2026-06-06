# Flujo de negocio recomendado

## Decisión de diseño

Este sistema está pensado inicialmente para que lo uses vos como distribuidor / revendedor.

Entidad principal:

```text
Cliente / médica / centro
```

No obliga a usar pacientes.

## Flujo básico

```text
1. Cargar productos
2. Ingresar stock
3. Cargar cliente
4. Registrar venta
5. Registrar pago total o parcial
6. Controlar deudores
7. Anular si corresponde
```

## Reglas

- No se permite stock negativo.
- Una venta puede quedar Pagada, Parcial o Pendiente.
- Una venta anulada no se borra.
- La anulación devuelve stock.
- El descuento por producto pisa al descuento general.
- El precio de reventa es el precio principal para tu análisis.
- El precio de venta sugerido es informativo.

## Recomendación

Primero usarlo con pocos productos y ventas de prueba. Después recién cargar ventas reales.
