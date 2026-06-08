# Dervie SkinCare Manager - Firebase Anonymous

Versión simplificada para el modelo final:

```text
1 médica / clínica
1 repositorio GitHub
1 proyecto Firebase
1 Firestore
1 Firebase Hosting
Autenticación anónima
```

No usa multi-clínica, roles ni login visible.

## Tecnología

- HTML5
- CSS3
- JavaScript Vanilla
- Firebase Hosting
- Firebase Authentication Anonymous
- Firestore

## Colecciones Firestore

Directas, sin prefijo por clínica:

```text
products
patients
purchases
sales
payments
stockMovements
```

## Activar Firebase Authentication Anonymous

En Firebase Console:

```text
Authentication
Sign-in method
Anonymous
Enable
```

## Reglas Firestore

Publicar `firestore.rules`:

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

## Configuración

Editar:

```text
js/firebase-config.js
```

Con el Firebase de cada médica.

## Hosting

Instalar Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
```

Deploy:

```bash
firebase deploy
```

## Uso

1. Abrir la URL de Firebase Hosting.
2. La app inicia sesión anónima automáticamente.
3. Cargar productos.
4. Cargar pacientes.
5. Registrar compras para sumar stock.
6. Registrar ventas.
7. Registrar pagos.
8. Revisar reportes.

## Nota

Como cada médica tendrá su propio Firebase y repo, esta versión prioriza simplicidad. No hay separación por clínica dentro de Firestore porque el proyecto Firebase ya es de una sola médica.
