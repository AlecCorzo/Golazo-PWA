// =====================================================
// CANCHA — notificaciones.js
// Web Push + Notifications API
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

// ─── Notificación local (sin servidor) ───────────────
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

// ─── Recordatorio de partido (programado) ────────────
export function programarRecordatorioPartido(reserva) {
  const fechaPartido = new Date(reserva.fechaHora);
  const unaHoraAntes = new Date(fechaPartido.getTime() - 60 * 60 * 1000);
  const ahora        = new Date();
  const delay        = unaHoraAntes.getTime() - ahora.getTime();

  if (delay <= 0) {
    console.log('[Notif] El partido ya pasó o está en menos de 1 hora.');
    return null;
  }

  const timeoutId = setTimeout(() => {
    notificarLocal(`⚽ ¡Partido en 1 hora!`, {
      body: `${reserva.canchaНombre} — ${formatearHora(fechaPartido)}. ¡Calentá!`,
      tag:  `partido-${reserva.id}`,
      data: { url: `/pages/reserva.html?id=${reserva.id}` }
    });
  }, delay);

  // Guardar el id para poder cancelarlo si se cancela la reserva
  const recordatorios = JSON.parse(localStorage.getItem('cancha_recordatorios') || '{}');
  recordatorios[reserva.id] = { timeoutId: null, programadoPara: unaHoraAntes.toISOString() };
  localStorage.setItem('cancha_recordatorios', JSON.stringify(recordatorios));

  console.log(`[Notif] Recordatorio programado en ${Math.round(delay / 60000)} minutos.`);
  return timeoutId;
}

// ─── Notificar cancelación ────────────────────────────
export function notificarCancelacion(nombreJugador, reserva) {
  notificarLocal(`❌ ${nombreJugador} canceló`, {
    body:    `Ya no va al partido del ${formatearFecha(new Date(reserva.fechaHora))}.`,
    tag:     `cancelacion-${reserva.id}-${Date.now()}`,
    data:    { url: `/pages/equipo.html?id=${reserva.id}` }
  });
}

// ─── Notificar confirmación ───────────────────────────
export function notificarConfirmacion(nombreJugador, reserva) {
  notificarLocal(`✅ ${nombreJugador} confirmó`, {
    body:    `Confirmó asistencia al partido del ${formatearFecha(new Date(reserva.fechaHora))}.`,
    tag:     `confirmacion-${reserva.id}-${Date.now()}`,
    data:    { url: `/pages/equipo.html?id=${reserva.id}` }
  });
}

// ─── Helpers ─────────────────────────────────────────
function formatearHora(fecha) {
  return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function formatearFecha(fecha) {
  return fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}
