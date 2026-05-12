// =====================================================
// CANCHA — server.js
// Servidor Node.js con Express para servir la PWA
// =====================================================

const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Servir archivos estáticos ────────────────────────
// Le dice a Express que sirva todo lo que esté en la
// carpeta actual (HTML, CSS, JS, íconos, manifest, sw.js)
app.use(express.static(path.join(__dirname), {
  // Headers especiales que necesita el Service Worker
  setHeaders(res, filePath) {
    // El Service Worker necesita este header para funcionar
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache');
    }
    // El manifest.json necesita su content-type correcto
    if (filePath.endsWith('manifest.json')) {
      res.setHeader('Content-Type', 'application/manifest+json');
    }
  }
}));

// ─── Ruta raíz ────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Manejar rutas de páginas internas ───────────────
// Si alguien entra directo a /pages/home.html, funciona
app.get('/pages/:pagina', (req, res) => {
  const pagina = req.params.pagina;
  const ruta   = path.join(__dirname, 'pages', pagina);
  res.sendFile(ruta, err => {
    if (err) res.status(404).send('Página no encontrada');
  });
});

// ─── Iniciar servidor ─────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ⚽  CANCHA corriendo en:');
  console.log(`  →  http://localhost:${PORT}`);
  console.log('');
  console.log('  Para probarlo en el celular:');
  console.log('  1. Conectate a la misma red WiFi');
  console.log('  2. Buscá tu IP local con: ipconfig (Windows) o ifconfig (Mac/Linux)');
  console.log(`  3. Entrá a: http://TU_IP:${PORT}`);
  console.log('');
});
