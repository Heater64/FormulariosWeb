// ============================================================================
// js/core/back-navigation.js — Coordinador único de navegación "atrás"
// ============================================================================
// Problema: la app mezcla varios mecanismos de retroceso (botón interno, back
// del navegador, gesto Android, botón físico de la APK). Un modal abierto NO
// se cerraba con el back del sistema: el usuario pulsaba atrás y la
// navegación saltaba a otra vista.
//
// Política unificada (una sola fuente de verdad):
//   1. ¿Hay un modal / sheet / diálogo registrado? → Back lo CIERRA (LIFO:
//      el último abierto es el primero en cerrarse) y la ruta NO cambia.
//   2. ¿No hay nada abierto? → Back se comporta como el historial del
//      navegador (atrás). En la APK de Capacitor, sin historial, el propio
//      sistema cierra la aplicación.
//
// Mecanismo (por qué funciona):
//   - Al ABRIR una superficie, empujamos una entrada de historial con la MISMA
//     URL (history.pushState). El back del navegador la "deshace" (popstate
//     con la URL ya restaurada) y nosotros solo cerramos la superficie.
//   - NO re-empujamos nada en el popstate: la URL ya fue revertida por el pop.
//   - En la APK (Capacitor) no hay popstate: el evento backButton cierra la
//     superficie directamente.
// ============================================================================
(function () {
  'use strict';

  const BackNavigation = {
    _pila: [],
    _capacitor: null,

    iniciar() {
      // Back del navegador: cubre también el gesto de retroceso de Android
      // Chrome y la flecha de escritorio. Cuando llega aquí, el pop YA
      // restauró la URL anterior: solo hay que cerrar la superficie.
      window.addEventListener('popstate', () => {
        const handler = this._pila[this._pila.length - 1];
        if (!handler) return; // sin superficies → historial normal
        handler();
      });

      // Back físico de Android dentro de la APK (Capacitor). El evento
      // `backButton` existe en @capacitor/app 1.x-8.x; fallback silencioso si
      // el plugin no está presente (web / navegador).
      const cap = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if (cap && typeof cap.addListener === 'function') {
        this._capacitor = cap;
        cap.addListener('backButton', () => {
          const handler = this._pila[this._pila.length - 1];
          if (handler) { handler(); return; }
          if (window.history && window.history.length > 1) {
            try { window.history.back(); } catch (e) { /* sin historial */ }
          }
        });
      }
    },

    // Registra una superficie temporal (modal/sheet). Empuja una entrada de
    // historial con la misma URL para que el back del sistema la cierre sin
    // cambiar de ruta. Devuelve la función para desregistrar al cerrarse.
    registrar(handler) {
      if (typeof handler !== 'function') return () => {};
      this._pila.push(handler);
      try { history.pushState({ fb_modal: true }, '', location.href); } catch (e) { /* URL restringida */ }
      const self = this;
      return function desregistrar() { self.desregistrar(handler); };
    },

    desregistrar(handler) {
      const i = this._pila.lastIndexOf(handler);
      if (i >= 0) this._pila.splice(i, 1);
    },

    tienePendientes() {
      return this._pila.length > 0;
    },

    // Cierra la superficie superior (usado por botones internos de "atrás").
    cerrarSuperior() {
      const handler = this._pila[this._pila.length - 1];
      if (handler) handler();
    }
  };

  window.backNav = BackNavigation;

  document.addEventListener('DOMContentLoaded', () => {
    BackNavigation.iniciar();
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BackNavigation };
  }
})();
