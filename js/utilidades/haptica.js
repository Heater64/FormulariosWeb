(function() {
  'use strict';

  // Retroalimentación háptica (vibración) semántica.
  // Patrones cortos para que la app se sienta nativa.

  function vibrar(patron) {
    if (!('vibrate' in navigator)) return;
    try { navigator.vibrate(patron); } catch (e) {}
  }

  const H = {
    // Toque ligero (ya cubierto globalmente en click, pero disponible)
    toque: () => vibrar(8),
    // Éxito / completado
    exito: () => vibrar([12, 40, 18]),
    // Versículo memorizado / capítulo terminado
    logro: () => vibrar([10, 30, 10, 30, 20]),
    // Error / fallo
    error: () => vibrar([30, 50, 30]),
    // Equivocarse en una pregunta de examen
    fallo: () => vibrar([20, 40, 20]),
    // Aviso / nota guardada
    aviso: () => vibrar(14),
    // Selección / toggle
    seleccion: () => vibrar(6)
  };

  window.haptica = H;
})();
