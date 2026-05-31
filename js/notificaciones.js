// =====================================================
// CANCHA — notificaciones.js
// Notifications API + Web Push real con VAPID
// =====================================================

// ─── Pedir permiso ────────────────────────────────────
export async function pedirPermisoNotificaciones() {
  if (!('Notification' in window)) {
    console.warn('[Notif] Este navegador no soporta notificaciones.');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;

  const resultado = await Notification.requestPermission();
  return resultado === 'granted';
}

// ─── Notificación local (fallback sin servidor) ───────
export function notificarLocal(titulo, opciones = {}) {
  if (Notification.permission !== 'granted') return;

  const config = {
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    ...opciones
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(titulo, config);
    });
  } else {
    new Notification(titulo, config);
  }
}

// ─── Suscripción Web Push real (VAPID) ───────────────
export async function suscribirseAPush(userId) {
  if (!('PushManager' in window)) {
    console.warn('[Push] Este navegador no soporta Web Push.');
    return null;
  }

  const permiso = await pedirPermisoNotificaciones();
  if (!permiso) return null;

  try {
    const res = await fetch('/api/push/vapid-key');
    const { publicKey } = await res.json();

    const reg   = await navigator.serviceWorker.ready;
    const appKey = urlBase64ToUint8Array(publicKey);

    let subscription;
    try {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: appKey
      });
    } catch (err) {
      // Si hay una suscripción con clave VAPID diferente, desuscribir y reintentar
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: appKey
      });
    }

    await fetch('/api/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, subscription })
    });

    console.log('[Push] Suscripción registrada ✓');
    return subscription;
  } catch (err) {
    console.error('[Push] Error al suscribirse:', err);
    return null;
  }
}

// ─── Notificar cancelación (también dispara push al servidor) ─
export function notificarCancelacion(nombreJugador, reserva) {
  notificarLocal(`❌ ${nombreJugador} canceló`, {
    body: `Ya no va al partido del ${formatearFecha(new Date(reserva.fechaHora))}.`,
    tag:  `cancelacion-${reserva.id}-${Date.now()}`,
    data: { url: `/pages/equipo.html?reservaId=${reserva.id}` }
  });
}

// ─── Notificar confirmación ───────────────────────────
export function notificarConfirmacion(nombreJugador, reserva) {
  notificarLocal(`✅ ${nombreJugador} confirmó`, {
    body: `Confirmó asistencia al partido del ${formatearFecha(new Date(reserva.fechaHora))}.`,
    tag:  `confirmacion-${reserva.id}-${Date.now()}`,
    data: { url: `/pages/equipo.html?reservaId=${reserva.id}` }
  });
}

// ─── Helpers ─────────────────────────────────────────
function formatearHora(fecha) {
  return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function formatearFecha(fecha) {
  return fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Convierte la clave pública VAPID (base64url) al formato que necesita el navegador
function urlBase64ToUint8Array(base64String) {
  const padding  = '='.repeat((4 - base64String.length % 4) % 4);
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData  = window.atob(base64);
  const output   = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}
