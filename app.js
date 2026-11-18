// Práctica 6.1 y 6.2 - Instalabilidad Nativa y Acceso Ético a Cámara
// Autor: Juan José Díaz Barroso
// JavaScript Vanilla: sin async/await y sin librerías (solo .then/.catch/.finally)

// ---------- Referencias del DOM ----------
const btnInstalar = document.getElementById('btn-instalar');
const estadoInstalacion = document.getElementById('estado-instalacion');
const visorVideo = document.getElementById('visor-camara');
const placeholderVideo = document.getElementById('placeholder-video');
const mensajeEstado = document.getElementById('mensaje-estado');
const avisoPermiso = document.getElementById('aviso-permiso');
const avisoCamara = document.getElementById('aviso-camara');
const btnPreparar = document.getElementById('btn-preparar-camara');
const btnConfirmar = document.getElementById('btn-confirmar-permiso');
const btnCancelar = document.getElementById('btn-cancelar-permiso');
const btnAlternar = document.getElementById('btn-alternar-camara');
const btnApagar = document.getElementById('btn-apagar-camara');
const etiquetaModo = document.getElementById('modo-app');

// ---------- Estado ----------
let eventoInstalacionDiferido = null;
let streamActual = null;
let modoCamaraActual = 'environment'; // 'environment' = trasera | 'user' = frontal
let cambiandoCamara = false;

function actualizarMensajeEstado(texto){
  mensajeEstado.textContent = texto;
}

function nombreCamara(modo){
  return modo === 'environment' ? 'Trasera' : 'Frontal';
}

function estaInstalada(){
  return window.navigator.standalone === true ||
         window.matchMedia('(display-mode: standalone)').matches;
}

// ---------- Fase 1: Service Worker ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registro) => {
        console.log('Service Worker registrado con scope:', registro.scope);
      })
      .catch((error) => {
        console.error('Error al registrar el Service Worker:', error);
      });
  });
}

// ---------- Fase 1: Evento de instalación (Android / Chrome) ----------
window.addEventListener('beforeinstallprompt', (event) => {
  // Evita que el mini-banner automático aparezca antes de tiempo
  event.preventDefault();
  eventoInstalacionDiferido = event;

  // Muestra el botón personalizado de instalación
  btnInstalar.hidden = false;
  estadoInstalacion.textContent = 'Puedes instalar esta app en tu pantalla de inicio.';
});

btnInstalar.addEventListener('click', () => {
  if (!eventoInstalacionDiferido) return;

  eventoInstalacionDiferido.prompt();
  eventoInstalacionDiferido.userChoice
    .then((resultado) => {
      if (resultado.outcome === 'accepted') {
        btnInstalar.hidden = true;
        estadoInstalacion.textContent = 'Instalación aceptada. ¡Gracias!';
      } else {
        estadoInstalacion.textContent = 'Instalación cancelada. Puedes intentarlo de nuevo más tarde.';
      }
    })
    .catch((error) => {
      estadoInstalacion.textContent = 'No se pudo completar la instalación: ' + error.message;
    })
    .finally(() => {
      // El evento solo puede usarse una vez; el navegador lo volverá a emitir si procede
      eventoInstalacionDiferido = null;
      btnInstalar.hidden = true;
    });
});

window.addEventListener('appinstalled', () => {
  btnInstalar.hidden = true;
  eventoInstalacionDiferido = null;
  estadoInstalacion.textContent = 'App instalada correctamente en tu dispositivo.';
});

// ---------- Fase 1 (iOS): Detección de iPhone/iPad y modo instalado ----------
function verificarEntornoIOS(){
  // iPadOS 13+ se identifica como "Macintosh", por eso se revisa también el touch
  const esIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalada = estaInstalada();

  // Si está en iPhone y aún la ve desde el navegador, mostrar instrucciones manuales
  if (esIOS && !instalada) {
    const guiaIOS = document.getElementById('instrucciones-ios');
    if (guiaIOS) guiaIOS.hidden = false;
    estadoInstalacion.textContent = 'En iPhone la instalación se hace manualmente desde Safari:';
  }

  return esIOS;
}

function mostrarModoApp(){
  if (estaInstalada()) {
    etiquetaModo.textContent = 'Modo app instalada';
    estadoInstalacion.textContent = 'Estás usando la app instalada (standalone).';
  } else {
    etiquetaModo.textContent = 'Modo navegador';
  }
}

mostrarModoApp();
const esDispositivoIOS = verificarEntornoIOS();

if (!esDispositivoIOS && !estaInstalada()) {
  // Si en unos segundos no llega beforeinstallprompt, se informa al usuario
  setTimeout(() => {
    if (!eventoInstalacionDiferido && btnInstalar.hidden) {
      estadoInstalacion.textContent = 'Si no aparece el botón, usa el menú del navegador → "Instalar app" o "Agregar a pantalla de inicio".';
    }
  }, 3000);
}

// ---------- Fase 2: Control de cámara ----------
function detenerCamaraActiva(){
  if (streamActual) {
    streamActual.getTracks().forEach((track) => {
      track.stop();
    });
    streamActual = null;
  }
}

function actualizarControles(camaraEncendida){
  btnAlternar.disabled = !camaraEncendida;
  btnApagar.disabled = !camaraEncendida;
  btnPreparar.hidden = camaraEncendida;
  placeholderVideo.hidden = camaraEncendida;
}

function iniciarCamara(modo){
  // Liberar el sensor antes de pedir uno nuevo (obligatorio en iOS/WebKit)
  detenerCamaraActiva();
  visorVideo.srcObject = null;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    actualizarMensajeEstado('Tu navegador no soporta acceso a la cámara o la página no está en HTTPS.');
    return Promise.resolve();
  }

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  actualizarMensajeEstado('Encendiendo cámara ' + nombreCamara(modo).toLowerCase() + '…');

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then((stream) => {
      streamActual = stream;
      visorVideo.srcObject = stream;
      // La cámara frontal se muestra en espejo, como en una app nativa
      visorVideo.classList.toggle('espejo', modo === 'user');
      // iOS a veces necesita play() explícito además de autoplay
      const reproduccion = visorVideo.play();
      if (reproduccion && reproduccion.catch) {
        reproduccion.catch(() => {});
      }
      actualizarControles(true);
      actualizarMensajeEstado(`Cámara activa (${nombreCamara(modo)})`);
    })
    .catch((error) => {
      actualizarControles(false);
      if (error.name === 'NotAllowedError') {
        actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.');
      } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.');
      } else if (error.name === 'NotReadableError') {
        actualizarMensajeEstado('La cámara está ocupada por otra aplicación o no se liberó a tiempo. Inténtalo de nuevo.');
      } else {
        actualizarMensajeEstado(`Error al acceder al hardware: ${error.message}`);
      }
    });
}

// Paso 1: el usuario pulsa "Solicitar Acceso a Cámara" -> se muestra el aviso explicativo
btnPreparar.addEventListener('click', () => {
  avisoCamara.textContent = nombreCamara(modoCamaraActual).toLowerCase();
  avisoPermiso.hidden = false;
  btnPreparar.hidden = true;
  actualizarMensajeEstado('Lee el aviso antes de conceder el permiso.');
});

// Paso 2: el usuario confirma conscientemente -> se dispara la solicitud nativa
btnConfirmar.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  iniciarCamara(modoCamaraActual);
});

btnCancelar.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  btnPreparar.hidden = false;
  actualizarMensajeEstado('Acceso a cámara cancelado. No se solicitó ningún permiso.');
});

// Alternar entre lente trasera y frontal
btnAlternar.addEventListener('click', () => {
  if (cambiandoCamara) return;
  cambiandoCamara = true;
  btnAlternar.disabled = true;

  const modoAnterior = modoCamaraActual;
  modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';

  iniciarCamara(modoCamaraActual)
    .then(() => {
      // Si el lente nuevo no existe, volver al anterior
      if (!streamActual) {
        const mensajeError = mensajeEstado.textContent;
        modoCamaraActual = modoAnterior;
        return iniciarCamara(modoCamaraActual).then(() => {
          actualizarMensajeEstado(mensajeError + ' Se regresó a la cámara ' + nombreCamara(modoCamaraActual).toLowerCase() + '.');
        });
      }
    })
    .finally(() => {
      cambiandoCamara = false;
      btnAlternar.disabled = !streamActual;
    });
});

// Apagar la cámara y liberar el hardware
btnApagar.addEventListener('click', () => {
  detenerCamaraActiva();
  visorVideo.srcObject = null;
  visorVideo.classList.remove('espejo');
  actualizarControles(false);
  actualizarMensajeEstado('Cámara apagada. El sensor fue liberado.');
});

// Liberar la cámara si la app pasa a segundo plano
document.addEventListener('visibilitychange', () => {
  if (document.hidden && streamActual) {
    detenerCamaraActiva();
    visorVideo.srcObject = null;
    actualizarControles(false);
    actualizarMensajeEstado('Cámara apagada al salir de la app. Pulsa el botón para volver a encenderla.');
  }
});
