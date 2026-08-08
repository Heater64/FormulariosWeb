(function() {
  'use strict';

  // Retroalimentación háptica semántica.
  // Progressive enhancement:
  //   APK de Capacitor  → plugin nativo @capacitor/haptics (impact/notification)
  //   Web/navegador     → navigator.vibrate (fallback silencioso si no existe)
  //
  // Regla de uso: feedback OCASIONAL y significativo (éxito, error, logro,
  // selección importante). No se vibra en cada clic.

  function plugin() {
    try {
      const p = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
      return p || null;
    } catch (e) { return null; }
  }

  function vibrar(patron) {
    if (!('vibrate' in navigator)) return;
    try { navigator.vibrate(patron); } catch (e) {}
  }

  // Impacto corto y ligero (confirmación de toque significativo)
  function impacto(estilo) {
    const p = plugin();
    if (p) { try { p.impact({ style: estilo || 'LIGHT' }); return; } catch (e) {} }
    vibrar([6]);
  }

  // Notificación semántica nativa (éxito/aviso/error)
  function notificar(tipo) {
    const p = plugin();
    if (p) { try { p.notification({ type: tipo || 'SUCCESS' }); return; } catch (e) {} }
    if (tipo === 'ERROR') vibrar([30, 50, 30]);
    else if (tipo === 'WARNING') vibrar(14);
    else vibrar([12, 40, 18]);
  }

  const H = {
    // Toque ligero — NO se usa en cada clic; solo en interacciones clave
    toque: () => impacto('LIGHT'),
    // Éxito / completado
    exito: () => notificar('SUCCESS'),
    // Versículo memorizado / capítulo terminado (patrón doble)
    logro: () => { impacto('MEDIUM'); setTimeout(() => impacto('MEDIUM'), 90); },
    // Error / fallo
    error: () => notificar('ERROR'),
    // Equivocarse en una pregunta de examen
    fallo: () => notificar('ERROR'),
    // Aviso / nota guardada
    aviso: () => notificar('WARNING'),
    // Selección / toggle
    seleccion: () => impacto('LIGHT')
  };

  window.haptica = H;
})();
