# CanCha - PWA para reserva de canchas

CanCha es una Progressive Web App para reservar canchas sintéticas en Tunja, organizar equipos de juego y recibir recordatorios automáticos. Está construida con HTML5, CSS3 y JavaScript Vanilla (ES Modules), servida con Express y sincronizada con Firebase Firestore.

## Funcionalidades implementadas

### Features PWA nativas del navegador

| Feature | Descripción |
|---|---|
| Instalable | Web App Manifest con display standalone, iconos y splash screen |
| Modo offline | Service Worker Cache-First para assets + IndexedDB para datos |
| Push notifications | Web Push API con VAPID — recordatorio 1h antes, confirmaciones y cancelaciones |
| Cámara | MediaDevices API para capturar foto del documento de identidad al registrarse |
| Geolocalización | Geolocation API + Leaflet.js para mostrar canchas cercanas en mapa |
| Sincronización | Firebase Firestore con `onSnapshot` para actualizaciones en tiempo real |
| Background sync | Cola de cambios offline en IndexedDB; se sincronizan al reconectar |

### Flujo de la aplicación

- **Registro con verificación**: el usuario crea su cuenta y captura una foto de su cédula con la cámara del dispositivo. La cuenta queda marcada como verificada.
- **Búsqueda de canchas**: mapa interactivo con canchas cercanas, filtros por nombre y disponibilidad.
- **Reserva en 3 pasos**: selección de cancha → selección de fecha y hora → confirmación. La reserva se guarda en IndexedDB inmediatamente y se sube a Firestore si hay conexión; si no, queda en cola.
- **Equipo y código de partido**: cada reserva genera un código de 6 caracteres. El organizador lo comparte y los compañeros se unen con ese código. Cada jugador confirma o cancela su asistencia con un toque.
- **Notificaciones automáticas**: 1 hora antes del partido todos los confirmados reciben un push. Si alguien cancela, el resto recibe una alerta inmediata.
- **Búsqueda por código**: desde la sección Equipo se puede ingresar el código de un partido para unirse a él.

### Pendientes / limitaciones actuales

- Las canchas son datos demo cargados en `app.js`; no hay panel de administración para propietarios.
- La autenticación es 100% local (localStorage + SHA-256). No hay backend de auth; no apto para producción sin añadir autenticación real.
- No está implementada la lista de espera al liberarse una cancha (mencionada en el documento de requisitos).
- No hay historial de partidos por usuario con vista dedicada.

---

## Dónde vive cada dato

### Service Worker — caché de assets (`cancha-v4`)

Estrategia **Cache-First** para todos los archivos estáticos:

- `index.html`, todas las páginas en `pages/`
- Hojas de estilo en `css/`
- Módulos JS en `js/`
- `manifest.json` e iconos en `icons/`

Estrategia **Network-First** para llamadas dinámicas a Firebase y a la API del servidor.

### IndexedDB — `canchaDB`

| Store | Contenido |
|---|---|
| `reservas` | Reservas del usuario. Funciona offline; se sincronizan a Firestore al reconectar. |
| `canchas` | Caché local de canchas (datos demo cargados desde `app.js` al iniciar). |
| `equipos` | Estado del equipo por reserva (jugadores, confirmaciones). |
| `pendientes` | Cola de cambios realizados sin conexión. El SW los sube en background sync. |

### localStorage

| Clave | Contenido |
|---|---|
| `cancha_usuarios` | Array de cuentas registradas (auth local; no va a ningún servidor). |
| `cancha_usuario` | Objeto de sesión del usuario activo. |
| `cancha_*` | Preferencias generales del usuario. |

### Firebase Firestore — externo

| Colección | Contenido |
|---|---|
| `reservas` | Documentos de reserva sincronizados entre dispositivos. Escuchados con `onSnapshot`. |
| `subscriptions` | Suscripciones Web Push por usuario para enviar notificaciones desde el servidor. |

### Servidor Express — externo a la PWA

El servidor no sirve datos de negocio; actúa como intermediario seguro para claves que no deben estar en el cliente:

| Endpoint | Propósito |
|---|---|
| `GET /api/firebase-config` | Entrega la config de Firebase al cliente sin exponer claves en el HTML. |
| `GET /api/push/vapid-key` | Entrega la clave pública VAPID para suscribirse a push. |
| `POST /api/push/subscribe` | Guarda la suscripción push del usuario en Firestore. |
| `POST /api/push/send` | Envía notificaciones push a los participantes de un partido. |

Además corre un **cron job** cada 5 minutos que revisa las reservas de Firestore y envía el recordatorio "¡Partido en 1 hora!" a los jugadores confirmados.

### CDN — externos

- **Leaflet.js** (v1.9.4) y tiles de **OpenStreetMap**: mapa interactivo de canchas.
- **Firebase SDK**: cargado desde `gstatic.com`.

---

## Tecnologías

- HTML5, CSS3 y JavaScript ES Modules — sin frameworks.
- Node.js y Express.
- Firebase Firestore (SDK web + Admin SDK).
- IndexedDB (`canchaDB`) — 4 stores.
- localStorage — sesión y auth local.
- Service Worker y Cache API.
- Web App Manifest.
- Web Push API (VAPID) + `web-push` npm.
- `node-cron` — recordatorios automáticos.
- MediaDevices API (`getUserMedia`) — cámara.
- Geolocation API.
- Leaflet.js + OpenStreetMap.

---

## Estructura del proyecto

```text
Golazo-PWA/
├── index.html                 # Splash y punto de entrada
├── manifest.json              # Configuración PWA
├── sw.js                      # Service Worker (cache + push + sync)
├── server.js                  # Servidor Express + API + cron de recordatorios
├── package.json               # Scripts y dependencias
├── .env.example               # Variables de entorno requeridas
├── css/
│   ├── main.css               # Variables, layout y estilos globales
│   └── components.css         # Componentes de interfaz
├── js/
│   ├── app.js                 # Inicialización, SW registration, datos demo y helpers
│   ├── auth.js                # Registro, login, logout y guardas de ruta
│   ├── camara.js              # Acceso a cámara y captura de documento
│   ├── db.js                  # IndexedDB (canchaDB) y localStorage
│   ├── geolocalizacion.js     # Geolocation API, Leaflet y cálculo de distancia
│   ├── notificaciones.js      # Permisos, notificaciones locales y Web Push
│   └── sincronizacion.js      # Firebase Firestore — sync, listeners y búsqueda por código
├── pages/
│   ├── login.html             # Login y registro
│   ├── home.html              # Inicio autenticado
│   ├── canchas.html           # Mapa, filtros y listado de canchas
│   ├── reserva.html           # Flujo de reserva en 3 pasos + verificación de identidad
│   ├── equipo.html            # Gestión del equipo, código de partido y confirmaciones
│   └── perfil.html            # Perfil, stats, notificaciones y logout
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## Instalación

**Requisitos:**

- Node.js instalado.
- Cuenta de Firebase con un proyecto y Firestore habilitado.
- Navegador moderno compatible con PWA APIs.

**Pasos:**

1. Clonar el repositorio e instalar dependencias:

```bash
npm install
```

2. Copiar el archivo de variables de entorno y completarlo:

```bash
cp .env.example .env
```

Variables requeridas en `.env`:

```text
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:tu@email.com
FIREBASE_PROJECT_ID=...
```

3. Colocar el archivo `firebase-service-account.json` con las credenciales del Admin SDK de Firebase en la raíz del proyecto.

4. Iniciar el servidor:

```bash
npm start
```

Para desarrollo con reinicio automático:

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

---

## Uso básico

1. Abre `http://localhost:3000`.
2. El splash redirige a login si no hay sesión activa.
3. Crea una cuenta desde la pestaña Registro.
4. Captura una foto del documento de identidad para quedar verificado.
5. Desde **Canchas**: explora el mapa, filtra y selecciona una cancha.
6. Desde **Reserva**: elige fecha y horario, confirma la reserva y obtén el código del partido.
7. Comparte el código de 6 caracteres con tus compañeros.
8. Desde **Equipo**: cada jugador entra con el código y confirma su asistencia.
9. 1 hora antes del partido, todos los confirmados reciben una notificación push automática.

---

## Notas de desarrollo

- Las APIs de cámara, geolocalización, service worker y notificaciones requieren **HTTPS o localhost**. No funcionan desde `file://`.
- La autenticación es local (localStorage). Para producción se debe reemplazar por Firebase Auth u otro proveedor.
- El cron de recordatorios corre en el servidor, no en el cliente; la app debe estar corriendo para que se envíen.
- Los datos demo de canchas se cargan automáticamente en IndexedDB si la base local está vacía (ver `app.js`).
