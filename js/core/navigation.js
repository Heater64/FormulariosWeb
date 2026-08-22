// ============================================================
// js/core/navigation.js - Barra de navegación inteligente
// ============================================================

// La barra inferior es SIEMPRE visible (decisión de producto): no se oculta
// al hacer scroll. Lo único que la oculta temporalmente es el teclado
// virtual (para no tapar el campo activo), y reaparece al desenfocar.
class NavigationManager {
  constructor() {
    this._nav = document.getElementById('barra-navegacion');
    this._isHidden = false;
    this._tecladoAbierto = false;
    this._scrollTimeout = null;

    this._init();
  }

  _init() {
    if (!this._nav) return;
    // Garantizar estado visible inicial (nunca oculta por scroll)
    this._nav.style.transform = '';
    this._initTeclado();
  }

  // Teclado virtual → ocultar la barra inferior mientras se escribe (el
  // teclado tapa la parte inferior; la barra reaparece al desenfocar).
  // Solo aplica en pantallas estrechas (barra inferior); en escritorio la
  // navegación es una sidebar fija a la izquierda y no hay teclado virtual.
  // Antes vivía como script inline en index.html; la CSP de producción no
  // permite inline, así que vive aquí.
  _initTeclado() {
    document.addEventListener('focusin', (e) => {
      if (window.innerWidth >= 1024) return;
      if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) {
        this.ocultarPorTeclado(true);
      }
    }, true);
    document.addEventListener('focusout', (e) => {
      if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) {
        this.ocultarPorTeclado(false);
      }
    }, true);
  }

  // ============================================================
  // MOSTRAR / OCULTAR
  // ============================================================
  _hide() {
    if (this._isHidden) return;
    this._isHidden = true;
    this._nav.style.transform = 'translateY(100%)';
    
    // Notificar
    window.eventBus?.publicar('navigation:hide');
  }
  
  _show() {
    // Guardia: solo actuar si la barra está realmente oculta (si ya está
    // visible, no hacer nada). La versión anterior invertía esta condición
    // (`if (this._isHidden) return;`) y hacía que _show() no hiciera NADA
    // cuando la barra estaba oculta: tras ocultarse con scroll (o con el
    // teclado), la barra NUNCA volvía a mostrarse.
    if (!this._isHidden) return;
    // Con el teclado abierto la barra permanece oculta: mostrarla taparía
    // el campo activo (UX de teclado app-like).
    if (this._tecladoAbierto) return;
    this._isHidden = false;
    this._nav.style.transform = 'translateY(0)';
    
    // Notificar
    window.eventBus?.publicar('navigation:show');
  }
  
  // ============================================================
  // TECLADO: oculta la barra mientras un campo está enfocado (el teclado
  // virtual ocupa la parte inferior) y la restaura al desenfocar.
  // ============================================================
  ocultarPorTeclado(abierto) {
    this._tecladoAbierto = !!abierto;
    if (abierto) this._hide();
    else this._show();
  }
  
  // ============================================================
  // MÉTODOS PÚBLICOS
  // ============================================================

  // Mostrar permanentemente
  showPermanent() {
    if (this._scrollTimeout) {
      clearTimeout(this._scrollTimeout);
      this._scrollTimeout = null;
    }
    this._show();
  }
  
  // Obtener estado
  isHidden() {
    return this._isHidden;
  }
  
  // ============================================================
  // DESTRUIR
  // ============================================================
  destroy() {
    this._nav.style.transform = '';
    this._isHidden = false;
  }
}

// ============================================================
// Inicializar
// ============================================================

let navigationInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  // Esperar a que la barra esté renderizada
  setTimeout(() => {
    navigationInstance = new NavigationManager();
    window.navigationManager = navigationInstance;
  }, 500);
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NavigationManager };
}