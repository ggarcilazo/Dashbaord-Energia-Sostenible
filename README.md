# Proyecto: Dashboard Energético (UCV)

Este repositorio contiene una interfaz web estática para el Dashboard Energético de la UCV.

## Resumen de cambios realizados para GitHub Pages

He convertido rutas absolutas (p.ej. `/Vista/...`) en rutas relativas en las vistas principales: 
- `Vista/Login/login.html`
- `Vista/Login/create-account.html`
- `Vista/Login/forgot-password.html`
- `Vista/Dashboard/dashboard.html`

Esto evita problemas al publicar en GitHub Pages bajo el subpath `https://<usuario>.github.io/<repo>/...`.

También corregí una duplicidad del `DOMContentLoaded` en `Controlador/dashboard-controller.js` y dejé la llamada a `applyRolePermissions()` para ejecutarse desde el listener existente.

## Por qué usar rutas relativas

GitHub Pages sirve tu sitio bajo el subpath del repositorio (por ejemplo `https://<usuario>.github.io/<repo>/`).  Si tu HTML usa rutas absolutas (empezando por `/`), el navegador busca los recursos en el dominio raíz (p.ej. `https://<usuario>.github.io/Vista/...`), lo que causa 404s cuando tu repo está bajo `.../<repo>/Vista/...`.

Para evitarlo:
- Usa rutas relativas (p.ej. `../CSS/login.css`) desde cada archivo HTML según su ubicación. Esto funciona tanto en tu entorno local (abriendo con `file://`) como en GitHub Pages.

## Recomendaciones al publicar en GitHub Pages

1. Asegúrate de que todos los recursos referenciados (CSS, JS, imágenes) usen rutas relativas o CDN si son externos.
2. Si usas módulos ES (`<script type="module"> import ...`), mantén las rutas relativas a cada archivo JS.
3. Valida que Firebase y otros SDKs se cargan correctamente (las versiones y rutas usadas en los HTML son probablemente correctas).
4. Prueba la aplicación en GitHub Pages: sube el repo, activa Pages (generalmente desde `gh-pages` branch o la rama `main` / `docs` según tu configuración).

## Posibles mejoras (opcional)

- Añadir una variable que guarde la basePath (p.ej `BASE_PATH = window.BASE_PATH || '.'`) y construir rutas a partir de ella.
- Cambiar los `script` de Firebase SDKs a `type="module"` si deseas usar la versión modular v9+ de Firebase (requiere código diferente).

## Seguridad y fallos al crear usuarios en Auth vs Firestore

- Si registras usuarios y ves el correo en Firebase Authentication pero recibes `Missing or insufficient permissions` al guardar su perfil en Firestore, el problema está en las reglas de Firestore (no en Auth).
- Solución robusta: crear el perfil del usuario desde el servidor con Cloud Functions (Admin SDK). Siguiendo este patrón, el cliente sólo crea la cuenta en Auth y el backend escribe el documento `users/{uid}`.

### Lo que implementé en este repositorio

- Añadí una Cloud Function (folder `functions/`) llamada `createUserProfile` — es callable desde el cliente y crea el documento `users/{uid}` usando Admin SDK.
- Actualicé `Modelo/firebase-init.js` para exportar `functions` (cliente) y actualicé `controlador` para llamar a la función `createUserProfile` tras la creación del usuario, evitando errores de permisos en Firestore.

### Cómo desplegar la función

1. Ve al directorio `functions/` y ejecuta:
```bash
cd functions
npm install
firebase deploy --only functions
```
2. Asegúrate de tener `firebase-tools` instalado y estar logueado ( `firebase login`).

### Alternativa rápida (no recomendada en producción)
- Ajustar temporalmente las reglas de Firestore para permitir que usuarios autenticados escriban su propio documento `users/{uid}`. (Ejemplo en el README y en el PR relacionado.)

## Si aún encuentras problemas

Si encuentras errores tras la publicación en GitHub Pages, comparte aquí las URLs  e indica las rutas que fallan (por ejemplo, `GET https://<usuario>.github.io/<repo>/Controlador/controller.js 404`). Puedo ayudarte a corregirlos.

---

Si quieres, puedo:
- Revisar el contenido de otras HTML para asegurar que no haya rutas absolutas restantes.
- Añadir un pequeño script que construya rutas basadas en `location` para más robustez.
- Sugerir un `deploy` automático en GitHub Actions para asegurarte que los builds funcionen.

¡Dime qué prefieres y lo implemento! 🎯