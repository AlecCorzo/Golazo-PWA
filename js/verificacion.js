// =====================================================
// CANCHA — verificacion.js
// Verificación de documento de identidad:
//   · OCR con Tesseract.js (global cargado en reserva.html)
//   · Detección de rostro con FaceDetector (Shape Detection API)
// =====================================================

let _worker = null;

async function _obtenerWorker() {
  if (_worker) return _worker;
  if (typeof Tesseract === 'undefined') {
    throw new Error('El reconocimiento de texto no está disponible. Revisá tu conexión a internet.');
  }
  // Usamos el modelo inglés — las letras latinas de la cédula son compatibles
  // y es más pequeño que el modelo español completo
  _worker = await Tesseract.createWorker('eng', 1, {
    logger: () => {} // silenciar logs de Tesseract en consola
  });
  return _worker;
}

function _analizarTexto(texto) {
  // Normalizar: mayúsculas + quitar tildes para comparar sin importar codificación OCR
  const t = texto
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  const patrones = [
    { regex: /COLOMBIA/,     etiqueta: 'Colombia' },
    { regex: /CEDULA/,       etiqueta: 'Cédula' },
    { regex: /CIUDADANIA/,   etiqueta: 'Ciudadanía' },
    { regex: /REPUBLICA/,    etiqueta: 'República' },
    { regex: /\b\d{7,10}\b/, etiqueta: 'N.° doc.' },
  ];

  const encontrados = patrones.filter(p => p.regex.test(t)).map(p => p.etiqueta);
  return {
    encontrados,
    aprobado: encontrados.length >= 2  // 2 de 5 coincidencias = suficiente evidencia
  };
}

async function _detectarRostro(dataUrl) {
  // FaceDetector es parte de la Shape Detection API (Chrome/Edge en Android y desktop)
  // No necesita modelos externos ni CDN
  if (!('FaceDetector' in window)) return null; // null = API no disponible en este navegador

  try {
    const img = new Image();
    img.src = dataUrl;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const detector = new FaceDetector({ fastMode: true });
    const caras    = await detector.detect(img);
    return caras.length > 0;
  } catch {
    return null; // detección falló; no penalizamos
  }
}

/**
 * Verifica si una imagen corresponde a una cédula colombiana.
 *
 * @param {string} dataUrl — data URL producido por capturarFoto()
 * @returns {Promise<{aprobado, tieneRostro, encontradosOCR, mensaje, detalle}>}
 */
export async function verificarDocumento(dataUrl) {
  // OCR y detección de rostro corren en paralelo para ahorrar tiempo
  const [ocrResult, tieneRostro] = await Promise.all([
    (async () => {
      try {
        const worker = await _obtenerWorker();
        const { data } = await worker.recognize(dataUrl);
        return _analizarTexto(data.text);
      } catch (e) {
        console.warn('[Verificación] OCR falló:', e.message);
        return { aprobado: false, encontrados: [] };
      }
    })(),
    _detectarRostro(dataUrl)
  ]);

  const faceNoDisp = tieneRostro === null;
  const ambos      = ocrResult.aprobado && tieneRostro === true;
  const soloOCR    = ocrResult.aprobado && tieneRostro === false;
  const soloRostro = !ocrResult.aprobado && tieneRostro === true;

  let aprobado, mensaje, detalle;

  if (ambos) {
    aprobado = true;
    mensaje  = 'Documento verificado';
    detalle  = `Identificado: ${ocrResult.encontrados.join(', ')}.`;
  } else if (ocrResult.aprobado && faceNoDisp) {
    // FaceDetector no disponible en este navegador; solo nos basamos en OCR
    aprobado = true;
    mensaje  = 'Documento aceptado';
    detalle  = `Texto detectado: ${ocrResult.encontrados.join(', ')}.`;
  } else if (soloOCR) {
    aprobado = true;
    mensaje  = 'Documento aceptado';
    detalle  = 'Texto de cédula detectado. La foto de la cédula no fue clara, pero el texto es válido.';
  } else if (soloRostro) {
    aprobado = false;
    mensaje  = 'No reconocido como cédula';
    detalle  = 'Se detectó un rostro pero no texto del documento. Asegurate de fotografiar tu cédula completa, no tu cara.';
  } else {
    aprobado = false;
    mensaje  = 'Documento no reconocido';
    detalle  = 'Asegurate de que la cédula esté bien iluminada, enfocada y completamente visible dentro del marco.';
  }

  return { aprobado, tieneRostro, encontradosOCR: ocrResult.encontrados, mensaje, detalle };
}

// Liberar el worker de Tesseract al salir de la página
export async function liberarWorker() {
  if (_worker) {
    await _worker.terminate();
    _worker = null;
  }
}
