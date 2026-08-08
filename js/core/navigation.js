// ============================================================
// js/core/navigation.js - Barra de navegación inteligente
// ============================================================

class NavigationManager {
  constructor() {
    this._nav = document.getElementById('barra-navegacion');
    this._lastScrollY = 0;
    this._isHidden = false;
    this._threshold = 50;
    this._isScrolling = false;
    this._scrollTimeout = null;
    this._tecladoAbierto = false;
    
    this._init();
  }
  
  _init() {
    if (!this._nav) return;
    
    // Solo en móvil (pantallas menores a 768px)
    if (window.innerWidth < 768) {
      this._attachScrollListener();
      this._attachTouchListener();
    }
    
    // Escuchar cambios de tamaño
    window.addEventListener('resize', () => {
      if (window.innerWidth < 768) {
        this._attachScrollListener();
      } else {
        this._detachScrollListener();
        this._show();
      }
    });
  }
  
  // ============================================================
  // SCROLL LISTENER
  // ============================================================
  _attachScrollListener() {
    if (this._scrollListener) return;
    
    this._scrollListener = this._handleScroll.bind(this);
    document.addEventListener('scroll', this._scrollListener, { passive: true });
  }
  
  _detachScrollListener() {
    if (this._scrollListener) {
      document.removeEventListener('scroll', this._scrollListener);
      this._scrollListener = null;
    }
  }
  
  _handleScroll() {
    // No ocultar si el usuario está en la parte superior
    if (window.scrollY < 50) {
      this._show();
      return;
    }
    
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - this._lastScrollY;
    
    // Si el scroll es hacia abajo y pasó el umbral
    if (delta > this._threshold && !this._isHidden) {
      this._hide();
    }
    // Si el scroll es hacia arriba
    else if (delta < -this._threshold && this._isHidden) {
      this._show();
    }
    
    this._lastScrollY = currentScrollY;
  }
  
  // ============================================================
  // TOUCH LISTENER (para evitar ocultar al tocar la barra)
  // ============================================================
  _attachTouchListener() {
    this._nav.addEventListener('touchstart', () => {
      this._show();
      // Cancelar cualquier ocultación pendiente
      if (this._scrollTimeout) {
        clearTimeout(this._scrollTimeout);
        this._scrollTimeout = null;
      }
    }, { passive: true });
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
    if (this._isHidden) return;
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
  
  // Ocultar temporalmente (ej: al abrir teclado)
  hideTemporarily() {
    if (this._scrollTimeout) {
      clearTimeout(this._scrollTimeout);
    }
    this._hide();
    
    // Mostrar después de 3 segundos si no hay interacción
    this._scrollTimeout = setTimeout(() => {
      if (this._isHidden) {
        this._show();
      }
      this._scrollTimeout = null;
    }, 3000);
  }
  
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
    this._detachScrollListener();
    this._nav.style.transform = '';
    this._isHidden = false;
    window.removeEventListener('resize', this._resizeListener);
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