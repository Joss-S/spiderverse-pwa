require('dotenv').config();

const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

/* ------------------------------------------------------------------ */
/* Claves VAPID (Voluntary Application Server Identification)          */
/* ------------------------------------------------------------------ */
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// En producción limitamos CORS al dominio de la PWA desplegada.
// Si no se define CORS_ORIGIN, se permiten todos (modo desarrollo).
const corsOptions = process.env.CORS_ORIGIN
  ? {
      origin: process.env.CORS_ORIGIN.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    }
  : {};
app.use(cors(corsOptions));
app.use(express.json());

// JSON malformado no debe tirar el servidor.
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ ok: false, error: 'JSON inválido' });
  }
  next(err);
});

/* ------------------------------------------------------------------ */
/* Almacenamiento de suscripciones (local, persistente en JSON)        */
/* ------------------------------------------------------------------ */
const STORE_FILE = path.join(__dirname, 'subscriptions.json');
let subscriptions = new Map(); // endpoint -> subscription

try {
  if (fs.existsSync(STORE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    saved.forEach((sub) => subscriptions.set(sub.endpoint, sub));
    console.log(`📂 ${subscriptions.size} suscripción(es) restaurada(s)`);
  }
} catch (err) {
  console.warn('⚠️ No se pudo leer subscriptions.json:', err.message);
}

function persist() {
  fs.writeFileSync(STORE_FILE, JSON.stringify([...subscriptions.values()], null, 2));
}

function isValidSubscription(sub) {
  return (
    sub &&
    typeof sub.endpoint === 'string' &&
    sub.keys &&
    typeof sub.keys.p256dh === 'string' &&
    typeof sub.keys.auth === 'string'
  );
}

/* ------------------------------------------------------------------ */
/* Endpoints de la API push                                            */
/* ------------------------------------------------------------------ */

// Health check: el cliente consulta este endpoint para mostrar el estado.
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'spiderverse-push-server',
    subscriptions: subscriptions.size,
    time: new Date().toISOString(),
  });
});

// Registro de suscripciones enviadas por el cliente Angular (SwPush).
app.post('/api/subscribe', (req, res) => {
  if (!isValidSubscription(req.body)) {
    return res.status(400).json({ ok: false, error: 'Suscripción inválida' });
  }
  subscriptions.set(req.body.endpoint, req.body);
  persist();
  console.log(`✅ Nueva suscripción (${subscriptions.size} total)`);
  res.json({ ok: true, count: subscriptions.size });
});

// Baja de suscripciones.
app.post('/api/unsubscribe', (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) subscriptions.delete(endpoint);
  persist();
  console.log(`➖ Baja de suscripción (${subscriptions.size} total)`);
  res.json({ ok: true, count: subscriptions.size });
});

// disparo de alertas personalizadas hacia todos los dispositivos.
app.post('/api/notify', async (req, res) => {
  const title = String(req.body?.title || '🕷️ Alerta de la Telaraña').slice(0, 120);
  const body = String(req.body?.body || 'Tienes una nueva misión.').slice(0, 500);
  const url = String(req.body?.url || '/').slice(0, 200);

  // Angular SW solo llama a showNotification() si existe `notification.title`.
  // Los campos planos se mantienen para el aviso dentro de la app (SwPush.messages).
  const notification = {
    title,
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'spiderverse-alert',
    data: {
      onActionClick: {
        default: { operation: 'openWindow', url },
      },
    },
  };
  const payload = JSON.stringify({ title, body, url, notification });
  const list = [...subscriptions.values()];

  if (list.length === 0) {
    return res.json({ ok: true, sent: 0, message: 'No hay dispositivos suscritos' });
  }

  const results = await Promise.allSettled(
    list.map((sub) => webpush.sendNotification(sub, payload, { TTL: 60 }))
  );

  let sent = 0;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      sent++;
    } else {
      const status = result.reason?.statusCode;
      console.warn(`⚠️ Fallo al enviar (${status}):`, result.reason?.message || result.reason);
      // 404/410 = suscripción expirada: la eliminamos.
      if (status === 404 || status === 410) {
        subscriptions.delete(list[index].endpoint);
      }
    }
  });
  persist();

  res.json({ ok: true, sent, total: subscriptions.size });
});

// Inspección rápida de suscripciones activas.
app.get('/api/subscriptions', (_req, res) => {
  res.json({
    count: subscriptions.size,
    endpoints: [...subscriptions.keys()],
  });
});

/* ------------------------------------------------------------------ */
/* Serve de la compilación de producción de Angular (opcional)         */
/* Así toda la PWA + push se ejecutan en un solo servidor local.       */
/* ------------------------------------------------------------------ */
const ANGULAR_DIST = path.resolve(
  __dirname,
  '../spiderman-pwa/dist/spiderman-pwa/browser'
);

if (fs.existsSync(ANGULAR_DIST)) {
  app.use(
    express.static(ANGULAR_DIST, {
      setHeaders(res, filePath) {
        if (filePath.endsWith('ngsw.json') || filePath.endsWith('ngsw-worker.js')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    })
  );

  // Fallback SPA: cualquier ruta no-API devuelve index.html
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    const indexFile = path.join(ANGULAR_DIST, 'index.html');
    if (!fs.existsSync(indexFile)) {
      return res.status(503).send('Aplicación compilándose. Inténtalo en unos segundos.');
    }
    res.sendFile(indexFile, (err) => {
      if (err && !res.headersSent) res.status(500).send('Error al servir la aplicación');
    });
  });
  console.log(`📦 Sirviendo compilación Angular desde ${ANGULAR_DIST}`);
} else {
  console.log('ℹ️ Compilación Angular no encontrada. Ejecuta `npm run build` en spiderman-pwa.');
}

app.listen(PORT, () => {
  console.log(`\n🕷️  SpiderVerse Push Server corriendo en http://localhost:${PORT}`);
  console.log('   Endpoints:');
  console.log('     GET  /api/health');
  console.log('     POST /api/subscribe');
  console.log('     POST /api/unsubscribe');
  console.log('     POST /api/notify');
  console.log('     GET  /api/subscriptions\n');
});
