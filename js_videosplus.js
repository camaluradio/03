// =================== POST VIDEOS REUSABLES ===================
let players = [];

// =================== RENDER POST VIDEOS ===================
function renderPostVideos(){
  const containers = document.querySelectorAll('.contenedor_de_video');
  containers.forEach((contenedor, index) => {
    const videoId = contenedor.dataset.videoId;
    if(!videoId) return;

    const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    contenedor.innerHTML = `
      <div id="player-post-${index}" class="yt-frame rounded"></div>
      <div class="overlay" style="background-image:url('${thumb}'); background-size:cover; background-position:center; cursor:pointer;">
        <div class="spinner"></div>
        <div class="controles">
          <button class="icons play-icon"><i class="bi bi-play-fill"></i></button>
          <button class="icons restart-icon"><i class="bi bi-skip-backward-fill"></i></button>
          <button class="icons fullscreen-icon"><i class="bi bi-arrows-move"></i></button>
          <button class="icons close-fullscreen-icon" style="display:none;"><i class="bi bi-x-lg"></i></button>
        </div>
      </div>
    `;

    // =================== YT PLAYER ===================
    const player = new YT.Player(`player-post-${index}`, {
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

    // =================== EVENTOS ===================
    overlayEl.addEventListener("click", (e)=>{
      if(e.target.closest(".icons")) return;
      const state = player.getPlayerState();
      if(state === YT.PlayerState.PLAYING) player.pauseVideo();
      else player.playVideo();
    });

    playIcon.addEventListener("click",(e)=>{ e.stopPropagation(); player.getPlayerState()===YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo(); });
    restart.addEventListener("click",(e)=>{ e.stopPropagation(); player.seekTo(0); player.playVideo(); });
    fullscreenBtn.addEventListener("click",(e)=>{ e.stopPropagation(); openFullscreen(contenedor); fullscreenBtn.style.display="none"; closeFullscreenBtn.style.display="block"; });
    closeFullscreenBtn.addEventListener("click",(e)=>{ e.stopPropagation(); closeFullscreen(); closeFullscreenBtn.style.display="none"; fullscreenBtn.style.display="block"; });

    players.push({player,overlay:overlayEl,spinner,playIcon,thumb});
  });
}

// =================== DETENER VIDEOS AL HACER CLICK FUERA ===================
document.addEventListener('click', function(event) {
  const clickedInsideVideo = event.target.closest('.contenedor_de_video');
  if(!clickedInsideVideo){
    players.forEach((p,index)=>{
      const player = p.player;
      if(player && player.getPlayerState && player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
      const overlay = p.overlay;
      if(overlay) overlay.style.backgroundImage = `url('${p.thumb}')`;
      if(p.playIcon) p.playIcon.innerHTML = `<i class="bi bi-play-fill"></i>`;
      if(p.spinner) { p.spinner.style.display="none"; p.spinner.style.opacity=0; }
    });
  }
});

// =================== Llamar cuando la API esté lista ===================
window.onYouTubeIframeAPIReady = function(){
  renderPostVideos(); // genera los videos en posts automáticamente
  if(USE_MOCK) renderFlashes(mockData); // tu función original de playlists
};
