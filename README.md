# SpiderVerse PWA + Servidor Push

Proyecto SHD: PWA de Angular (Spider-Man) con notificaciones Web Push.

```
shd pwa/
├── spiderman-pwa/     # Frontend Angular 19 + PWA (service worker)
├── push-server/       # API Node/Express + web-push (VAPID)
├── render.yaml        # Blueprint del servidor push en Render
├── netlify.toml       # Configuración alternativa para Netlify
└── vercel.json        # (dentro de spiderman-pwa) configuración para Vercel
```

> ⚠️ **Nunca subas `push-server/.env` a GitHub**: contiene la clave privada VAPID. Ya está en `.gitignore`. Usa `.env.example` como plantilla.

---

## 1. Subir el código a GitHub

Desde esta carpeta (`C:\Users\jocee\Documents\shd pwa`):

```bash
git init
git add .
git commit -m "Paso 6: build de produccion y despliegue cloud"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

Crea antes el repositorio en https://github.com/new (vacío, sin README ni `.gitignore`, para evitar conflictos).

---

## 2. Desplegar el servidor push (Render)

1. Entra en https://render.com → **New → Web Service** y conecta tu repositorio de GitHub.
2. Configuración:
   - **Root Directory:** `push-server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
3. En **Environment Variables** añade exactamente:

   | Variable | Valor |
   |---|---|
   | `VAPID_SUBJECT` | `mailto:admin@spiderverse.local` |
   | `VAPID_PUBLIC_KEY` | la misma clave pública que aparece en `spiderman-pwa/src/app/core/services/push.service.ts` |
   | `VAPID_PRIVATE_KEY` | la clave privada de tu `push-server/.env` local (**no la pegues en GitHub**) |
   | `CORS_ORIGIN` | la URL de tu frontend, p. ej. `https://spiderman-pwa.vercel.app` |

   > Las claves también están en `push-server/.env` en local. Cópialas desde ahí directamente a Render.

4. Pulsa **Create Web Service**. Cuando termine, copia la URL pública, por ejemplo:
   `https://spiderverse-push-server.onrender.com`

5. Comprueba que responde:

   ```
   https://spiderverse-push-server.onrender.com/api/health
   → {"ok":true,"service":"spiderverse-push-server",...}
   ```

Alternativas: Railway, Fly.io o cualquier proveedor que ejecute Node. La app solo necesita que el servidor exponga HTTPS.

---

## 3. Apuntar la Angular al servidor público

Edita `spiderman-pwa/src/environments/environment.production.ts` y pon tu URL real de Render:

```ts
export const environment = {
  production: true,
  pushServerUrl: 'https://EL-NOMBRE-QUE-ELEGISTE.onrender.com',
};
```

Guarda, haz commit y push:

```bash
git add spiderman-pwa/src/environments/environment.production.ts
git commit -m "URL publica del servidor push"
git push
```

---

## 4. Desplegar la Angular (Vercel)

1. https://vercel.com → **Add New → Project** → importa el repo de GitHub.
2. Configuración:
   - **Root Directory:** `spiderman-pwa`
   - **Framework Preset:** Angular
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist/spiderman-pwa/browser`
3. Deploy. Vercel ya incluye `vercel.json` (rewrites SPA + cabeceras sin caché para el service worker).
4. Copia la URL final, p. ej. `https://spiderman-pwa.vercel.app`.

> Si elegiste Netlify en vez de Vercel, el archivo `netlify.toml` ya trae la configuración equivalente (base `spiderman-pwa`, publish `dist/spiderman-pwa/browser` y redirect SPA).

---

## 5. Verificación final

1. Abre `https://TU-APP.vercel.app/alertas`.
2. Comprueba que dice **Servidor: disponible**.
3. Pulsa **Enviar**. El servidor debe responder `Alerta enviada a N dispositivo(s)`.
4. La notificación aparecerá en el navegador y en el centro de notificaciones del sistema.

**Importante:** las notificaciones push solo funcionan por **HTTPS** (o `localhost`). En la nube, tanto la app como el servidor push deben usar HTTPS; ambos proveedores lo dan por defecto.

---

## 6. Limitaciones del plan gratuito

- Render FREE suspende el servicio tras ~15 min de inactividad; el primer arranque puede tardar unos segundos. La app consulta `/api/health` al iniciar y se registra de nuevo automáticamente.
- Las suscripciones se guardan en `push-server/subscriptions.json`. En un plan gratuito ese archivo puede perderse al reiniciar; se recrea solo cuando el navegador vuelve a abrir la app. Para un sistema real, usa una base de datos (MongoDB Atlas, Supabase, etc.).
- La clave privada VAPID debe configurarse **solo** como variable de entorno del servidor. La clave pública sí puede viajar al frontend.
