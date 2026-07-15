class EventBus {
  constructor() {
    this._suscriptores = new Map();
  }

  suscribir(evento, callback) {
    if (!this._suscriptores.has(evento)) {
      this._suscriptores.set(evento, new Set());
    }
    this._suscriptores.get(evento).add(callback);
    return () => this._suscriptores.get(evento)?.delete(callback);
  }

  publicar(evento, datos) {
    this._suscriptores.get(evento)?.forEach(cb => {
      try { cb(datos); } catch (e) { console.warn(`Error en evento ${evento}:`, e); }
    });
  }

}

window.eventBus = new EventBus();
