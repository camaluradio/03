// FRASESJS ==========================================================================



(function(){
  const frases = [
    'Quien canta, su mal espanta.',
    'La música amansa las fieras.',
    'A ritmo de la zamba, todo se arregla.',
    'Guitarra que suena, corazón que siente.',
    'Donde hay canto, hay alegría.',
    'No hay mal que un acorde no pueda calmar.',
    'Canto que une, nunca divide.',
    'Al que buen son toca, la vida le sonríe.',
    'Quien toca con alma, toca para todos.',
    'El que sabe escuchar, encuentra melodía en todo.',
    'Quien siembra con paciencia, cosecha con alegría.',
    'Tierra que se cuida, da frutos que perduran.',
    'El que labra con amor, cosecha con corazón.',
    'Campo que habla, sabio enseña.',
    'El sol no se apresura, y la cosecha llega a tiempo.',
    'Agua que corre, vida que fluye.',
    'La semilla que cae, sabe esperar.',
    'Quien escucha el viento, aprende del cielo.',
    'La tierra no se engaña; devuelve lo que recibe.',
    'El surco profundo da fruto duradero.'
  ];

  let intervalo;
  const mensaje = document.getElementById('mensaje');
  const frasesBox = document.getElementById('frasesBox');

  function mostrarFrase(){
    if(!mensaje) return;
    mensaje.style.opacity = 0;
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * frases.length);
      mensaje.textContent = frases[randomIndex];
      mensaje.style.opacity = 1;
    }, 600);
  }

  document.addEventListener("DOMContentLoaded", () => {
    mostrarFrase();
    intervalo = setInterval(mostrarFrase, 10000);
  });

  if(frasesBox){
    frasesBox.addEventListener("click", () => {
      mostrarFrase();
      clearInterval(intervalo);
      intervalo = setInterval(mostrarFrase, 10000);
    });
  }
})();