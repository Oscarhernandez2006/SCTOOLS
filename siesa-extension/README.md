# Auto-login Siesa — Extensión de navegador (Santa Cruz Suite)

Esta extensión inicia sesión automáticamente en **Siesa Cloud**
(`https://carnesantacruzapp.siesacloud.com/`) usando las credenciales que cada
usuario guarda —cifradas— dentro de la **Suite Santa Cruz**.

Siesa se sirve a través de un gateway de escritorio remoto (Citrix/Ericom), por
lo que la sesión **no** puede transferirse desde un servidor: el inicio de sesión
debe ocurrir en el navegador del propio usuario. Esta extensión es la forma
segura de lograr el auto-login real.

## Cómo funciona

1. En la Suite el usuario guarda su usuario/clave de Siesa (tarjeta **Siesa Cloud**
   en el inicio). Se almacenan cifrados (AES-256 con la `APP_KEY` de Laravel).
2. Cuando el usuario tiene la Suite abierta, el *content script* captura el token
   de sesión (`sc_tools_token`) y la URL del API, y los guarda en la extensión.
3. Al abrir Siesa Cloud, el *service worker* consulta
   `GET /api/siesa/credentials/reveal` con ese token (las `host_permissions`
   evitan CORS) y devuelve las credenciales descifradas solo para ese usuario.
4. El *content script* de Siesa rellena `dominio`, `usuario` y `contraseña` y
   pulsa **Log-on**.
5. Si el usuario **no** tiene credenciales guardadas, el endpoint responde `404`
   y la extensión **no hace nada** → el usuario inicia sesión manualmente.

## Instalación (modo desarrollador)

1. Abre `chrome://extensions` (o `edge://extensions`).
2. Activa **Modo de desarrollador**.
3. **Cargar descomprimida** → selecciona esta carpeta `siesa-extension/`.
4. Fija la extensión y abre la Suite; luego abre Siesa.

## Configuración para producción

Edita `manifest.json` y añade el dominio real de la Suite tanto en
`host_permissions` como en el `matches` del content script de la Suite:

```jsonc
"host_permissions": [
  "https://TU-DOMINIO-SUITE/*",
  "https://carnesantacruzapp.siesacloud.com/*"
],
"content_scripts": [
  { "matches": ["https://TU-DOMINIO-SUITE/*"], "js": ["suite-content.js"], "run_at": "document_idle" },
  ...
]
```

El API se resuelve automáticamente como `origen-de-la-suite + /api`.

## Archivos

| Archivo             | Rol                                                             |
| ------------------- | -------------------------------------------------------------- |
| `manifest.json`     | Manifest V3, permisos y content scripts.                       |
| `suite-content.js`  | Captura el token de la Suite y la URL del API.                 |
| `background.js`     | Service worker: guarda sesión y consulta el endpoint reveal.  |
| `siesa-content.js`  | Rellena el formulario de Siesa y pulsa Log-on.                |
| `popup.html/js`     | Estado de conexión y botón para abrir Siesa.                  |

## Seguridad

- La contraseña de Siesa **nunca** viaja al frontend de la Suite: solo el
  endpoint `reveal` la descifra y solo para el usuario autenticado dueño de ella.
- La extensión solo tiene permisos sobre el dominio de la Suite y el de Siesa.
- Si el token de la Suite expira, el endpoint responde `401` y no se rellena nada.
