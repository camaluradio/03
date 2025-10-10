// YOUTUBE JS ==========================================================================

let CML_radio = document.getElementById("CML_radio-player");
let players = [];
let youtubeAPILoaded = false;
let youtubeAPIReady = false;

// =================== INICIALIZACIÓN ROBUSTA ===================
function initializeYouTubeSystem() {
  console.log('Inicializando sistema YouTube...');
  
  // Verificar si ya estamos inicializados
  if (window.youtubeSystemInitialized) {
    console.log('Sistema YouTube ya estaba inicializado');
    return;
  }
  
  window.youtubeSystemInitialized = true;
  
  // Cargar API de YouTube si no está cargada
  if (!window.YT) {
    console.log('Cargando API de YouTube...');
    loadYouTubeAPI();
  } else if (window.YT && !youtubeAPIReady) {
    console.log('API de YouTube ya cargada, esperando ready...');
    // Si YT existe pero no está listo, esperar
    waitForYouTubeAPI();
  } else if (youtubeAPIReady) {
    console.log('API de YouTube lista, ejecutando...');
    // Si ya está listo, ejecutar inmediatamente
    executeYouTubeCode();
  }
}

// Cargar API de YouTube de forma robusta
function loadYouTubeAPI() {
  // Evitar cargar múltiples veces
  if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    console.log('API de YouTube ya está siendo cargada');
    waitForYouTubeAPI();
    return;
  }
  
  const script = document.createElement('script');
  script.src = 'https://www.youtube.com/iframe_api';
  script.onload = function() {
    console.log('API de YouTube cargada exitosamente');
    youtubeAPILoaded = true;
    waitForYouTubeAPI();
  };
  script.onerror = function() {
    console.error('Error cargando API de YouTube, reintentando...');
    setTimeout(loadYouTubeAPI, 2000);
  };
  document.head.appendChild(script);
}

// Esperar a que la API esté lista
function waitForYouTubeAPI() {
  const maxAttempts = 10;
  let attempts = 0;
  
  const checkAPI = setInterval(() => {
    attempts++;
    
    if (window.YT && window.YT.Player) {
      console.log('API de YouTube lista después de ' + attempts + ' intentos');
      clearInterval(checkAPI);
      youtubeAPIReady = true;
      
      // Si onYouTubeIframeAPIReady no se ejecuta automáticamente, forzarlo
      setTimeout(() => {
        if (window.onYouTubeIframeAPIReady && !window.youtubeAPICalled) {
          console.log('Forzando ejecución de onYouTubeIframeAPIReady');
          window.youtubeAPICalled = true;
          window.onYouTubeIframeAPIReady();
        }
      }, 100);
      
    } else if (attempts >= maxAttempts) {
      console.error('Timeout: API de YouTube no se cargó después de ' + maxAttempts + ' intentos');
      clearInterval(checkAPI);
      showYouTubeError();
    }
  }, 500);
}

// Mostrar error si falla la carga
function showYouTubeError() {
  const container = document.getElementById("videos");
  if (container) {
    container.innerHTML = `
      <div class="alert alert-warning text-center">
        <p>Error al cargar los videos. Por favor, recarga la página.</p>
        <button onclick="location.reload()" class="btn btn-primary btn-sm">Recargar Página</button>
      </div>
    `;
  }
}

// Ejecutar el código principal de YouTube
function executeYouTubeCode() {
  console.log('Ejecutando código YouTube...');
  
  if (USE_MOCK) {
    console.log('Usando datos mock');
    renderFlashes(mockData);
  } else {
    console.log('Cargando datos reales de YouTube');
    loadYouTubeData();
  }
}

// Cargar datos de YouTube con reintentos
function loadYouTubeData() {
  fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${PLAYLIST_ID}&key=${API_KEY}`)
    .then(res => {
      if (!res.ok) throw new Error('Error en la respuesta de YouTube API');
      return res.json();
    })
    .then(res => {
      const itemsReversed = res.items.reverse().slice(0, MAX_VIDEOS);
      const ids = itemsReversed.map(it => it.snippet.resourceId.videoId).join(",");
      
      return fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${API_KEY}`)
        .then(r => {
          if (!r.ok) throw new Error('Error en detalles de videos');
          return r.json();
        })
        .then(det => { 
          itemsReversed.forEach((it, i) => it.contentDetails = det.items[i].contentDetails); 
          return { items: itemsReversed }; 
        });
    })
    .then(data => {
      console.log('Datos de YouTube cargados exitosamente');
      renderFlashes(data);
    })
    .catch(err => {
      console.error('Error cargando videos:', err);
      
      // Reintentar después de 3 segundos
      setTimeout(() => {
        console.log('Reintentando carga de videos...');
        loadYouTubeData();
      }, 3000);
      
      // Mostrar mensaje de error temporal
      const container = document.getElementById("videos");
      if (container) {
        container.innerHTML = `
          <div class="alert alert-info text-center">
            <p>Cargando videos...</p>
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
          </div>
        `;
      }
    });
}

// =================== FADE ===================
const fadeIntervals = new WeakMap();
function fade(audio, target, duration = 500) {
  if (!audio) return;
  
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
  if (!container) {
    console.error('Contenedor de videos no encontrado');
    return;
  }
  
  console.log('Renderizando ' + (data.items?.length || 0) + ' videos');
  
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
    try {
      const player = new YT.Player(`player-${index}`,{
        videoId: videoId,
        playerVars: { autoplay:0, controls:0, modestbranding:1, rel:0 },
        events: { 
          'onStateChange': e => handleStateChange(e,index,thumb),
          'onError': (e) => {
            console.error('Error en player YouTube:', e);
          }
        }
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
        if(e.target.closest(".icons")) return;
        const state = player.getPlayerState ? player.getPlayerState() : -1;
        if(state === YT.PlayerState.PLAYING){
          player.pauseVideo();
        } else {
          players.forEach((o,j)=>{ if(j!==index && o.player.pauseVideo) o.player.pauseVideo(); });
          spinner.style.display="block";
          spinner.style.opacity=1;
          player.playVideo();
        }
      });

      // Eventos existentes
      playIcon.addEventListener("click",(e)=>{
        e.stopPropagation();
        const state = player.getPlayerState ? player.getPlayerState() : -1;
        if(state === YT.PlayerState.PLAYING){
          player.pauseVideo();
        } else {
          players.forEach((o,j)=>{ if(j!==index && o.player.pauseVideo) o.player.pauseVideo(); });
          spinner.style.display="block";
          spinner.style.opacity=1;
          player.playVideo();
        }
      });

      restart.addEventListener("click",(e)=>{
        e.stopPropagation();
        spinner.style.display="block";
        spinner.style.opacity=1;
        player.seekTo(0); 
        player.playVideo();
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
      
    } catch (error) {
      console.error('Error creando player YouTube:', error);
    }
  });

  // Detener videos al clic fuera
  document.addEventListener('click', function(event) {
    const clickedInsideVideo = event.target.closest('.contenedor_de_video');
    
    if (!clickedInsideVideo) {
      players.forEach((p, index) => {
        const player = p.player;
        if (player && player.getPlayerState && player.getPlayerState() === YT.PlayerState.PLAYING) {
          player.pauseVideo();
          
          const overlay = players[index].overlay;
          const playIcon = players[index].playIcon;
          const durationTag = players[index].durationTag;
          const thumb = players[index].thumb;
          
          if (overlay) {
            overlay.style.backgroundImage = `url('${thumb}')`;
            overlay.style.backgroundSize = "cover";
            overlay.style.backgroundPosition = "center";
          }
          if (playIcon) {
            playIcon.innerHTML = `<i class="bi bi-play-fill"></i>`;
          }
          if (durationTag) {
            durationTag.style.opacity = 1;
          }
          
          if (CML_radio) fade(CML_radio, 1, 2000);
        }
      });
    }
  });

  if(players.length===0){
    container.innerHTML = `<p class="no-videos">No hay videos disponibles para mostrar.</p>`;
  } else {
    console.log('Videos renderizados exitosamente: ' + players.length);
  }
}

// =================== STATE CHANGE ===================
function handleStateChange(event,index,thumb){
  const p = players[index]; 
  if(!p) return;

  if(event.data === YT.PlayerState.PLAYING){
    if(window.pausarTodosLosAudios) window.pausarTodosLosAudios();
  }

  switch(event.data){
    case YT.PlayerState.UNSTARTED:
    case YT.PlayerState.BUFFERING:
      if(p.spinner) {
        p.spinner.style.display="block";
        p.spinner.style.opacity=1;
      }
      break;
    case YT.PlayerState.PLAYING:
      if(p.overlay) p.overlay.style.background="rgba(0,0,0,0)";
      if(p.spinner) {
        p.spinner.style.display="none";
        p.spinner.style.opacity=0;
      }
      if(p.playIcon) p.playIcon.innerHTML = `<i class="bi bi-pause-fill"></i>`;
      if(p.durationTag) p.durationTag.style.opacity=0;
      if(CML_radio) fade(CML_radio,0,300);
      break;
    case YT.PlayerState.PAUSED:
      if(p.overlay) {
        p.overlay.style.backgroundImage=`url('${thumb}')`;
        p.overlay.style.backgroundSize="cover";
        p.overlay.style.backgroundPosition="center";
      }
      if(p.spinner) {
        p.spinner.style.display="none";
        p.spinner.style.opacity=0;
      }
      if(p.playIcon) p.playIcon.innerHTML = `<i class="bi bi-play-fill"></i>`;
      if(p.durationTag) p.durationTag.style.opacity=1;
      if(CML_radio) fade(CML_radio,1,2000);
      break;
    case YT.PlayerState.ENDED:
      if(p.playIcon) p.playIcon.innerHTML = `<i class="bi bi-play-fill"></i>`;
      if(p.spinner) {
        p.spinner.style.display="none";
        p.spinner.style.opacity=0;
      }
      if(p.durationTag) p.durationTag.style.opacity=1;
      if(CML_radio) fade(CML_radio,1,2000);
      break;
  }
}

// =================== MOCK DATA ===================
const mockData = {
  items:[
    {snippet:{resourceId:{videoId:"dQw4w9WgXcQ"}, title:"Video 1", description:"Desc 1", publishedAt:"2025-01-01T00:00:00Z"}, contentDetails:{duration:"PT3M33S"}},
    {snippet:{resourceId:{videoId:"3JZ_D3ELwOQ"}, title:"Video 2", description:"Desc 2", publishedAt:"2025-01-02T00:00:00Z"}, contentDetails:{duration:"PT4M12S"}},
    {snippet:{resourceId:{videoId:"L_jWHffIx5E"}, title:"Video 3", description:"Desc 3", publishedAt:"2025-01-03T00:00:00Z"}, contentDetails:{duration:"PT2M50S"}}
  ]
};

// =================== API READY ===================
window.onYouTubeIframeAPIReady = function(){
  console.log('onYouTubeIframeAPIReady ejecutado');
  window.youtubeAPICalled = true;
  youtubeAPIReady = true;
  executeYouTubeCode();
};

// =================== INICIALIZACIÓN AUTOMÁTICA ===================

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeYouTubeSystem);
} else {
  initializeYouTubeSystem();
}

// También inicializar cuando la página se recupere de caché
window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    console.log('Página recuperada desde caché, reinicializando YouTube...');
    setTimeout(initializeYouTubeSystem, 100);
  }
});

// Reintentar si hay error de red
window.addEventListener('online', function() {
  console.log('Conexión restaurada, verificando YouTube...');
  if (!youtubeAPIReady) {
    setTimeout(initializeYouTubeSystem, 1000);
  }
});
