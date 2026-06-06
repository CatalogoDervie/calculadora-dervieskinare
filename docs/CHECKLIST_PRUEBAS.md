# Checklist de pruebas

Antes de usar con datos reales, probar esto:

## Prueba 1: carga inicial

- Abrir la página.
- Confirmar que carga en modo demo.
- Ir a Configurar.
- Pegar URL de Apps Script.
- Probar conexión.

Resultado esperado:

```text
Conexión correcta
```

## Prueba 2: cliente

- Crear cliente `Cliente Prueba`.
- Verificar que aparezca en listado.
- Verificar que aparezca en selector de nueva venta.

## Prueba 3: producto

- Crear producto `Producto Prueba`.
- Precio costo: 1000.
- Precio reventa: 1500.
- Stock: 10.
- Stock mínimo: 3.

Resultado esperado:

- Producto aparece en listado.
- No aparece como bajo stock.

## Prueba 4: venta parcial

- Hacer venta de 2 unidades.
- Total esperado: 3000.
- Pagado: 1000.

Resultado esperado:

- Estado: Parcial.
- Saldo: 2000.
- Stock baja de 10 a 8.
- Aparece en Deudores.

## Prueba 5: registrar pago

- Ir a Deudores.
- Registrar pago de 2000.

Resultado esperado:

- Estado: Pagada.
- Saldo: 0.
- Ya no aparece en Deudores.

## Prueba 6: anulación

- Crear otra venta.
- Anularla.

Resultado esperado:

- Estado: Anulada.
- Saldo: 0.
- Stock vuelve a sumarse.

## Prueba 7: stock negativo

- Intentar vender más unidades de las disponibles.

Resultado esperado:

- El sistema debe impedirlo.
