class Store {
  constructor(estadoInicial = {}) {
    this._suscriptores = new Map();
    this._suscribirProfundo = new Map();
    this._clavesComputadas = new Map();
    this._historial = [];
    this._maxHistorial = 50;

    this._estado = this._crearProxy(this._clonar(estadoInicial), []);
  }

  obtener(clave) {
    if (!clave) return this._clonar(this._estado);
    if (clave.includes('.')) {
      return clave.split('.').reduce((obj, k) => obj != null ? obj[k] : undefined, this._estado);
    }
    const valor = this._estado[clave];
    return valor !== undefined && typeof valor === 'object' ? this._clonar(valor) : valor;
  }

  actualizar(clave, valor) {
    if (clave.includes('.')) {
      const partes = clave.split('.');
      const ultima = partes.pop();
      const padre = partes.reduce((obj, k) => obj[k], this._estado);
      padre[ultima] = this._clonar(valor);
      return;
    }
    const anterior = this._clonar(this._estado[clave]);
    this._estado[clave] = this._clonar(valor);
    this._notificar({ clave, valor: this._estado[clave], anterior, ruta: clave });
    this._registrarHistorial({ tipo: 'actualizar', clave, anterior, valor: this._clonar(valor) });
  }

  asignar(parcial) {
    const cambios = [];
    for (const [clave, valor] of Object.entries(parcial)) {
      const anterior = this._clonar(this._estado[clave]);
      this._estado[clave] = this._clonar(valor);
      cambios.push({ clave, anterior, valor: this._clonar(valor) });
    }
    this._notificar({ parcial: true, datos: this._clonar(parcial), cambios });
    for (const c of cambios) {
      this._notificar({ clave: c.clave, valor: c.valor, anterior: c.anterior, ruta: c.clave });
    }
  }

  computado(clave, fn, dependencias) {
    this._clavesComputadas.set(clave, { fn, dependencias, valor: null });
    const actualizar = () => {
      const nuevoValor = fn();
      const anterior = this._clavesComputadas.get(clave).valor;
      this._clavesComputadas.get(clave).valor = nuevoValor;
      if (JSON.stringify(anterior) !== JSON.stringify(nuevoValor)) {
        this._notificar({ clave, valor: nuevoValor, anterior, computado: true });
      }
    };
    for (const dep of dependencias) {
      this.suscribir(dep, actualizar);
    }
    this._clavesComputadas.get(clave).valor = fn();
    return this;
  }

  suscribir(clave, callback) {
    if (!this._suscriptores.has(clave)) {
      this._suscriptores.set(clave, new Set());
    }
    this._suscriptores.get(clave).add(callback);
    return () => this._suscriptores.get(clave)?.delete(callback);
  }

  suscribirProfundo(rutaBase, callback) {
    if (!this._suscribirProfundo.has(rutaBase)) {
      this._suscribirProfundo.set(rutaBase, new Set());
    }
    this._suscribirProfundo.get(rutaBase).add(callback);
    return () => this._suscribirProfundo.get(rutaBase)?.delete(callback);
  }

  deshacer() {
    if (this._historial.length === 0) return false;
    const entrada = this._historial.pop();
    if (entrada.clave) {
      this._estado[entrada.clave] = entrada.anterior;
      this._notificar({ clave: entrada.clave, valor: entrada.anterior, anterior: entrada.valor, deshecho: true });
    }
    return true;
  }

  limpiarHistorial() {
    this._historial = [];
  }

  _nodoProxy(ruta) {
    let obj = this._estado;
    for (const p of ruta) {
      if (obj && typeof obj === 'object') obj = obj[p];
      else return undefined;
    }
    return obj;
  }

  _crearProxy(obj, ruta) {
    if (obj === null || typeof obj !== 'object') return obj;

    const store = this;

    return new Proxy(obj, {
      get(target, prop) {
        if (prop === '_esProxy') return true;
        const valor = Reflect.get(target, prop);
        if (typeof valor === 'object' && valor !== null && !valor._esProxy) {
          return store._crearProxy(valor, [...ruta, prop]);
        }
        return valor;
      },
      set(target, prop, valor) {
        const rutaCompleta = [...ruta, prop].join('.');
        const anterior = Reflect.get(target, prop);

        if (!Reflect.set(target, prop, valor)) return false;

        const clonAnterior = store._clonar(anterior);
        const clonValor = store._clonar(valor);

        store._notificar({
          clave: rutaCompleta,
          valor: clonValor,
          anterior: clonAnterior,
          ruta: rutaCompleta
        });

        for (const [rutaBase, cbs] of store._suscribirProfundo) {
          if (rutaCompleta.startsWith(rutaBase)) {
            cbs.forEach(cb => {
              try { cb(rutaCompleta, clonValor, clonAnterior); } catch (e) { console.warn(e); }
            });
          }
        }

        store._notificar({ parcial: true, datos: { [rutaCompleta]: clonValor } });
        store._registrarHistorial({ tipo: 'proxy', clave: rutaCompleta, anterior: clonAnterior, valor: clonValor });
        return true;
      },
      deleteProperty(target, prop) {
        if (!(prop in target)) return false;
        const anterior = Reflect.get(target, prop);
        const rutaCompleta = [...ruta, prop].join('.');
        if (!Reflect.deleteProperty(target, prop)) return false;

        store._notificar({
          clave: rutaCompleta,
          valor: undefined,
          anterior: store._clonar(anterior),
          ruta: rutaCompleta,
          eliminado: true
        });
        return true;
      }
    });
  }

  _notificar(cambio) {
    if (cambio.clave) {
      this._suscriptores.get(cambio.clave)?.forEach(cb => {
        try { cb(cambio.valor, cambio.anterior, cambio); } catch (e) { console.warn(e); }
      });
    }
    this._suscriptores.get('*')?.forEach(cb => {
      try { cb(cambio); } catch (e) { console.warn(e); }
    });
  }

  _registrarHistorial(entrada) {
    this._historial.push(entrada);
    if (this._historial.length > this._maxHistorial) {
      this._historial.shift();
    }
  }

  _clonar(valor) {
    if (valor === undefined || valor === null) return valor;
    if (typeof valor === 'object' && valor._esProxy) {
      return JSON.parse(JSON.stringify(valor));
    }
    try {
      return structuredClone(valor);
    } catch {
      return JSON.parse(JSON.stringify(valor));
    }
  }
}

window.store = new Store({
  usuario: null,
  sesion: null,
  rutaActual: '/',
  progreso: {},
  libroActual: null,
  capituloActual: null,
  examenActual: null,
  modoAltoContraste: false,
  modoLetraGrande: false,
  online: navigator.onLine,
  sincronizando: false,
  ultimaSincronizacion: null,
  notificaciones: [],
  preferencias: {
    tema: null,
    altoContraste: false,
    letraGrande: false
  }
});
