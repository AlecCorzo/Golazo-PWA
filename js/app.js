// =====================================================
// CANCHA — app.js
// Core: init, utils, datos de demo, helpers globales
// =====================================================

import { initDB, usuarioStorage, canchasDB, pendientesDB } from './db.js';
import { pedirPermisoNotificaciones, suscribirseAPush } from './notificaciones.js';
import { initFirebase, sincronizarPendientes } from './sincronizacion.js';

// ─── Inicialización de la app ─────────────────────────
export async function initApp() {
  try {
    await initDB();
    initFirebase();
    registrarServiceWorker();
    await cargarCanchasDemo();

    // Suscribir a push si el usuario ya está logueado
    const usuario = usuarioStorage.obtener();
    if (usuario) {
      suscribirseAPush(usuario.id).catch(err =>
        console.warn('[App] No se pudo suscribir a push:', err.message)
      );
    }

    console.log('[CanCha] App inicializada ✓');
  } catch (err) {
    console.error('[CanCha] Error de inicialización:', err);
  }
}

// ─── Service Worker ───────────────────────────────────
function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js')
    .then(reg => {
      console.log('[SW] Registrado:', reg.scope);
      reg.addEventListener('updatefound', () => {
        const nuevo = reg.installing;
        nuevo.addEventListener('statechange', () => {
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
            mostrarToast('Nueva versión disponible. Recargá la app.', 'info');
          }
        });
      });
    })
    .catch(err => console.error('[SW] Error al registrar:', err));

  // Escucha el mensaje del SW para sincronizar pendientes offline
  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data?.tipo !== 'sync-pendientes') return;
    try {
      const pendientes = await pendientesDB.obtenerTodos();
      if (pendientes.length === 0) return;
      await sincronizarPendientes(pendientes);
      for (const p of pendientes) await pendientesDB.eliminar(p.id);
      mostrarToast('Datos sincronizados con el servidor.', 'success');
    } catch (err) {
      console.error('[App] Error sincronizando pendientes:', err);
    }
  });
}

// ─── Canchas de demo ──────────────────────────────────
async function cargarCanchasDemo() {
  const existentes = await canchasDB.obtenerTodas();
  if (existentes.length > 0) return;

  const canchasDemo = [
    {
      id: 'c1', nombre: 'Cancha El Estadio', direccion: 'Cra 10 #23-45, Tunja',
      lat: 5.5390, lng: -73.3650, precioPorHora: 80000,
      disponible: true, superficie: 'Sintético 4G', capacidad: 10,
      telefono: '313 000 0001', horario: '6:00am - 10:00pm',
      foto: null, calificacion: 4.7, totalReservas: 312
    },
    {
      id: 'c2', nombre: 'SportZone Tunja', direccion: 'Av. Universitaria #12-10',
      lat: 5.5320, lng: -73.3720, precioPorHora: 65000,
      disponible: true, superficie: 'Sintético 3G', capacidad: 14,
      telefono: '314 000 0002', horario: '7:00am - 11:00pm',
      foto: null, calificacion: 4.4, totalReservas: 198
    },
    {
      id: 'c3', nombre: 'Arena Norte', direccion: 'Cll 50 #8-20, Tunja Norte',
      lat: 5.5450, lng: -73.3600, precioPorHora: 70000,
      disponible: false, superficie: 'Sintético 4G', capacidad: 12,
      telefono: '315 000 0003', horario: '8:00am - 10:00pm',
      foto: null, calificacion: 4.2, totalReservas: 145
    },
    {
      id: 'c4', nombre: 'La Bombonera', direccion: 'Barrio Cooservicios, Tunja',
      lat: 5.5280, lng: -73.3800, precioPorHora: 55000,
      disponible: true, superficie: 'Sintético 3G', capacidad: 10,
      telefono: '316 000 0004', horario: '6:00am - 9:00pm',
      foto: null, calificacion: 4.0, totalReservas: 89
    }
  ];

  await canchasDB.guardarTodas(canchasDemo);
  console.log('[CanCha] Canchas demo cargadas.');
}

// ─── Toast notifications ──────────────────────────────
export function mostrarToast(mensaje, tipo = 'info', duracion = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const iconos = {
    success: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="color:#00c853"><path d="M4 10l4 4 8-8"/></svg>`,
    error:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="color:#f44336"><path d="M6 6l8 8M14 6l-8 8"/></svg>`,
    info:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="color:#1565c0"><circle cx="10" cy="10" r="8"/><path d="M10 7v3M10 13h.01"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `${iconos[tipo] || ''}<span>${mensaje}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duracion);
}

// ─── Loading overlay ──────────────────────────────────
export function mostrarLoading(mensaje = 'Cargando...') {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `<div class="spinner"></div><p>${mensaje}</p>`;
    document.body.appendChild(overlay);
  }
  overlay.querySelector('p').textContent = mensaje;
  overlay.classList.remove('hidden');
}

export function ocultarLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('hidden');
}

// ─── Helpers ──────────────────────────────────────────
export function formatearPrecio(valor) {
  return `$${valor.toLocaleString('es-CO')}`;
}

export function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
}

export function formatearHora(fecha) {
  return new Date(fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export function generarId(prefijo = 'id') {
  return `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function iniciales(nombre = '') {
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

export function estaOnline() {
  return navigator.onLine;
}

// Escuchar cambios de conectividad
window.addEventListener('online',  () => mostrarToast('Conexión restaurada. Sincronizando...', 'success'));
window.addEventListener('offline', () => mostrarToast('Sin conexión. Trabajando en modo offline.', 'info'));
