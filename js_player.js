// PLAYER JS ==========================================================================



document.addEventListener("DOMContentLoaded", () => {
  const btnPlay = document.getElementById("btnPlay");
  const btnMute = document.getElementById("btnMute");
  const playGroup = document.getElementById("playGroup");
  const playLabel = document.getElementById("playLabel");

  // Spinner dentro del botón de play
  const btnSpinner = document.createElement("div");
  btnSpinner.className = "spinner";

  btnSpinner.style.width = "30px";
  btnSpinner.style.height = "30px";
  btnSpinner.style.zIndex = 5;
  btnSpinner.style.display = "none";
  btnSpinner.style.opacity = 0;
  if(btnPlay) btnPlay.appendChild(btnSpinner);

  function showBtnSpinner(show){
    btnSpinner.style.display = show ? "block" : "none";
    btnSpinner.style.opacity = show ? 1 : 0;
    const icon = btnPlay.querySelector("i");
    if(icon) icon.style.display = show ? "none" : "inline-block";
  }

  const radio = document.getElementById("CML_radio-player");
  if(!radio){
    console.error("No se encontró #CML_radio-player");
    return;
  }

  const sourceEl = radio.querySelector('source');
  const originalSrc = (sourceEl && (sourceEl.getAttribute('data-base') || sourceEl.getAttribute('src') || sourceEl.src))
                      || radio.getAttribute('data-base') || radio.src || radio.getAttribute('src') || "";

  let isConnected = false;
  let desiredPlaying = false;

  function updateButtonUI(connected, playing){
    if(connected && playing){
      if(playGroup) playGroup.classList.remove('blink');
      if(playLabel) playLabel.textContent = "PAUSA";
      btnPlay.classList.remove('btn-primary');
      btnPlay.classList.add('btn-active');
      btnPlay.setAttribute("aria-pressed", "true");
      const icon = btnPlay.querySelector("i");
      if(icon) icon.className = "bi bi-pause-fill";
    } else {
      if(playGroup) playGroup.classList.add('blink');
      if(playLabel) playLabel.textContent = "REPRODUCIR";
      btnPlay.classList.remove('btn-active');
      btnPlay.classList.add('btn-primary');
      btnPlay.setAttribute("aria-pressed", "false");
      const icon = btnPlay.querySelector("i");
      if(icon) icon.className = "bi bi-play-fill";
    }
  }

  function setSourceAndLoad(freshSrc){
    if(sourceEl){
      sourceEl.src = freshSrc;
    } else {
      radio.src = freshSrc;
    }
    radio.load();
  }

  function connectStream(){
    if(!originalSrc){
      console.error("No se encontró URL de streaming (originalSrc vacío).");
      return Promise.reject(new Error("No streaming URL"));
    }
    const base = originalSrc.split('?')[0];
    const fresh = base + "?t=" + Date.now();
    setSourceAndLoad(fresh);
    showBtnSpinner(true);
    return radio.play().then(()=> {
      isConnected = true;
      desiredPlaying = true;
      showBtnSpinner(false);
      return true;
    }).catch(err=>{
      isConnected = false;
      desiredPlaying = false;
      console.error("Error al conectar/repoducir stream:", err);
      showBtnSpinner(false);
      throw err;
    });
  }

  function disconnectStream(){
    try {
      desiredPlaying = false;
      radio.pause();
      if(sourceEl){
        sourceEl.removeAttribute('src');
      } else {
        radio.removeAttribute('src');
      }
      radio.load();
    } catch(e){
      console.warn("Error al desconectar stream:", e);
    } finally {
      isConnected = false;
      showBtnSpinner(false);
    }
  }

  radio.addEventListener('playing', () => {
    updateButtonUI(true, true);
    isConnected = true;
    showBtnSpinner(false);
  });

  radio.addEventListener('pause', () => {
    updateButtonUI(isConnected, false);
    showBtnSpinner(false);
  });

  radio.addEventListener('error', (ev) => {
    console.error("Audio error event:", ev);
    disconnectStream();
    updateButtonUI(false, false);
    showBtnSpinner(false);
  });

  if(btnPlay){
    btnPlay.addEventListener("click", async () => {
      if(!isConnected){
        updateButtonUI(false, false);
        try {
          await connectStream();
        } catch(err){
          updateButtonUI(false, false);
          showBtnSpinner(false);
        }
      } else {
        disconnectStream();
        updateButtonUI(false, false);
        showBtnSpinner(false);
      }
    });
  }

  if(btnMute){
    btnMute.addEventListener("click", () => {
      radio.muted = !radio.muted;
      btnMute.setAttribute("aria-pressed", radio.muted ? "true" : "false");
      const icon = btnMute.querySelector("i");
      if(icon){
        icon.className = radio.muted ? "bi bi-volume-mute-fill" : "bi bi-volume-up-fill";
      }
    });
  }

  updateButtonUI(false, false);
});