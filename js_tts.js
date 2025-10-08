let ttsActiva = false;
let utteranceActual = null;

function esSoportadoTTS() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

// =================== COORDINACIÓN DE AUDIO ===================
function forzarPausaDeVideosYRadio() {
  console.log('FORZANDO pausa de videos y radio');
  
  // Pausar videos usando el objeto global players
  if (window.players && Array.isArray(window.players)) {
    window.players.forEach((playerObj, index) => {
      try {
        if (playerObj.player && typeof playerObj.player.pauseVideo === 'function') {
          playerObj.player.pauseVideo();
          console.log('Video ' + index + ' pausado');
        }
      } catch (e) {
        console.warn('Error pausando video ' + index, e);
      }
    });
  }
  
  // Bajar volumen de radio a 0 (igual que con los videos)
  const radioPlayer = document.getElementById("CML_radio-player");
  if (radioPlayer) {
    console.log('Bajando volumen de radio a 0');
    
    // Usar fade idéntico al de videos: volumen 0 en 300ms
    if (window.fade) {
      window.fade(radioPlayer, 0.1, 500); // MISMO que videos: volumen 0, 300ms
    } else {
      // Fallback si fade no existe
      radioPlayer.volume = 0;
    }
  }
}

function restaurarVolumenRadio() {
  console.log('Restaurando volumen radio a 1');
  const radioPlayer = document.getElementById("CML_radio-player");
  if (radioPlayer) {
    // Usar fade idéntico al de videos: volumen 1 en 2000ms  
    if (window.fade) {
      window.fade(radioPlayer, 1, 2000); // MISMO que videos: 2000ms
    } else {
      // Fallback si fade no existe
      radioPlayer.volume = 1;
    }
  }
}

function pausarTTS() {
  if (ttsActiva) {
    speechSynthesis.cancel();
    ttsActiva = false;
    
    document.querySelectorAll('.tts-button').forEach(btn => {
      btn.innerHTML = '<i class="bi bi-play-fill"></i> Leer en voz alta';
    });
    
    document.querySelectorAll('.tts-highlight').forEach(span => {
      span.replaceWith(document.createTextNode(span.textContent));
    });
    
    console.log('TTS detenido');
  }
}

function agregarBotonesTTS(contexto = document) {
  if (!esSoportadoTTS()) return;

  const posts = contexto.querySelectorAll('.entry-content, .post-body'); 
  posts.forEach(post => {
    if (post.querySelector('.tts-button-container')) return;

    const contenedor = document.createElement('div');
    contenedor.className = 'tts-button-container text-center mb-2';

    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-sm tts-button';
    btn.innerHTML = '<i class="bi bi-play-fill"></i> Leer en voz alta';
    btn.onclick = () => toggleLectura(post, btn);

    const ayudaBtn = document.createElement('button');
    ayudaBtn.className = 'btn btn-outline-secondary btn-sm ms-2';
    ayudaBtn.innerHTML = '?';
    ayudaBtn.type = 'button';

    const ayudaDiv = document.createElement('div');
    ayudaDiv.className = 'tts-help-inline';
    ayudaDiv.innerHTML = `
      <button class="close-btn" aria-label="Cerrar">&times;</button>
      <b>Configuración de voces:</b><br>
      1. Asegúrate de tener voces en español instaladas.<br>
      2. En Chrome/Brave: Ajustes → Avanzado → Accesibilidad → Voz.<br>
      3. La voz seleccionada se usa automáticamente por el lector.
    `;

    ayudaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.tts-help-inline').forEach(div => {
        if (div !== ayudaDiv) cerrarAyuda(div);
      });
      if (ayudaDiv.classList.contains('show')) {
        cerrarAyuda(ayudaDiv);
      } else {
        mostrarAyuda(ayudaDiv);
      }
    });

    ayudaDiv.querySelector('.close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      cerrarAyuda(ayudaDiv);
    });

    ayudaDiv.addEventListener('click', () => cerrarAyuda(ayudaDiv));

    document.addEventListener('click', (e) => {
      if (!ayudaDiv.contains(e.target) && !ayudaBtn.contains(e.target)) {
        cerrarAyuda(ayudaDiv);
      }
    });

    contenedor.appendChild(btn);
    contenedor.appendChild(ayudaBtn);
    document.body.appendChild(ayudaDiv);
    post.insertBefore(contenedor, post.firstChild);
  });
}

function mostrarAyuda(div) {
  div.style.display = 'block';
  requestAnimationFrame(() => {
    div.classList.add('show');
  });
}

function cerrarAyuda(div) {
  div.classList.remove('show');
  setTimeout(() => { div.style.display = 'none'; }, 300);
}

function toggleLectura(postElement, btn) {
  if (!ttsActiva) {
    // ✅ FORZAR PAUSA DE VIDEOS Y RADIO ANTES DE TTS
    forzarPausaDeVideosYRadio();
    
    btn.innerHTML = '<i class="bi bi-arrow-clockwise tts-loading-icon"></i> Cargando…';
    setTimeout(() => {
      leerPost(postElement, btn);
    }, 500);
  } else {
    detenerLectura(postElement, btn);
    restaurarVolumenRadio();
  }
}

function leerPost(postElement, btn) {
  detenerLectura(postElement, btn, false);
  ttsActiva = true;

  const texto = Array.from(postElement.childNodes)
    .filter(n => !n.classList || !n.classList.contains('tts-button-container'))
    .map(n => n.innerText || n.textContent)
    .join(' ')
    .trim();

  const frases = texto.match(/[^.!?]+[.!?]?/g) || [texto];
  let index = 0;

  const voces = speechSynthesis.getVoices();
  const vozSeleccionada = voces.find(v => v.lang === 'es-AR') || voces.find(v => v.lang.startsWith('es')) || null;

  function leerFrase() {
    if (!ttsActiva || index >= frases.length) {
      limpiarResaltadoPost(postElement);
      btn.innerHTML = '<i class="bi bi-play-fill"></i> Leer en voz alta';
      ttsActiva = false;
      restaurarVolumenRadio();
      return;
    }

    const frase = frases[index].trim();
    if (!frase) { index++; leerFrase(); return; }

    resaltarFraseVisual(postElement, frase);

    utteranceActual = new SpeechSynthesisUtterance(frase);
    utteranceActual.voice = vozSeleccionada;
    utteranceActual.lang = 'es';
    utteranceActual.rate = 1;
    utteranceActual.pitch = 1;

    utteranceActual.onstart = () => {
      if (index === 0) btn.innerHTML = '<i class="bi bi-stop-fill"></i> Detener';
    };

    utteranceActual.onend = () => {
      limpiarResaltadoPost(postElement);
      index++;
      setTimeout(leerFrase, 50);
    };

    utteranceActual.onerror = () => {
      limpiarResaltadoPost(postElement);
      btn.innerHTML = '<i class="bi bi-play-fill"></i> Leer en voz alta';
      ttsActiva = false;
      restaurarVolumenRadio();
    };

    speechSynthesis.speak(utteranceActual);
  }

  leerFrase();
}

function detenerLectura(postElement, btn, resetBoton = true) {
  ttsActiva = false;
  speechSynthesis.cancel();
  limpiarResaltadoPost(postElement);
  utteranceActual = null;
  if (btn && resetBoton) btn.innerHTML = '<i class="bi bi-play-fill"></i> Leer en voz alta';
}

function resaltarFraseVisual(postElement, frase) {
  limpiarResaltadoPost(postElement);

  const walker = document.createTreeWalker(postElement, NodeFilter.SHOW_TEXT, null, false);
  let nodo;
  while ((nodo = walker.nextNode())) {
    if (!nodo.nodeValue.trim()) continue;
    if (nodo.parentNode.closest('.tts-button-container')) continue;

    const regex = new RegExp(frase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    if (regex.test(nodo.nodeValue)) {
      const span = document.createElement('span');
      span.className = 'tts-highlight';
      span.textContent = frase;

      const index = nodo.nodeValue.indexOf(frase);
      const afterText = nodo.splitText(index);
      afterText.nodeValue = afterText.nodeValue.substring(frase.length);

      nodo.parentNode.insertBefore(span, afterText);
      break;
    }
  }
}

function limpiarResaltadoPost(postElement) {
  const spans = postElement.querySelectorAll('span.tts-highlight');
  spans.forEach(span => { span.replaceWith(document.createTextNode(span.textContent)); });
}

// Detectar y ejecutar sobre contenido dinámico
document.addEventListener('DOMContentLoaded', () => {
  agregarBotonesTTS();

  const modal = document.getElementById('postModal');
  if (modal) {
    modal.addEventListener('shown.bs.modal', () => {
      const modalBody = modal.querySelector('#postModalBody');
      if (modalBody) agregarBotonesTTS(modalBody);
    });
    
    modal.addEventListener('hidden.bs.modal', () => {
      pausarTTS();
      restaurarVolumenRadio();
    });
  }

  const observer = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1) agregarBotonesTTS(n);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  speechSynthesis.onvoiceschanged = () => {};
});

window.detenerTTSAlReproducirVideo = function() {
  console.log('Video activado - Deteniendo TTS');
  pausarTTS();
};