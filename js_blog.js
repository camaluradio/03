// BLOGGER JS ==========================================================================



document.addEventListener("DOMContentLoaded", function(){

  // ========================= Botón de copiar enlace del home =========================
  const copyBtnHome = document.getElementById('copyLink');
  if(copyBtnHome){
    copyBtnHome.addEventListener('click', function(){
      navigator.clipboard.writeText(window.location.href)
        .then(() => { alert('¡Enlace copiado al portapapeles!'); })
        .catch(() => { alert('No se pudo copiar el enlace.'); });
    });
  }

  // ========================= Variables principales =========================
  const ALL_POSTS = [];
  const ALL_PAGES = [];
  let ALL_TAGS = new Set();
  let currentTag = null;
  let renderedCount = 0;

  const feedsWrapper = document.getElementById("feedsWrapper");
  const feedCards = document.getElementById("feedCards");
  const tagTitleDiv = document.getElementById("currentTagTitle");

  // ========================= Función para normalizar URLs =========================
  function normalizeUrl(url){ 
    try{ return new URL(url, location.origin).href.replace(/\/$/,""); } 
    catch(e){ return url; } 
  }

  // ========================= Cargar posts =========================
  async function loadPosts(){
    for(const feed of FEEDS){
      try{
        const res = await fetch(feed.url);
        const data = await res.json();
        const entries = data.feed.entry || [];
        entries.forEach(e=>{
          const content = e.content?e.content.$t:e.summary?e.summary.$t:"";
          const image = (/<img[^>]+src="([^">]+)"/i.exec(content)||[])[1] || PLACEHOLDER_IMG;
          const summary = content.replace(/<[^>]*>/g,"").slice(0,150);
          const fecha = e.published ? new Date(e.published.$t).toLocaleDateString("es-AR") : "";
          const autor = e.author && e.author[0] ? e.author[0].name.$t : "";
          const etiquetas = e.category ? e.category.map(c=>c.term).join(", ") : "";
          const post = {
            id: e.id.$t.split(feed.pages?"page-":"post-")[1] || e.id.$t,
            title: e.title.$t,
            link: (e.link.find(l=>l.rel==="alternate")||{}).href||"#",
            content: content,
            image: image,
            summary: summary,
            fecha: fecha,
            autor: autor,
            etiquetas: etiquetas,
            isPage: !!feed.pages
          };
          if(feed.pages) ALL_PAGES.push(post);
          else {
            ALL_POSTS.push(post);
            etiquetas.split(", ").forEach(tag => {
              if(tag.trim()) ALL_TAGS.add(tag.trim());
            });
          }
        });
      }catch(err){console.warn("Error cargando feed",err);}
    }

    renderTagMenu();
    updateTagTitle();
    renderPosts(true);

    const params = new URLSearchParams(window.location.search);
    const postUrl = params.get("post");
    if(postUrl){
      const normUrl = normalizeUrl(decodeURIComponent(postUrl));
      const entry = ALL_POSTS.find(p=>normalizeUrl(p.link)===normUrl) || ALL_PAGES.find(p=>normalizeUrl(p.link)===normUrl);
      if(entry){ openPost(entry.id); return; }
    }
  }

  // ========================= Menú de tags =========================
  function renderTagMenu(){
    let html = `
 <nav class="navbar navbar-expand-lg navbar-dark bg-secondary rounded w-100 sombra">
  <div class="container-fluid">
    ${HEADER_TAG_HTML}
    <button class="navbar-toggler ms-auto" type="button" data-bs-toggle="collapse" data-bs-target="#tagMenuCollapse" aria-controls="tagMenuCollapse" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="collapse navbar-collapse" id="tagMenuCollapse">
      <div class="navbar-nav flex-wrap justify-content-end w-100">
        <a href="#" onclick="window.scrollTo({top:0,behavior:'smooth'}); return false;" class="btn btn-primary btn-sm m-1">
          <i class="bi bi-house-fill"></i> Inicio
        </a>
        <a href="#" data-tag="" class="btn btn-primary btn-sm m-1 ${!currentTag?'active':''}">
          <i class="bi bi-newspaper"></i> ${NEW_POSTS_LABEL}
        </a>
        ${[...ALL_TAGS].sort().map(tag => `
          <a href="#" data-tag="${tag}" class="btn btn-primary btn-sm m-1 ${currentTag===tag?'active':''}">${tag}</a>
        `).join("")}
      </div>
    </div>
  </div>
</nav>
    `;
    document.getElementById("tagMenu").innerHTML = html;
  }

  function updateTagTitle(){ tagTitleDiv.textContent = currentTag ? currentTag : DEFAULT_TAG_TITLE; }

  function getFilteredPosts(){ if(!currentTag) return ALL_POSTS; return ALL_POSTS.filter(p=>p.etiquetas.split(", ").includes(currentTag)); }

  // ========================= Render de posts =========================
  function renderPosts(reset=false){
    const filtered = getFilteredPosts();
    if(reset) renderedCount = 0;
    const nextPosts = filtered.slice(renderedCount, renderedCount + POSTS_PER_PAGE);
    renderedCount += nextPosts.length;

    const html = nextPosts.map(p=>{
      const tagsHTML = p.etiquetas.split(", ").map(tag=>`<a href="#" class="post-tag" data-tag="${tag}">${tag}</a>`).join(", ");
      return `
        <div class="post-item rounded sombra">
          <img src="${p.image}" alt="${p.title}" onerror="this.src='${PLACEHOLDER_IMG}'"/>
          <div class="post-overlay">
            <h2 class="pb-1">${p.title}</h2>
            ${!p.isPage ? `<p class="small"><i class="bi bi-calendar-fill"></i> ${p.fecha} <i class="bi bi-person-square"></i> ${p.autor}</p>` : ""}
            <p class="d-none">Etiquetas: ${tagsHTML}</p>
            <p class="d-none">${p.summary}...</p>
            <p class="text-end"><a class="btn btn-primary btn-sm m-0" href="#" data-postid="${p.id}"><i class="bi bi-box-arrow-right"></i> ${READ_MORE_LABEL}</a></p>
          </div>
        </div>
      `;
    }).join("");

    if(reset) feedCards.innerHTML = html;
    else feedCards.insertAdjacentHTML("beforeend", html);

    const moreBtnId = "loadMoreBtn";
    const existingBtn = document.getElementById(moreBtnId);
    if(renderedCount < filtered.length){
      if(!existingBtn){
        const btn = document.createElement("button");
        btn.className = "btn btn-primary mt-4";
        btn.id = moreBtnId;
        btn.innerHTML = '<i class="bi bi-cloud-download-fill"></i> ' + LOAD_MORE_LABEL;
        feedCards.insertAdjacentElement("afterend", btn);
      }
    } else if(existingBtn) existingBtn.remove();
  }

  // ========================= Abrir post en modal =========================
  function openPost(id){
    const entry = ALL_POSTS.find(p=>p.id===id) || ALL_PAGES.find(p=>p.id===id);
    if(!entry) return;

    const tagsHTML = entry.etiquetas.split(", ").map(tag=>`<a style="cursor:pointer" class="post-tag badge bg-primary" data-tag="${tag}">${tag}</a>`).join(", ");
    const modalTitle = document.querySelector("#postModal .modal-title");
    const modalBody = document.getElementById("postModalBody");
    const modalFooter = document.querySelector("#postModal .modal-footer");

    modalTitle.innerHTML = MODAL_TITLE_HTML;
    modalBody.innerHTML = `
      <div class="text-center" style="text-align:center;">
      <h3>${entry.title}</h3>
      ${!entry.isPage ? `<p class="small"><i class="bi bi-calendar-fill"></i> ${entry.fecha} <i class="bi bi-person-square"></i> ${entry.autor}</p>` : ""}
      <p class="small text-white">${tagsHTML}</p>
      </div>
      <div class="post-body">${entry.content}
      <div class="text-center mt-3"><button type="button" class="btn btn-primary mb-4" data-bs-dismiss="modal">Cerrar</button></div>
      </div>
    `;

    const url = encodeURIComponent(entry.link);
    const title = encodeURIComponent(entry.title);
    modalFooter.innerHTML = `
      <div class="d-flex flex-wrap justify-content-center align-items-center gap-2">Compartir 
        <a class='share-btn btn-facebook' href='https://www.facebook.com/sharer/sharer.php?u=${url}' target='_blank'><i class='text-white bi bi-facebook'></i></a>
        <a class='share-btn btn-twitter' href='https://twitter.com/intent/tweet?url=${url}&amp;text=${title}' target='_blank'><i class='text-white bi bi-twitter'></i></a>
        <a class='share-btn btn-whatsapp' href='https://api.whatsapp.com/send?text={url}' target='_blank'><i class='text-white bi bi-whatsapp'></i></a>
        <a class='share-btn btn-linkedin' href='https://www.linkedin.com/sharing/share-offsite/?url=${url}' target='_blank'><i class='text-white bi bi-linkedin'></i></a>
        <a class='share-btn btn-telegram' href='https://t.me/share/url?url=${url}&text=${title}' target='_blank'><i class='text-white bi bi-telegram'></i></a>
        <a class='share-btn btn-copy' style='cursor:pointer;'><i class='text-white bi bi-link-45deg'></i></a>
      </div>
    `;

    const copyBtn = modalFooter.querySelector(".btn-copy");
    if(copyBtn){
      copyBtn.addEventListener("click", function(){
        navigator.clipboard.writeText(entry.link)
          .then(() => alert("¡Enlace copiado al portapapeles!"))
          .catch(() => alert("No se pudo copiar el enlace."));
      });
    }

    modalBody.querySelectorAll(".post-body a").forEach(a=>{
      a.setAttribute("target","_blank");
      a.setAttribute("rel","noopener noreferrer");
      a.href = new URL(a.getAttribute("href"), location.origin).href;
    });

    const modalEl = document.getElementById("postModal");
    const modalInstance = new bootstrap.Modal(modalEl);
    modalEl.addEventListener("show.bs.modal", () => document.body.style.overflow = "hidden");
    modalEl.addEventListener("hidden.bs.modal", () => document.body.style.overflow = "");
    modalInstance.show();

    // ========================= Lightbox de imágenes =========================
    modalBody.querySelectorAll(".post-body img").forEach(img=>{
      img.style.cursor = "zoom-in";
      img.addEventListener("click", ev=>{
        ev.preventDefault(); ev.stopPropagation();
        const overlay = document.getElementById("modalImgLightbox");
        const lightImg = document.getElementById("modalLightboxImage");
        if(!overlay || !lightImg) return;
        lightImg.src = img.src;
        lightImg.style.transform = "translate(0px,0px) scale(1)";
        overlay.style.display = "flex";
        overlay.setAttribute("aria-hidden","false");
        document.body.style.overflow = "hidden";
        let scale=1, startX=0, startY=0, lastX=0, lastY=0, dragging=false, lastTouchDist=null;

        function getTransform(){
          const m=lightImg.style.transform.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)\s*scale\((-?\d+(?:\.\d+)?)\)/);
          return m?{x:parseFloat(m[1]),y:parseFloat(m[2]),s:parseFloat(m[3])}:{x:0,y:0,s:1};
        }

        function onPointerDown(e){dragging=true;lightImg.setPointerCapture&&lightImg.setPointerCapture(e.pointerId);startX=e.clientX;startY=e.clientY;const t=getTransform();lastX=t.x;lastY=t.y;scale=t.s;lightImg.style.cursor="grabbing";}
        function onPointerMove(e){if(!dragging) return; const dx=e.clientX-startX, dy=e.clientY-startY; const t=getTransform(); lightImg.style.transform=`translate(${lastX+dx}px, ${lastY+dy}px) scale(${scale})`;}
        function onPointerUp(e){dragging=false;lightImg.style.cursor="grab";try{lightImg.releasePointerCapture&&lightImg.releasePointerCapture(e.pointerId);}catch(_){}} 
        function onWheel(e){e.preventDefault();const delta=e.deltaY<0?1.1:0.9; const t=getTransform(); scale=Math.min(Math.max(t.s*delta,0.5),5); lightImg.style.transform=`translate(${t.x}px, ${t.y}px) scale(${scale})`;}
        function distance(touches){return Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);}
        function onTouchStart(e){if(e.touches.length===2){lastTouchDist=distance(e.touches);}else{startX=e.touches[0].clientX; startY=e.touches[0].clientY; const t=getTransform(); lastX=t.x; lastY=t.y; scale=t.s; dragging=true;}}
        function onTouchMove(e){if(e.touches.length===2&&lastTouchDist){const newDist=distance(e.touches); const t=getTransform(); scale=Math.min(Math.max(t.s*(newDist/lastTouchDist),0.5),5); lightImg.style.transform=`translate(${t.x}px, ${t.y}px) scale(${scale})`; lastTouchDist=newDist;}else if(dragging){const dx=e.touches[0].clientX-startX,dy=e.touches[0].clientY-startY; lightImg.style.transform=`translate(${lastX+dx}px, ${lastY+dy}px) scale(${scale})`;}}
        function onTouchEnd(e){if(e.touches.length===0){dragging=false;lastTouchDist=null;}}

        lightImg.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        lightImg.addEventListener("wheel", onWheel,{passive:false});
        lightImg.addEventListener("touchstart", onTouchStart,{passive:false});
        lightImg.addEventListener("touchmove", onTouchMove,{passive:false});
        lightImg.addEventListener("touchend", onTouchEnd);

        function closeOverlay(){
          overlay.style.display="none";
          overlay.setAttribute("aria-hidden","true");
          document.body.style.overflow="hidden";
          lightImg.removeEventListener("pointerdown", onPointerDown);
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          lightImg.removeEventListener("wheel", onWheel);
          lightImg.removeEventListener("touchstart", onTouchStart);
          lightImg.removeEventListener("touchmove", onTouchMove);
          lightImg.removeEventListener("touchend", onTouchEnd);
          lightImg.style.transform="translate(0px,0px) scale(1)";
          lastTouchDist=null; dragging=false;
        }

        overlay.onclick = function(ev){if(ev.target===overlay) closeOverlay();}
        const closeBtn=overlay.querySelector(".closeBtn"); if(closeBtn) closeBtn.onclick=closeOverlay;
      });
    });
  }

  // ========================= Abrir página estática =========================
  window.openStaticPage = function(url){
    const normUrl = normalizeUrl(url);
    const entry = ALL_PAGES.find(p=>normalizeUrl(p.link)===normUrl) || ALL_POSTS.find(p=>normalizeUrl(p.link)===normUrl);
    if(entry) openPost(entry.id);
    else console.warn("Página/post no encontrado:", url);
  }

  // ========================= Click global =========================
  document.addEventListener("click", function(e){
    const a = e.target.closest("a");
    if(a){
      const postId = a.dataset.postid;
      const tag = a.dataset.tag;

      if(postId){ e.preventDefault(); openPost(postId); }
      else if(tag !== undefined){
        e.preventDefault();
        const modalEl = document.getElementById("postModal");
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if(modalInstance) modalInstance.hide();

        currentTag = tag || null;
        renderTagMenu();
        updateTagTitle();
        renderPosts(true);
        feedsWrapper.style.display = "block";

        const tagMenuEl = document.getElementById("CML_blogjs");
        if(tagMenuEl){
          tagMenuEl.scrollIntoView({behavior:"smooth", block:"start"});
          const activeBtn = tagMenuEl.querySelector(".btn.active");
          if(activeBtn) activeBtn.focus({preventScroll:true});
        }
      }
    }

    const btn = e.target.closest("button");
    if(btn && btn.id === "loadMoreBtn") renderPosts();
  });

  loadPosts();


});
