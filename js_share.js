// SHARE JS ========================================================================== 



(function(){
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);
  document.getElementById('shareFacebook').href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  document.getElementById('shareTwitter').href = `https://twitter.com/intent/tweet?url=${url}&amp;text=${title}`;
  document.getElementById('shareWhatsApp').href = `https://api.whatsapp.com/send?text=${title}%20${url}`;
  document.getElementById('shareLinkedIn').href = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  document.getElementById('shareTelegram').href = `https://t.me/share/url?url=${url}&amp;text=${title}`;
  document.getElementById('shareDiscord').href = `https://discord.com/channels/@me?text=${title}%20${url}`;
  document.getElementById('copyLink').addEventListener('click', function(){
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('¡Enlace copiado al portapapeles!');
    }).catch(() => {
      alert('No se pudo copiar el enlace.');
    });
  });
})();