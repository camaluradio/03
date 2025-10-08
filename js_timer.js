// TIMER JS ==========================================================================



document.addEventListener("DOMContentLoaded", async () => {
  let offset = 0; // diferencia entre API y reloj local en ms
  const API_URL = "https://worldtimeapi.org/api/timezone/America/Argentina/Buenos_Aires";

  async function syncWithAPI(reintentos = 3) {
    for (let i = 0; i < reintentos; i++) {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const fechaAPI = new Date(data.datetime);
        const fechaLocal = new Date();
        offset = fechaAPI.getTime() - fechaLocal.getTime();
        console.log(`Sincronizado con API. Offset: ${offset / 1000} seg.`);
        return;
      } catch (e) {
        console.warn(`Error obteniendo hora (intento ${i + 1}):`, e);
        await new Promise(r => setTimeout(r, 1000)); // espera 1s antes de reintentar
      }
    }
    console.error("No se pudo sincronizar con la API después de varios intentos.");
  }

  function actualizarProgramacion() {
    const bloques = document.querySelectorAll(".bloque");
    if (!bloques.length) return; // no hay elementos que mostrar

    const ahora = new Date(Date.now() + offset);
    const horaHHMM = ahora.getHours() * 100 + ahora.getMinutes();
    const diaSemana = ahora.getDay();

    bloques.forEach(b => {
      const inicio = parseInt(b.dataset.inicio) || 0;
      const fin = parseInt(b.dataset.fin) || 2400;
      const dias = b.dataset.dias ? b.dataset.dias.split(",").map(n => parseInt(n)) : null;

      let mostrar = horaHHMM >= inicio && horaHHMM < fin;
      if (dias) mostrar = mostrar && dias.includes(diaSemana);

      b.style.display = mostrar ? "grid" : "none";
    });
  }

  // Sincroniza al inicio
  await syncWithAPI();
  actualizarProgramacion();

  // Actualiza cada minuto
  setInterval(actualizarProgramacion, 60 * 1000);

  // Re-sincroniza con la API cada hora
  setInterval(syncWithAPI, 60 * 60 * 1000);
});