# CanCha - PWA para reserva de canchas

CanCha es una Progressive Web App para consultar canchas sinteticas en Tunja, registrar usuarios, iniciar sesion y guardar datos localmente en el navegador. El proyecto esta construido con HTML, CSS y JavaScript modular, servido con Express.

## Estado actual

El proyecto ya cuenta con un MVP funcional de:

- Pantalla splash y redireccion segun sesion activa.
- Login y registro de usuarios con almacenamiento local.
- Registro con foto de documento usando la camara del dispositivo.
- Home autenticado con saludo, proximas reservas y canchas sugeridas.
- Vista de canchas con buscador, filtros, mapa Leaflet y geolocalizacion.
- Perfil de usuario con estado de verificacion, permisos de notificaciones, estadisticas basicas y cierre de sesion.
- Persistencia local con IndexedDB y localStorage.
- Manifest PWA y service worker base para cache, modo offline, push notifications y background sync.
- Servidor Express para servir la app desde `localhost`.

> Nota: algunas rutas enlazadas por la interfaz todavia no tienen archivo implementado, como `pages/reserva.html` y `pages/equipo.html`.

## Tecnologias

- HTML5, CSS3 y JavaScript ES Modules.
- Node.js y Express.
- IndexedDB para reservas, canchas, equipos y cambios pendientes.
- localStorage para usuarios, sesion y preferencias.
- Service Worker y Cache API.
- Web App Manifest.
- Notifications API.
- MediaDevices API para camara.
- Geolocation API.
- Leaflet y OpenStreetMap para el mapa.

## Estructura del proyecto

```text
Golazo-PWA/
|-- index.html                 # Splash y punto de entrada
|-- manifest.json              # Configuracion PWA
|-- sw.js                      # Service Worker
|-- server.js                  # Servidor Express
|-- package.json               # Scripts y dependencias
|-- package-lock.json
|-- css/
|   |-- main.css               # Variables, layout y estilos globales
|   `-- components.css         # Componentes de interfaz
|-- js/
|   |-- app.js                 # Inicializacion, service worker, datos demo y helpers
|   |-- auth.js                # Registro, login, logout y guardas de ruta
|   |-- camara.js              # Acceso a camara y captura de documento
|   |-- db.js                  # IndexedDB y localStorage
|   |-- geolocalizacion.js     # Geolocalizacion, Leaflet y calculo de distancia
|   `-- notificaciones.js      # Permisos y notificaciones locales
`-- pages/
    |-- login.html             # Login y registro
    |-- home.html              # Inicio autenticado
    |-- canchas.html           # Mapa, filtros y listado de canchas
    `-- perfil.html            # Perfil, stats, notificaciones y logout
```

## Instalacion

Requisitos:

- Node.js instalado.
- Navegador moderno compatible con PWA APIs.

Instalar dependencias:

```bash
npm install
```

Ejecutar en modo normal:

```bash
npm start
```

Ejecutar en modo desarrollo con reinicio automatico:

```bash
npm run dev
```

La aplicacion queda disponible en:

```text
http://localhost:3000
```

## Uso basico

1. Abre `http://localhost:3000`.
2. La app muestra el splash y redirige a login si no hay sesion.
3. Crea una cuenta desde la pestana de registro.
4. Captura una foto del documento para marcar el usuario como verificado.
5. Entra al home para ver canchas sugeridas.
6. Abre la seccion Canchas para usar mapa, filtros y busqueda.
7. En Perfil puedes revisar datos de usuario, permisos de notificacion y cerrar sesion.

## Datos locales

La app no usa backend de autenticacion ni base de datos remota por ahora.

En `localStorage` se guarda:

- `cancha_usuarios`: usuarios registrados.
- `cancha_usuario`: sesion activa.
- `cancha_recordatorios`: metadatos de recordatorios programados.
- `cancha_*`: preferencias generales.

En IndexedDB, base `canchaDB`, se guardan estos stores:

- `reservas`
- `canchas`
- `equipos`
- `pendientes`

Al inicializar la app, `app.js` carga canchas de demostracion si la base local esta vacia.

## Funcionalidades PWA

La app incluye:

- `manifest.json` con nombre, colores, orientacion e iconos esperados.
- Registro del service worker desde `js/app.js`.
- Cache de assets estaticos.
- Respuesta offline basica si no hay red.
- Soporte de eventos `push`, `notificationclick` y `sync`.

Importante:

- Las PWA funcionan correctamente en `localhost` o HTTPS.
- Camara, service worker, geolocalizacion y notificaciones no deben probarse desde `file://`.
- El manifest referencia `icons/icon-192.png` y `icons/icon-512.png`, pero la carpeta `icons/` no existe actualmente.

## Agregar los íconos

Crea dos imágenes PNG con el logo de CanCha:
- `icons/icon-192.png` (192×192 px)
- `icons/icon-512.png` (512×512 px)

Podés generarlas gratis en: https://realfavicongenerator.net

## Pendientes detectados

- Crear `pages/reserva.html` para completar el flujo de reserva.
- Crear `pages/equipo.html` para gestion de jugadores y confirmaciones.
- Crear los iconos PWA en `icons/icon-192.png` y `icons/icon-512.png`.
- Ajustar `sw.js`: actualmente intenta cachear archivos que no existen (`pages/registro.html`, `pages/reserva.html`, `pages/equipo.html`, `js/router.js`, `js/sincronizacion.js`). Esto puede hacer fallar la instalacion del cache inicial.
- Implementar `js/sincronizacion.js` o retirar su referencia del service worker.
- Revisar `programarRecordatorioPartido()` en `js/notificaciones.js`, porque usa una propiedad mal codificada en lugar de `canchaNombre`.
- Conectar un backend real si se necesita autenticacion segura, sincronizacion entre dispositivos o reservas compartidas.

## Scripts disponibles

```bash
npm start
```

Inicia `server.js` con Node.

```bash
npm run dev
```

Inicia `server.js` con `node --watch`.

## Despliegue

Para una demo rapida se puede desplegar en servicios estaticos con HTTPS como Netlify, Vercel o GitHub Pages. Si se usa Express en produccion, se debe desplegar como aplicacion Node.js.

Antes de desplegar conviene resolver los pendientes del service worker y agregar los iconos requeridos por el manifest.
