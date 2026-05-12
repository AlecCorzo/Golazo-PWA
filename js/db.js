// =====================================================
// CANCHA — db.js
// Base de datos local: IndexedDB + localStorage
// =====================================================

const DB_NAME = 'canchaDB';
const DB_VERSION = 1;
let db = null;

// ─── Inicializar IndexedDB ───────────────────────────
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Tabla: reservas
      if (!db.objectStoreNames.contains('reservas')) {
        const store = db.createObjectStore('reservas', { keyPath: 'id' });
        store.createIndex('usuarioId', 'usuarioId', { unique: false });
        store.createIndex('canchaId',  'canchaId',  { unique: false });
        store.createIndex('estado',    'estado',    { unique: false });
      }

      // Tabla: canchas (caché local)
      if (!db.objectStoreNames.contains('canchas')) {
        const store = db.createObjectStore('canchas', { keyPath: 'id' });
        store.createIndex('nombre', 'nombre', { unique: false });
      }

      // Tabla: equipos
      if (!db.objectStoreNames.contains('equipos')) {
        db.createObjectStore('equipos', { keyPath: 'reservaId' });
      }

      // Tabla: pendientes (cambios offline por sincronizar)
      if (!db.objectStoreNames.contains('pendientes')) {
        const store = db.createObjectStore('pendientes', { keyPath: 'id', autoIncrement: true });
        store.createIndex('tipo', 'tipo', { unique: false });
      }
    };

    request.onsuccess = (e) => { db = e.target.result; resolve(db); };
    request.onerror   = (e) => reject(e.target.error);
  });
}

// ─── Helpers genéricos ──────────────────────────────
function getStore(tabla, modo = 'readonly') {
  const tx = db.transaction(tabla, modo);
  return tx.objectStore(tabla);
}

function promisify(request) {
  return new Promise((res, rej) => {
    request.onsuccess = () => res(request.result);
    request.onerror   = () => rej(request.error);
  });
}

// ─── RESERVAS ────────────────────────────────────────
export const reservasDB = {
  guardar(reserva) {
    const store = getStore('reservas', 'readwrite');
    return promisify(store.put(reserva));
  },
  obtenerTodas() {
    const store = getStore('reservas');
    return promisify(store.getAll());
  },
  obtenerPorId(id) {
    const store = getStore('reservas');
    return promisify(store.get(id));
  },
  obtenerPorUsuario(usuarioId) {
    const store = getStore('reservas');
    const idx   = store.index('usuarioId');
    return promisify(idx.getAll(usuarioId));
  },
  eliminar(id) {
    const store = getStore('reservas', 'readwrite');
    return promisify(store.delete(id));
  }
};

// ─── CANCHAS ─────────────────────────────────────────
export const canchasDB = {
  guardarTodas(canchas) {
    const store = getStore('canchas', 'readwrite');
    return Promise.all(canchas.map(c => promisify(store.put(c))));
  },
  obtenerTodas() {
    const store = getStore('canchas');
    return promisify(store.getAll());
  },
  obtenerPorId(id) {
    const store = getStore('canchas');
    return promisify(store.get(id));
  }
};

// ─── EQUIPOS ─────────────────────────────────────────
export const equiposDB = {
  guardar(equipo) {
    const store = getStore('equipos', 'readwrite');
    return promisify(store.put(equipo));
  },
  obtenerPorReserva(reservaId) {
    const store = getStore('equipos');
    return promisify(store.get(reservaId));
  }
};

// ─── PENDIENTES (offline sync) ────────────────────────
export const pendientesDB = {
  agregar(item) {
    const store = getStore('pendientes', 'readwrite');
    return promisify(store.add({ ...item, timestamp: Date.now() }));
  },
  obtenerTodos() {
    const store = getStore('pendientes');
    return promisify(store.getAll());
  },
  eliminar(id) {
    const store = getStore('pendientes', 'readwrite');
    return promisify(store.delete(id));
  }
};

// ─── USUARIO (localStorage) ──────────────────────────
export const usuarioStorage = {
  guardar(usuario) {
    localStorage.setItem('cancha_usuario', JSON.stringify(usuario));
  },
  obtener() {
    const data = localStorage.getItem('cancha_usuario');
    return data ? JSON.parse(data) : null;
  },
  eliminar() {
    localStorage.removeItem('cancha_usuario');
  },
  estaLogueado() {
    return !!this.obtener();
  }
};

// ─── PREFERENCIAS ────────────────────────────────────
export const prefs = {
  set(key, value) { localStorage.setItem(`cancha_${key}`, JSON.stringify(value)); },
  get(key, def = null) {
    const v = localStorage.getItem(`cancha_${key}`);
    return v !== null ? JSON.parse(v) : def;
  },
  del(key) { localStorage.removeItem(`cancha_${key}`); }
};
