// YOUTUBE JS ==========================================================================

let CML_radio = document.getElementById("CML_radio-player");
let players = [];
let embeddedPlayers = [];

// =================== FADE ===================
const fadeIntervals = new WeakMap();
function fade(audio, target, duration = 500) {
  if(fadeIntervals.has(audio)) clearInterval(fadeIntervals.get(audio));
  const stepTime = 50;
  const steps = duration / stepTime;
  const step = (target - audio.volume) / steps;
  let current = 0;
  const interval = setInterval(() => {
    current++;
    audio.volume = Math.min(Math.max(audio.volume + step, 0), 1);
    if (current >= steps) {
      clearInterval(interval);
      fadeIntervals.delete(audio);
    }
  }, stepTime);
  fadeIntervals.set(audio, interval);
}

// =================== FORMAT HELPERS ===================
function formatDuration(iso){
  if(!iso) return "";
  const m = iso.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  if(!m) return "";
  const min = m[1]||0, sec = m[2]||0;
  return `${min}:${sec.toString().padStart(2,'0')}`;
}

// =================== FULLSCREEN HELPERS ===================
function openFullscreen(el) {
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else if (el.msRequestFullscreen) el.msRequestFullscreen();
}
function closeFullscreen() {
  if (document.exitFullscreen) document.exitFullscreen();
  else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
  else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  else if (document.msExitFullscreen) document.msExitFullscreen();
}

// =================== RENDER VIDEOS ===================
function renderFlashes(data){
  const container = document.getElementById("videos");
  container.innerHTML = "";
  players = [];

  if(!data.items || data.items.length===0){
    container.innerHTML = `<p class="no-videos">Todavía no hay videos.</p>`;
    return;
  }

  let count = 0;
  data.items.forEach((item,index)=>{
    if(count >= MAX_VIDEOS) return;

    const videoId = item.snippet?.resourceId?.videoId;
    if(!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return;

    const contenedor = document.createElement("div");
    contenedor.className="yt-frame rounded contenedor_de_video";
    const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    contenedor.innerHTML = `
      <div id="player-${index}" class="yt-frame rounded"></div>
      <div class="overlay" style="background-image:url('${thumb}'); background-size:cover; background-position:center;">
        <div class="spinner"></div>
        <div class="controles">
          <button class="icons play-icon"><i class="bi bi-play-fill"></i></button>
          <button class="icons restart-icon"><i class="bi bi-skip-backward-fill"></i></button>
          <button class="icons fullscreen-icon"><i class="bi bi-arrows-move"></i></button>
          <button class="icons close-fullscreen-icon" style="display:none;"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="duration-tag">${formatDuration(item.contentDetails?.duration)}</div>
      </div>
    `;

    const body = document.createElement("div");
    body.className = "card-body";
    body.innerHTML = `
      <h5 class="card-title">${item.snippet.title}</h5>
      <p class="card-text text-truncate-3">${item.snippet.description || ''}</p>
    `;

    const cardContainer = document.createElement("div");
    cardContainer.className = "card sombra video-card";
    cardContainer.style.maxWidth = "540px";
    cardContainer.appendChild(contenedor);
    cardContainer.appendChild(body);
    container.appendChild(cardContainer);

    // =================== PLAYER ===================
    const player = new YT.Player(`player-${index}`,{
      videoId: videoId,
      playerVars: { autoplay:0, controls:0, modestbranding:1, rel:0 },
      events: { 'onStateChange': e => handleStateChange(e,index,thumb) }
    });

    const overlayEl = contenedor.querySelector(".overlay");
    const spinner = overlayEl.querySelector(".spinner");
    const playIcon = overlayEl.querySelector(".play-icon");
    const restart = overlayEl.querySelector(".restart-icon");
    const fullscreenBtn = overlayEl.querySelector(".fullscreen-icon");
    const closeFullscreenBtn = overlayEl.querySelector(".close-fullscreen-icon");
    const durationTag = overlayEl.querySelector(".duration-tag");

    spinner.style.display="none";
    spinner.style.opacity=0;

    // Hacer que todo el contenedor sea clickeable para play/pause
    contenedor.addEventListener("click", (e)=>{
      if(e.target.closest(".icons")) return; // Ignorar clicks sobre los botones
      const state = player.getPlayerState();
      if(state === YT.PlayerState.PLAYING){
        player.pauseVideo();
      } else {
        players.forEach((o,j)=>{ if(j!==index) o.player.pauseVideo(); });
        spinner.style.display="block";
        spinner.style.opacity=1;
        player.playVideo();
      }
    });

    // Eventos existentes
    playIcon.addEventListener("click",(e)=>{
      e.stopPropagation();
      const state = player.getPlayerState();
      if(state === YT.PlayerState.PLAYING){
        player.pauseVideo();
      } else {
        players.forEach((o,j)=>{ if(j!==index) o.player.pauseVideo(); });
        spinner.style.display="block";
        spinner.style.opacity=1;
        player.playVideo();
      }
    });

    restart.addEventListener("click",(e)=>{
      e.stopPropagation();
      spinner.style.display="block";
      spinner.style.opacity=1;
      player.seekTo(0); player.playVideo();
    });

    fullscreenBtn.addEventListener("click", (e)=>{
      e.stopPropagation();
      openFullscreen(contenedor);
      fullscreenBtn.style.display = "none";
      closeFullscreenBtn.style.display = "block";
    });

    closeFullscreenBtn.addEventListener("click", (e)=>{
      e.stopPropagation();
      closeFullscreen();
      closeFullscreenBtn.style.display = "none";
      fullscreenBtn.style.display = "block";
    });

    players.push({player,overlay:overlayEl,spinner,playIcon,durationTag,thumb});
    count++;
  });

  if(players.length===0){
    container.innerHTML = `<p class="no-videos">No hay videos disponibles para mostrar.</p>`;
  }
}

// =================== STATE CHANGE ===================
function handleStateChange(event,index,thumb){
  const p = players[index]; if(!p) return;

  // Coordinar con TTS cuando un video empiece a reproducirse
  if(event.data === YT.PlayerState.PLAYING){
    if(window.detenerTTSAlReproducirVideo) window.detenerTTSAlReproducirVideo();
  }

  switch(event.data){
    case YT.PlayerState.UNSTARTED:
    case YT.PlayerState.BUFFERING:
      p.spinner.style.display="block";
      p.spinner.style.opacity=1;
      break;
    case YT.PlayerState.PLAYING:
      p.overlay.style.background="rgba(0,0,0,0)";
      p.spinner.style.display="none";
      p.spinner.style.opacity=0;
      p.playIcon.innerHTML = `<i class="bi bi-pause-fill"></i>`;
      p.durationTag.style.opacity=0;
      fade(CML_radio,0,300);
      break;
    case YT.PlayerState.PAUSED:
      p.overlay.style.backgroundImage=`url('${thumb}')`;
      p.overlay.style.backgroundSize="cover";
      p.overlay.style.backgroundPosition="center";
      p.spinner.style.display="none";
      p.spinner.style.opacity=0;
      p.playIcon.innerHTML = `<i class="bi bi-play-fill"></i>`;
      p.durationTag.style.opacity=1;
      fade(CML_radio,1,2000);
      break;
    case YT.PlayerState.ENDED:
      p.playIcon.innerHTML = `<i class="bi bi-play-fill"></i>`;
      p.spinner.style.display="none";
      p.spinner.style.opacity=0;
      p.durationTag.style.opacity=1;
      fade(CML_radio,1,2000);
      break;
  }
}

// =================== MOCK DATA ===================
const mockData = {
  items:[
    {snippet:{resourceId:{videoId:"dQw4w9WgXcQ"}, title:"Video 1", description:"Desc 1: Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).", publishedAt:"2025-01-01T00:00:00Z"}, contentDetails:{duration:"PT3M33S"}},
    {snippet:{resourceId:{videoId:"3JZ_D3ELwOQ"}, title:"Video 2", description:"Desc 2: Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident.", publishedAt:"2025-01-02T00:00:00Z"}, contentDetails:{duration:"PT4M12S"}},
    {snippet:{resourceId:{videoId:"L_jWHffIx5E"}, title:"Video 3", description:"Desc 3: Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident.", publishedAt:"2025-01-03T00:00:00Z"}, contentDetails:{duration:"PT2M50S"}}
  ]
};

// =================== API READY ===================
window.onYouTubeIframeAPIReady = function(){
  // Videos principales
  if(USE_MOCK) renderFlashes(mockData);
  else {
    fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${PLAYLIST_ID}&key=${API_KEY}`)
      .then(res=>res.json())
      .then(res=>{
        const itemsReversed = res.items.reverse().slice(0, MAX_VIDEOS);
        const ids = itemsReversed.map(it=>it.snippet.resourceId.videoId).join(",");
        return fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${API_KEY}`)
          .then(r=>r.json())
          .then(det=>{ 
            itemsReversed.forEach((it,i)=>it.contentDetails=det.items[i].contentDetails); 
            return { items: itemsReversed }; 
          });
      })
      .then(data=>renderFlashes(data))
      .catch(err=>{
        document.getElementById("videos").innerHTML=`<p class="no-videos">Error al cargar videos</p>`;
        console.error(err);
      });
  }
  
  // Inicializar videos embebidos
  initializeEmbeddedVideos();
};

// =================== SISTEMA DE VIDEOS INCrustados EN POSTS ===================

// Función para inicializar videos incrustados
function initializeEmbeddedVideos() {
  const videoContainers = document.querySelectorAll('.embedded-video-player');
  
  videoContainers.forEach((container, index) => {
    const videoId = container.getAttribute('data-video-id');
    if (!videoId) return;
    
    // Si ya está inicializado, saltar
    if (container.querySelector('iframe')) return;
    
    // Crear player embebido
    const playerId = `embedded-player-${Date.now()}-${index}`;
    container.id = playerId;
    
    const player = new YT.Player(playerId, {
      videoId: videoId,
      playerVars: { 
        autoplay: 0, 
        controls: 1, 
        modestbranding: 1, 
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3
      },
      events: {
        'onStateChange': (event) => handleEmbeddedStateChange(event, player, container)
      }
    });
    
    embeddedPlayers.push({ player, container });
  });
}

// Manejar cambios de estado en videos embebidos
function handleEmbeddedStateChange(event, player, container) {
  switch(event.data) {
    case YT.PlayerState.PLAYING:
      // Pausar otros videos y TTS cuando un video embebido se reproduce
      pauseAllOtherMedia();
      break;
    case YT.PlayerState.PAUSED:
    case YT.PlayerState.ENDED:
      // Restaurar audio cuando el video se pausa
      if (window.CML_radio && window.fade) {
        window.fade(window.CML_radio, 1, 1000);
      }
      break;
  }
}

// Pausar todos los medios (videos principales, embebidos y TTS)
function pauseAllOtherMedia() {
  // Pausar videos principales
  if (window.players && Array.isArray(window.players)) {
    window.players.forEach(playerObj => {
      if (playerObj.player && typeof playerObj.player.pauseVideo === 'function') {
        try {
          playerObj.player.pauseVideo();
        } catch (e) {
          console.warn('Error pausando video principal:', e);
        }
      }
    });
  }
  
  // Pausar otros videos embebidos
  embeddedPlayers.forEach(embedded => {
    if (embedded.player !== this && 
        embedded.player.getPlayerState && 
        embedded.player.getPlayerState() === YT.PlayerState.PLAYING) {
      embedded.player.pauseVideo();
    }
  });
  
  // Pausar TTS
  if (window.pausarTTS) {
    window.pausarTTS();
  }
  
  // Bajar volumen de radio
  if (window.CML_radio && window.fade) {
    window.fade(window.CML_radio, 0, 300);
  }
}

// =================== DETENER VIDEOS AL CLIC EN CUALQUIER PARTE ===================
document.addEventListener('click', function(e) {
  // Solo detener videos si el clic NO es en controles de video
  if (!e.target.closest('.controles')) {
    if (window.players && Array.isArray(window.players)) {
      let algunVideoReproduciendo = false;
      
      window.players.forEach((playerObj, index) => {
        try {
          if (playerObj.player && 
              typeof playerObj.player.getPlayerState === 'function' &&
              typeof playerObj.player.pauseVideo === 'function') {
            
            const estado = playerObj.player.getPlayerState();
            if (estado === YT.PlayerState.PLAYING) {
              playerObj.player.pauseVideo();
              algunVideoReproduciendo = true;
            }
          }
        } catch (error) {
          console.warn('Error verificando estado del video ' + index, error);
        }
      });
      
      // Si se detuvo algún video, restaurar volumen de radio
      if (algunVideoReproduciendo && window.CML_radio && window.fade) {
        window.fade(window.CML_radio, 1, 2000);
      }
    }
  }
});

// Función global para detener todos los videos
window.detenerTodosLosVideos = function() {
  if (window.players && Array.isArray(window.players)) {
    window.players.forEach((playerObj, index) => {
      try {
        if (playerObj.player && typeof playerObj.player.pauseVideo === 'function') {
          playerObj.player.pauseVideo();
        }
      } catch (error) {
        console.warn('Error deteniendo video ' + index, error);
      }
    });
  }
};

// Función global para que TTS pueda pausar videos embebidos
window.pausarTodosLosAudios = function() {
  // Pausar videos principales
  if (window.players && Array.isArray(window.players)) {
    window.players.forEach(playerObj => {
      if (playerObj.player && typeof playerObj.player.pauseVideo === 'function') {
        try {
          playerObj.player.pauseVideo();
        } catch (e) {
          console.warn('Error pausando video principal:', e);
        }
      }
    });
  }
  
  // Pausar videos embebidos
  embeddedPlayers.forEach(embedded => {
    if (embedded.player && embedded.player.pauseVideo) {
      embedded.player.pauseVideo();
    }
  });
  
  // Bajar volumen de radio
  if (window.CML_radio && window.fade) {
    window.fade(window.CML_radio, 0, 300);
  }
};

// Inicializar videos embebidos cuando se cargue contenido dinámico
document.addEventListener('DOMContentLoaded', function() {
  // Si la API ya está cargada, inicializar inmediatamente
  if (window.YT && window.YT.Player) {
    setTimeout(initializeEmbeddedVideos, 100);
  }
  
  // Observar cambios en el DOM para posts cargados dinámicamente
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1 && 
            (node.querySelector('.embedded-video-player') || 
             node.classList?.contains('embedded-video-player'))) {
          setTimeout(initializeEmbeddedVideos, 100);
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});