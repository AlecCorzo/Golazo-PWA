// =====================================================
// CANCHA — geolocalizacion.js
// Geolocation API + Leaflet.js para el mapa de canchas
// =====================================================

let mapaInstancia = null;
let marcadorUsuario = null;

// ─── Obtener posición actual ──────────────────────────
export function obtenerUbicacion() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tu dispositivo no soporta geolocalización.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy }),
      err => {
        const mensajes = {
          1: 'Permiso de ubicación denegado.',
          2: 'No se pudo obtener la ubicación.',
          3: 'Tiempo de espera agotado.'
        };
        reject(new Error(mensajes[err.code] || 'Error de geolocalización.'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

// ─── Inicializar mapa con Leaflet ─────────────────────
export function inicializarMapa(containerId, centro = { lat: 5.5353, lng: -73.3678 }, zoom = 14) {
  // Centro default: Tunja, Boyacá
  if (mapaInstancia) {
    mapaInstancia.remove();
    mapaInstancia = null;
  }

  mapaInstancia = L.map(containerId, { zoomControl: true, attributionControl: false }).setView(
    [centro.lat, centro.lng], zoom
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(mapaInstancia);

  return mapaInstancia;
}

// ─── Marcar ubicación del usuario ────────────────────
export function marcarUsuario(mapa, lat, lng) {
  const iconoUsuario = L.divIcon({
    className: '',
    html: `<div style="
      width:18px; height:18px; background:#00c853;
      border:3px solid #fff; border-radius:50%;
      box-shadow:0 0 0 4px rgba(0,200,83,0.3);
    "></div>`,
    iconSize:   [18, 18],
    iconAnchor: [9, 9]
  });

  if (marcadorUsuario) marcadorUsuario.remove();
  marcadorUsuario = L.marker([lat, lng], { icon: iconoUsuario })
    .addTo(mapa)
    .bindPopup('<b>Estás aquí</b>');
}

// ─── Mostrar canchas en el mapa ───────────────────────
export function mostrarCanchasEnMapa(mapa, canchas, alHacerClick) {
  const iconoCancha = (disponible) => L.divIcon({
    className: '',
    html: `<div style="
      background:${disponible ? '#00c853' : '#f44336'};
      color:#000; font-weight:700; font-size:11px;
      padding:5px 9px; border-radius:6px;
      white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,0.4);
      border:2px solid rgba(255,255,255,0.3);
    ">⚽ ${disponible ? 'Libre' : 'Ocupada'}</div>`,
    iconAnchor: [30, 14]
  });

  canchas.forEach(cancha => {
    const marker = L.marker([cancha.lat, cancha.lng], { icon: iconoCancha(cancha.disponible) })
      .addTo(mapa)
      .bindPopup(`
        <div style="font-family:sans-serif; min-width:140px;">
          <b style="font-size:13px;">${cancha.nombre}</b><br>
          <span style="font-size:11px; color:#666;">${cancha.direccion}</span><br>
          <span style="font-size:12px; color:#00a040; font-weight:600;">$${cancha.precioPorHora.toLocaleString()}/hr</span>
        </div>
      `);

    marker.on('click', () => {
      if (alHacerClick) alHacerClick(cancha);
    });
  });
}

// ─── Calcular distancia entre dos puntos (km) ────────
export function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * Math.PI / 180; }

// ─── Destruir mapa ────────────────────────────────────
export function destruirMapa() {
  if (mapaInstancia) { mapaInstancia.remove(); mapaInstancia = null; }
}
