// =====================================================
// CANCHA — sincronizacion.js
// Firebase Firestore: sync en tiempo real entre dispositivos
// =====================================================

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  writeBatch,
  collection,
  query,
  where,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let app = null;
let db  = null;

// ─── Inicializar Firebase ────────────────────────────────────────
// La config se obtiene del servidor para no exponer claves en el código fuente
export async function initFirebase() {
  if (getApps().length > 0) {
    app = getApps()[0];
    db  = getFirestore(app);
    return;
  }
  const res    = await fetch('/api/firebase-config');
  const config = await res.json();
  app = initializeApp(config);
  db  = getFirestore(app);
  console.log('[Firebase] Inicializado ✓');
}

function getDB() {
  if (!db) throw new Error('[Firebase] No inicializado. Llamá initFirebase() primero.');
  return db;
}

// ─── RESERVAS ────────────────────────────────────────

// Guarda o actualiza una reserva en Firestore
export async function sincronizarReserva(reserva) {
  try {
    await setDoc(doc(getDB(), 'reservas', reserva.id), reserva);
    console.log(`[Sync] Reserva ${reserva.id} sincronizada ✓`);
  } catch (err) {
    console.error('[Sync] Error sincronizando reserva:', err);
    throw err;
  }
}

// Obtiene una reserva de Firestore por ID
export async function obtenerReservaRemota(reservaId) {
  try {
    const snap = await getDoc(doc(getDB(), 'reservas', reservaId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('[Sync] Error obteniendo reserva:', err);
    return null;
  }
}

// ─── EQUIPO EN TIEMPO REAL ───────────────────────────

// Escucha cambios en tiempo real de una reserva (jugadores, estado)
// Retorna la función para cancelar el listener (llamarla al salir de la pantalla)
export function escucharEquipo(reservaId, callback) {
  const unsub = onSnapshot(
    doc(getDB(), 'reservas', reservaId),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      }
    },
    (err) => console.error('[Sync] Error en listener de equipo:', err)
  );
  return unsub;
}

// ─── SINCRONIZACIÓN DE PENDIENTES OFFLINE ───────────

// Sube a Firestore todos los cambios que se hicieron sin conexión
export async function sincronizarPendientes(pendientes) {
  if (!pendientes || pendientes.length === 0) return;

  const batch = writeBatch(getDB());
  let count = 0;

  for (const item of pendientes) {
    if (item.tipo === 'reserva' && item.data?.id) {
      batch.set(doc(getDB(), 'reservas', item.data.id), item.data);
      count++;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`[Sync] ${count} elemento(s) pendiente(s) sincronizados ✓`);
  }
}

// ─── SUSCRIPCIONES PUSH ──────────────────────────────

// Guarda la suscripción Web Push del usuario en Firestore
export async function guardarSuscripcionPush(userId, subscription) {
  try {
    await setDoc(doc(getDB(), 'subscriptions', userId), {
      subscription: JSON.parse(JSON.stringify(subscription)),
      userId,
      updatedAt: new Date().toISOString()
    });
    console.log('[Sync] Suscripción push guardada ✓');
  } catch (err) {
    console.error('[Sync] Error guardando suscripción push:', err);
  }
}
