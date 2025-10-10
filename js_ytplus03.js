// YOUTUBE JS ==========================================================================

let CML_radio = document.getElementById("CML_radio-player");
let players = [];
let embeddedPlayers = [];
let postVideoPlayers = [];

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
  
  // Inicializar videos en posts
  initializePostVideos();
};

// =================== SISTEMA DE VIDEOS SIMPLES EN POSTS ===================

// Función para inicializar videos simples en posts
function initializePostVideos() {
  const videoContainers = document.querySelectorAll('.cml-video');
  
  videoContainers.forEach((container, index) => {
    const videoId = container.getAttribute('data-video-id');
    if (!videoId) return;
    
    // Si ya está inicializado, saltar
    if (container.querySelector('iframe')) return;
    
    // Crear iframe de YouTube
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '315';
    iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.className = 'cml-video-iframe';
    
    // Agregar al contenedor
    container.appendChild(iframe);
    
    // Crear player para controlar el volumen
    const player = new YT.Player(iframe, {
      events: {
        'onStateChange': function(event) {
          if (event.data === YT.PlayerState.PLAYING) {
            // Bajar volumen de radio cuando el video se reproduce
            fade(CML_radio, 0, 300);
            // Pausar otros videos
            pauseAllOtherVideos(player);
          } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            // Restaurar volumen de radio cuando el video se pausa
            fade(CML_radio, 1, 2000);
          }
        }
      }
    });
    
    postVideoPlayers.push(player);
  });
}

// Pausar todos los videos excepto el actual
function pauseAllOtherVideos(currentPlayer) {
  // Pausar videos principales
  players.forEach(playerObj => {
    if (playerObj.player && playerObj.player !== currentPlayer) {
      try {
        playerObj.player.pauseVideo();
      } catch (e) {
        console.warn('Error pausando video principal:', e);
      }
    }
  });
  
  // Pausar otros videos de posts
  postVideoPlayers.forEach(player => {
    if (player && player !== currentPlayer && player.getPlayerState && player.getPlayerState() === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    }
  });
  
  // Pausar TTS
  if (window.pausarTTS) {
    window.pausarTTS();
  }
}

// =================== DETENER VIDEOS AL CLIC EN CUALQUIER PARTE ===================
document.addEventListener('click', function(e) {
  // Solo detener videos si el clic NO es en controles de video o contenedores de video
  const clickedOnVideo = e.target.closest('.controles') || 
                         e.target.closest('.contenedor_de_video') || 
                         e.target.closest('.cml-video') ||
                         e.target.closest('iframe');
  
  if (!clickedOnVideo) {
    let algunVideoReproduciendo = false;
    
    // Detener videos principales
    players.forEach((playerObj, index) => {
      try {
        if (playerObj.player && playerObj.player.getPlayerState && playerObj.player.getPlayerState() === YT.PlayerState.PLAYING) {
          playerObj.player.pauseVideo();
          algunVideoReproduciendo = true;
          
          // Restaurar overlay
          if (playerObj.overlay && playerObj.thumb) {
            playerObj.overlay.style.backgroundImage = `url('${playerObj.thumb}')`;
            playerObj.overlay.style.backgroundSize = "cover";
            playerObj.overlay.style.backgroundPosition = "center";
          }
          if (playerObj.playIcon) {
            playerObj.playIcon.innerHTML = `<i class="bi bi-play-fill"></i>`;
          }
          if (playerObj.durationTag) {
            playerObj.durationTag.style.opacity = 1;
          }
        }
      } catch (error) {
        console.warn('Error verificando estado del video ' + index, error);
      }
    });
    
    // Detener videos de posts
    postVideoPlayers.forEach(player => {
      try {
        if (player && player.getPlayerState && player.getPlayerState() === YT.PlayerState.PLAYING) {
          player.pauseVideo();
          algunVideoReproduciendo = true;
        }
      } catch (error) {
        console.warn('Error verificando estado del video de post:', error);
      }
    });
    
    // Si se detuvo algún video, restaurar volumen de radio
    if (algunVideoReproduciendo && CML_radio) {
      fade(CML_radio, 1, 2000);
    }
  }
});

// Función global para que TTS pueda pausar videos
window.pausarTodosLosAudios = function() {
  // Pausar videos principales
  players.forEach(playerObj => {
    if (playerObj.player && playerObj.player.pauseVideo) {
      try {
        playerObj.player.pauseVideo();
      } catch (e) {
        console.warn('Error pausando video principal:', e);
      }
    }
  });
  
  // Pausar videos de posts
  postVideoPlayers.forEach(player => {
    if (player && player.pauseVideo) {
      player.pauseVideo();
    }
  });
  
  // Bajar volumen de radio
  if (CML_radio) {
    fade(CML_radio, 0, 300);
  }
};

// Función global para detener TTS cuando video se reproduce
window.detenerTTSAlReproducirVideo = function() {
  if (window.pausarTTS) {
    window.pausarTTS();
  }
};

// Inicializar videos en posts cuando se cargue contenido dinámico
document.addEventListener('DOMContentLoaded', function() {
  // Si la API ya está cargada, inicializar inmediatamente
  if (window.YT && window.YT.Player) {
    setTimeout(initializePostVideos, 100);
  }
});

// Observar cambios en el DOM para posts AJAX
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    mutation.addedNodes.forEach(function(node) {
      if (node.nodeType === 1) {
        // Verificar si se agregó un video de post
        if (node.querySelector && node.querySelector('.cml-video')) {
          setTimeout(initializePostVideos, 100);
        }
        // Verificar si el nodo mismo es un video de post
        if (node.classList && node.classList.contains('cml-video')) {
          setTimeout(initializePostVideos, 100);
        }
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
