# Guía de instalación paso a paso

## 1. Subir archivos a GitHub

En el repositorio:

```text
CatalogoDervie/calculadora-dervieskinare
```

Subí a la raíz:

```text
index.html
style.css
script.js
.nojekyll
README.md
apps-script/
docs/
sample-data/
```

Si el repo tiene archivos viejos, podés borrarlos antes.

## 2. Activar GitHub Pages

En GitHub:

```text
Settings > Pages
```

Configurar:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```

La página debería quedar parecida a:

```text
https://catalogodervie.github.io/calculadora-dervieskinare/
```

## 3. Probar en modo demo

Entrá a la página. Aunque no esté conectado Apps Script, tiene que abrir y dejarte probar:

- productos demo;
- clientes demo;
- ventas demo;
- pagos demo;
- stock demo.

Esto no guarda en la planilla, solo en el navegador.

## 4. Configurar Google Sheets

La planilla actual configurada en el backend es:

```text
18K0DbRbM9ztIzfTmUIAzAUltrsff96dfjaCcNiLCnVE
```

Si vas a usar otra copia, reemplazá ese ID dentro de:

```text
apps-script/Code.gs
```

en esta línea:

```js
const SPREADSHEET_ID = '...';
```

## 5. Pegar Apps Script

Abrí la planilla de Google Sheets.

Entrá a:

```text
Extensiones > Apps Script
```

Borrá el contenido de `Code.gs` y pegá el archivo:

```text
apps-script/Code.gs
```

Guardá.

## 6. Probar conexión

En Apps Script, en el selector de funciones, elegí:

```text
testConexionPlanilla
```

Tocá **Ejecutar**.

Aceptá permisos.

Debe devolver algo como:

```text
Conexión correcta con: Control de Cremas - Prueba
```

## 7. Inicializar sistema

Ahora elegí:

```text
inicializarSistema
```

Tocá **Ejecutar**.

Esto crea o completa las hojas necesarias.

## 8. Implementar Apps Script como aplicación web

En Apps Script:

```text
Implementar > Nueva implementación
```

Elegir:

```text
Tipo: Aplicación web
Ejecutar como: Yo
Quién tiene acceso: Cualquier persona
```

Tocá **Implementar**.

Copiá la URL que termina en:

```text
/exec
```

## 9. Conectar la página

Tenés dos opciones.

### Opción A: desde la página

Entrá a la página de GitHub Pages.

Ir a:

```text
Configurar
```

Pegá la URL de Apps Script y tocá:

```text
Guardar conexión local
```

Esto funciona en ese navegador.

### Opción B: conexión fija para todos

Abrí `script.js` y reemplazá:

```js
const DEFAULT_API_URL = '';
```

por:

```js
const DEFAULT_API_URL = 'https://script.google.com/macros/s/XXXXX/exec';
```

Volvé a subir `script.js` a GitHub.

## 10. Prueba real

Probar en este orden:

1. Crear cliente.
2. Crear producto o editar uno existente.
3. Ingresar stock.
4. Hacer venta con pago parcial.
5. Ver deudores.
6. Registrar pago.
7. Anular una venta.
8. Revisar que devuelva stock.
