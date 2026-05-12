// =====================================================
// CANCHA — auth.js
// Autenticación con localStorage (sin backend)
// =====================================================

import { usuarioStorage } from './db.js';
import { mostrarToast } from './app.js';

// ─── Registro ────────────────────────────────────────
export async function registrar({ nombre, correo, password, fotoDocumento }) {
  // Validaciones básicas
  if (!nombre || !correo || !password) throw new Error('Completá todos los campos.');
  if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  if (!validarCorreo(correo)) throw new Error('El correo no es válido.');

  // Verificar si ya existe (demo: localStorage)
  const usuarios = JSON.parse(localStorage.getItem('cancha_usuarios') || '[]');
  if (usuarios.find(u => u.correo === correo)) {
    throw new Error('Ya existe una cuenta con ese correo.');
  }

  const usuario = {
    id:            generarId(),
    nombre:        nombre.trim(),
    correo:        correo.toLowerCase().trim(),
    password:      await hashSimple(password), // hash básico para demo
    fotoDocumento: fotoDocumento || null,
    verificado:    !!fotoDocumento,
    creadoEn:      new Date().toISOString(),
    partidos:      0,
    canchasFav:    []
  };

  usuarios.push(usuario);
  localStorage.setItem('cancha_usuarios', JSON.stringify(usuarios));

  // Guardar sesión (sin password)
  const sesion = { ...usuario };
  delete sesion.password;
  usuarioStorage.guardar(sesion);

  return sesion;
}

// ─── Login ────────────────────────────────────────────
export async function login({ correo, password }) {
  if (!correo || !password) throw new Error('Completá todos los campos.');

  const usuarios = JSON.parse(localStorage.getItem('cancha_usuarios') || '[]');
  const usuario  = usuarios.find(u => u.correo === correo.toLowerCase().trim());

  if (!usuario) throw new Error('No encontramos una cuenta con ese correo.');

  const hashInput = await hashSimple(password);
  if (hashInput !== usuario.password) throw new Error('Contraseña incorrecta.');

  const sesion = { ...usuario };
  delete sesion.password;
  usuarioStorage.guardar(sesion);

  return sesion;
}

// ─── Logout ───────────────────────────────────────────
export function logout() {
  usuarioStorage.eliminar();
  window.location.href = '/pages/login.html';
}

// ─── Guardia de rutas ─────────────────────────────────
export function requiereAuth() {
  if (!usuarioStorage.estaLogueado()) {
    window.location.href = '/pages/login.html';
    return false;
  }
  return true;
}

// ─── Actualizar foto de documento ────────────────────
export function actualizarFotoDocumento(dataUrl) {
  const sesion = usuarioStorage.obtener();
  if (!sesion) return;

  const usuarios = JSON.parse(localStorage.getItem('cancha_usuarios') || '[]');
  const idx = usuarios.findIndex(u => u.id === sesion.id);
  if (idx === -1) return;

  usuarios[idx].fotoDocumento = dataUrl;
  usuarios[idx].verificado    = true;
  localStorage.setItem('cancha_usuarios', JSON.stringify(usuarios));

  sesion.fotoDocumento = dataUrl;
  sesion.verificado    = true;
  usuarioStorage.guardar(sesion);
}

// ─── Helpers ─────────────────────────────────────────
function validarCorreo(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

function generarId() {
  return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Hash muy simple para demo (no usar en producción — usar bcrypt con backend)
async function hashSimple(texto) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
