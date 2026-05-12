# CanCha — Guía de Desarrollo

## Estructura del proyecto

```
cancha/
├── index.html              ← Splash / punto de entrada
├── manifest.json           ← Config PWA (nombre, íconos, colores)
├── sw.js                   ← Service Worker (offline, caché, notificaciones)
├── css/
│   ├── main.css            ← Estilos globales, variables, layout
│   └── components.css      ← Componentes específicos (cards, mapa, cámara)
├── js/
│   ├── app.js              ← Core: init, toasts, datos demo, helpers
│   ├── db.js               ← IndexedDB + localStorage (toda la persistencia)
│   ├── auth.js             ← Login, registro, sesión
│   ├── camara.js           ← MediaDevices API (foto documento)
│   ├── notificaciones.js   ← Web Push + Notifications API
│   ├── geolocalizacion.js  ← Geolocation API + Leaflet.js
│   └── sincronizacion.js   ← Sync offline → online (por implementar)
├── pages/
│   ├── login.html          ← Login + registro con cámara ✅
│   ├── home.html           ← Inicio: reservas próximas + canchas ✅
│   ├── canchas.html        ← Mapa + lista de canchas ✅
│   ├── reserva.html        ← Flujo de reserva (por implementar)
│   ├── equipo.html         ← Gestión del equipo (por implementar)
│   └── perfil.html         ← Perfil + stats + logout ✅
└── icons/
    ├── icon-192.png        ← (agregar manualmente)
    └── icon-512.png        ← (agregar manualmente)
```

## Cómo correr el proyecto

### Opción 1 — VS Code + Live Server (recomendado)
1. Instalar extensión **Live Server** en VS Code
2. Click derecho en `index.html` → "Open with Live Server"
3. Abrir en el celular: `http://TU_IP_LOCAL:5500`

### Opción 2 — Python (sin instalar nada)
```bash
cd cancha
python -m http.server 8080
# Abrir: http://localhost:8080
```

### Opción 3 — Node.js
```bash
npx serve cancha
```

> ⚠️ **IMPORTANTE**: Las PWA requieren HTTPS o localhost para funcionar correctamente.
> El Service Worker, la cámara y las notificaciones NO funcionan en `file://`.
> Siempre usar un servidor local o desplegar en Netlify/Vercel.

## Agregar los íconos

Crea dos imágenes PNG con el logo de CanCha:
- `icons/icon-192.png` (192×192 px)
- `icons/icon-512.png` (512×512 px)

Podés generarlas gratis en: https://realfavicongenerator.net

## Páginas por implementar (Semana 2)

### `pages/reserva.html`
- Recibe `?canchaId=c1` por URL
- Muestra info de la cancha
- Selector de fecha y horario (grid de slots)
- Botón confirmar → guarda en IndexedDB
- Llama a `programarRecordatorioPartido()`

### `pages/equipo.html`
- Lista jugadores de la reserva activa
- Botones Voy / No puedo / Tal vez
- Genera un código de partido para compartir
- Muestra estado de confirmación de cada jugador
- Notifica cambios con `notificarConfirmacion()` y `notificarCancelacion()`

### `js/sincronizacion.js`
- Leer pendientes de IndexedDB
- Enviar a JSONbin.io o Firebase
- Marcar como sincronizado

## APIs nativas usadas

| Feature | API |
|---------|-----|
| Cámara / foto documento | `navigator.mediaDevices.getUserMedia()` |
| Geolocalización | `navigator.geolocation.getCurrentPosition()` |
| Notificaciones push | `Notification API` + Service Worker |
| Modo offline | `Service Worker` + Cache API |
| Instalable | `manifest.json` + `beforeinstallprompt` |
| Datos locales | `IndexedDB` + `localStorage` |
| Sync background | `Background Sync API` (Service Worker) |

## Despliegue rápido (para la demo)

1. Subir el proyecto a GitHub
2. Ir a [Netlify Drop](https://app.netlify.com/drop)
3. Arrastrar la carpeta `cancha/`
4. Netlify da HTTPS automáticamente → PWA funciona al 100%
