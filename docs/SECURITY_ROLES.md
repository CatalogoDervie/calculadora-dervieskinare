# Acceso privado y roles

## Estado actual

La aplicación usa Firebase Authentication anónima. Las reglas actuales permiten leer y escribir toda la base a cualquier sesión anónima:

```text
allow read, write: if request.auth != null;
```

Como el navegador crea esa sesión automáticamente, la URL pública equivale a acceso operativo público. Ocultar `Reportes` del menú no protege los datos: una persona podría abrir la URL directa o consultar Firestore desde otro cliente.

## Objetivo recomendado

Usar cuentas individuales con Firebase Authentication y dos roles:

| Rol | Acceso |
| --- | --- |
| `doctor` | Operación completa, dashboard y reportes gerenciales |
| `admin` | Ventas, pacientes, compras, productos y cobranzas; sin reportes gerenciales |

Todas las cuentas deben ser creadas por una persona responsable. No se debe permitir el registro público.

## Migración segura

1. Activar `Email/Password` en Firebase Authentication.
2. Crear primero la cuenta de la médica y verificar que puede iniciar sesión.
3. Crear las cuentas administrativas.
4. Guardar el rol en un custom claim administrado desde un entorno seguro, nunca desde el navegador.
5. Reemplazar el inicio anónimo por una pantalla de acceso.
6. Ocultar rutas gerenciales para `admin` y validar el rol al cargar cada pantalla protegida.
7. Recién después de probar las cuentas, desplegar reglas de Firestore basadas en roles.
8. Desactivar Authentication Anonymous cuando no queden sesiones operativas dependientes de él.

## Base de reglas propuesta

Esta base es una referencia para la migración y no debe desplegarse antes de crear y probar las cuentas:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isStaff() {
      return signedIn() && request.auth.token.role in ['admin', 'doctor'];
    }

    function isDoctor() {
      return signedIn() && request.auth.token.role == 'doctor';
    }

    match /products/{document} {
      allow read, write: if isStaff();
    }
    match /patients/{document} {
      allow read, write: if isStaff();
    }
    match /purchases/{document} {
      allow read, write: if isStaff();
    }
    match /sales/{document} {
      allow read, write: if isStaff();
    }
    match /payments/{document} {
      allow read, write: if isStaff();
    }
    match /stockMovements/{document} {
      allow read, write: if isStaff();
    }

    // Si en el futuro se guardan resúmenes gerenciales precomputados:
    match /managementReports/{document=**} {
      allow read: if isDoctor();
      allow write: if false;
    }
  }
}
```

## Límite importante

Los administrativos necesitan leer ventas, compras y productos para operar. Con esos datos podrían reconstruir algunos indicadores aunque la pantalla de reportes esté oculta. Si ciertos resultados deben ser confidenciales incluso frente a personal técnico, deben calcularse en un backend y guardarse en una colección separada como `managementReports`, legible únicamente por `doctor`.

## Auditoría mínima

- Una cuenta por persona; no compartir contraseñas.
- Registrar quién crea, modifica o anula operaciones (`createdBy`, `updatedBy`, `canceledBy`).
- Revisar accesos y cuentas activas al menos cada tres meses.
- Retirar inmediatamente las cuentas de personas que dejan de trabajar en la clínica.
- No almacenar información clínica sensible adicional hasta completar el cierre de acceso.
