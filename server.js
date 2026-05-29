// =====================================================
// CANCHA — server.js
// Servidor Node.js: archivos estáticos + Web Push API + cron de recordatorios
// =====================================================

require('dotenv').config();

const express = require('express');
const path    = require('path');
const webpush = require('web-push');
const admin   = require('firebase-admin');
const cron    = require('node-cron');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Firebase Admin ───────────────────────────────
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// ─── Web Push VAPID ───────────────────────────────
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ─── Middleware ───────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Archivos estáticos ───────────────────────────
app.use(express.static(path.join(__dirname), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache');
    }
    if (filePath.endsWith('manifest.json')) {
      res.setHeader('Content-Type', 'application/manifest+json');
    }
  }
}));

// ─── Rutas de páginas ─────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pages/:pagina', (req, res) => {
  const ruta = path.join(__dirname, 'pages', req.params.pagina);
  res.sendFile(ruta, err => {
    if (err) res.status(404).send('Página no encontrada');
  });
});

// =====================================================
// API: Web Push
// =====================================================

// Devuelve la clave pública VAPID para que el cliente cree su suscripción
app.get('/api/push/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Guarda la suscripción push de un usuario en Firestore
app.post('/api/push/subscribe', async (req, res) => {
  const { userId, subscription } = req.body;
  if (!userId || !subscription) {
    return res.status(400).json({ error: 'userId y subscription son requeridos' });
  }
  try {
    await db.collection('subscriptions').doc(userId).set({
      subscription,
      userId,
      updatedAt: new Date().toISOString()
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Push] Error guardando suscripción:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Envía push a todos los jugadores de una reserva excepto al que hizo la acción
app.post('/api/push/send', async (req, res) => {
  const { reservaId, tipo, fromUserId, fromNombre } = req.body;
  if (!reservaId || !tipo || !fromUserId) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    const reservaDoc = await db.collection('reservas').doc(reservaId).get();
    if (!reservaDoc.exists) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const reserva = reservaDoc.data();

    const mensajes = {
      confirmacion: {
        titulo:  `✅ ${fromNombre} confirmó`,
        mensaje: `Confirmó asistencia al partido en ${reserva.canchaNombre}.`
      },
      cancelacion: {
        titulo:  `❌ ${fromNombre} canceló`,
        mensaje: `Canceló asistencia al partido en ${reserva.canchaNombre}.`
      }
    };

    const notif = mensajes[tipo];
    if (!notif) return res.status(400).json({ error: 'Tipo inválido' });

    const destinatarios = (reserva.jugadores || []).filter(j => j.id !== fromUserId);

    let enviados = 0;
    await Promise.all(
      destinatarios.map(async (jugador) => {
        try {
          const subDoc = await db.collection('subscriptions').doc(jugador.id).get();
          if (!subDoc.exists) return;
          const { subscription } = subDoc.data();
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              titulo:  notif.titulo,
              mensaje: notif.mensaje,
              url:     `/pages/equipo.html?reservaId=${reservaId}`
            })
          );
          enviados++;
        } catch (err) {
          console.error(`[Push] Error enviando a ${jugador.id}:`, err.message);
        }
      })
    );

    res.json({ ok: true, enviados });
  } catch (err) {
    console.error('[Push] Error en /api/push/send:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// =====================================================
// Cron: recordatorio 1h antes del partido (cada 5 min)
// =====================================================
cron.schedule('*/5 * * * *', async () => {
  try {
    const ahora = new Date();
    const en55  = new Date(ahora.getTime() + 55 * 60 * 1000);
    const en65  = new Date(ahora.getTime() + 65 * 60 * 1000);

    const snap = await db.collection('reservas')
      .where('estado', '!=', 'cancelada')
      .get();

    const proximas = snap.docs
      .map(d => d.data())
      .filter(r => {
        const f = new Date(r.fechaHora);
        return f >= en55 && f <= en65;
      });

    for (const reserva of proximas) {
      const confirmados = (reserva.jugadores || []).filter(j => j.estado === 'confirmado');
      const hora = new Date(reserva.fechaHora).toLocaleTimeString('es-CO', {
        hour: '2-digit', minute: '2-digit'
      });

      await Promise.all(
        confirmados.map(async (jugador) => {
          try {
            const subDoc = await db.collection('subscriptions').doc(jugador.id).get();
            if (!subDoc.exists) return;
            const { subscription } = subDoc.data();
            await webpush.sendNotification(
              subscription,
              JSON.stringify({
                titulo:  '⚽ ¡Partido en 1 hora!',
                mensaje: `${reserva.canchaNombre} — ${hora}. ¡Calentá!`,
                url:     `/pages/equipo.html?reservaId=${reserva.id}`
              })
            );
          } catch (err) {
            console.error(`[Cron] Error recordatorio a ${jugador.id}:`, err.message);
          }
        })
      );
    }

    if (proximas.length > 0) {
      console.log(`[Cron] Recordatorios enviados: ${proximas.length} partido(s).`);
    }
  } catch (err) {
    console.error('[Cron] Error:', err);
  }
});

// ─── Iniciar servidor ─────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ⚽  CANCHA corriendo en:');
  console.log(`  →  http://localhost:${PORT}`);
  console.log('');
  console.log('  Para probarlo en el celular:');
  console.log('  1. Conectate a la misma red WiFi');
  console.log('  2. Buscá tu IP local con: ipconfig (Windows) o ifconfig (Mac/Linux)');
  console.log(`  3. Entrá a: http://TU_IP:${PORT}`);
  console.log('');
});
