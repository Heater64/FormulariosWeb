class Store {
  constructor(estadoInicial = {}) {
    this._estado = this._clonar(estadoInicial);
    this._suscriptores = new Map();
  }

  obtener(clave) {
    const valor = this._estado[clave];
    return valor !== undefined ? (Array.isArray(valor) ? [...valor] : (typeof valor === 'object' && valor !== null ? {...valor} : valor)) : undefined;
  }

  actualizar(clave, valor) {
    const anterior = this._estado[clave];
    this._estado[clave] = this._clonar(valor);
    this._notificar({ clave, valor: this._estado[clave], anterior });
  }

  asignar(parcial) {
    for (const [clave, valor] of Object.entries(parcial)) {
      this._estado[clave] = this._clonar(valor);
    }
    this._notificar({ parcial: true, datos: this._clonar(parcial) });
  }

  _notificar(cambio) {
    if (cambio.clave) {
      this._suscriptores.get(cambio.clave)?.forEach(cb => {
        try { cb(cambio.valor, cambio.anterior); } catch (e) { console.warn(e); }
      });
    }
    this._suscriptores.get('*')?.forEach(cb => {
      try { cb(cambio); } catch (e) { console.warn(e); }
    });
  }

  _clonar(valor) {
    if (valor === undefined || valor === null) return valor;
    try { return structuredClone(valor); } catch { return JSON.parse(JSON.stringify(valor)); }
  }
}

window.store = new Store({
  usuario: null,
  sesion: null,
  rutaActual: '/',
  progreso: {},
  examenActual: null,
  modoAltoContraste: false,
  modoLetraGrande: false
});
