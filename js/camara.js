// =====================================================
// CANCHA — camara.js
// Acceso a cámara para verificación de identidad
// =====================================================

let streamActivo = null;

// ─── Iniciar cámara ──────────────────────────────────
export async function iniciarCamara(videoEl) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // cámara trasera preferida
        width:  { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    videoEl.srcObject = stream;
    streamActivo = stream;
    await videoEl.play();
    return true;
  } catch (err) {
    console.error('[Cámara] Error:', err.name, err.message);
    if (err.name === 'NotAllowedError') {
      throw new Error('Permiso de cámara denegado. Habilitalo en la configuración de tu navegador.');
    } else if (err.name === 'NotFoundError') {
      throw new Error('No se encontró ninguna cámara en este dispositivo.');
    } else {
      throw new Error('No se pudo acceder a la cámara. Intentá de nuevo.');
    }
  }
}

// ─── Capturar foto ───────────────────────────────────
export function capturarFoto(videoEl, canvasEl) {
  if (!streamActivo) throw new Error('La cámara no está activa.');

  const ctx = canvasEl.getContext('2d');
  canvasEl.width  = videoEl.videoWidth;
  canvasEl.height = videoEl.videoHeight;
  ctx.drawImage(videoEl, 0, 0);

  return canvasEl.toDataURL('image/jpeg', 0.85);
}

// ─── Detener cámara ───────────────────────────────────
export function detenerCamara() {
  if (streamActivo) {
    streamActivo.getTracks().forEach(t => t.stop());
    streamActivo = null;
  }
}

// ─── Verificar soporte ────────────────────────────────
export function soportaCamara() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
