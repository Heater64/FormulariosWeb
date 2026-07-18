class EventBus {
  constructor() {
    this._suscriptores = new Map();
    this._suscriptoresWildcard = [];
    this._historialEventos = new Map();
    this._maxHistorial = 20;
  }

  suscribir(evento, callback, opciones = {}) {
    if (evento.includes('*')) {
      const patron = new RegExp('^' + evento.replace(/\*/g, '.*') + '$');
      const entrada = { patron, callback, unaVez: opciones.unaVez || false };
      this._suscriptoresWildcard.push(entrada);
      return () => {
        const idx = this._suscriptoresWildcard.indexOf(entrada);
        if (idx >= 0) this._suscriptoresWildcard.splice(idx, 1);
      };
    }

    if (!this._suscriptores.has(evento)) {
      this._suscriptores.set(evento, new Set());
    }
    this._suscriptores.get(evento).add(callback);

    if (opciones.unaVez) {
      const wrapper = (datos) => {
        callback(datos);
        this._suscriptores.get(evento)?.delete(wrapper);
      };
      this._suscriptores.get(evento).delete(callback);
      this._suscriptores.get(evento).add(wrapper);
      return () => this._suscriptores.get(evento)?.delete(wrapper);
    }

    return () => this._suscriptores.get(evento)?.delete(callback);
  }

  suscribirUnaVez(evento, callback) {
    return this.suscribir(evento, callback, { unaVez: true });
  }

  async publicar(evento, datos) {
    this._guardarHistorial(evento, datos);

    const callbacks = [...(this._suscriptores.get(evento) || [])];
    const resultados = [];

    for (const cb of callbacks) {
      try {
        resultados.push(cb(datos));
      } catch (e) {
        console.warn(`Error en evento ${evento}:`, e);
      }
    }

    for (const entrada of this._suscriptoresWildcard) {
      if (entrada.patron.test(evento)) {
        try {
          resultados.push(entrada.callback(datos, evento));
          if (entrada.unaVez) {
            const idx = this._suscriptoresWildcard.indexOf(entrada);
            if (idx >= 0) this._suscriptoresWildcard.splice(idx, 1);
          }
        } catch (e) {
          console.warn(`Error en evento wildcard ${evento}:`, e);
        }
      }
    }

    await Promise.allSettled(resultados.filter(r => r instanceof Promise));
  }

  esperar(evento, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        limpia();
        reject(new Error(`Timeout esperando evento: ${evento}`));
      }, timeout);
      const limpia = this.suscribirUnaVez(evento, (datos) => {
        clearTimeout(timer);
        resolve(datos);
      });
    });
  }

  ultimoEvento(evento) {
    return this._historialEventos.get(evento) || null;
  }

  limpiar() {
    this._suscriptores.clear();
    this._suscriptoresWildcard = [];
    this._historialEventos.clear();
  }

  _guardarHistorial(evento, datos) {
    if (!this._historialEventos.has(evento)) {
      this._historialEventos.set(evento, []);
    }
    const historial = this._historialEventos.get(evento);
    historial.push({ timestamp: Date.now(), datos });
    if (historial.length > this._maxHistorial) {
      historial.shift();
    }
  }
}

window.eventBus = new EventBus();
