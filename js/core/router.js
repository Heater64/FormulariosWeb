class Router {
  constructor() {
    this._rutas = new Map();
    this._vistaActual = null;
    window.addEventListener('hashchange', () => this._ejecutar());
  }

  registrar(ruta, vista) {
    const patron = ruta.replace(/:(\w+)/g, '(?<$1>[^/]+)');
    this._rutas.set(ruta, { patron: new RegExp(`^${patron}$`), vista });
  }

  navegar(ruta) {
    window.location.hash = `#!${ruta}`;
  }

  reemplazar(ruta) {
    window.location.replace(`#!${ruta}`);
  }

  _rutaActual() {
    const hash = window.location.hash;
    return hash.startsWith('#!') ? hash.slice(2) : '/';
  }

  async _ejecutar() {
    const ruta = this._rutaActual();
    for (const [, config] of this._rutas) {
      const match = ruta.match(config.patron);
      if (match) {
        const params = match.groups || {};
        if (this._vistaActual?.desmontar) this._vistaActual.desmontar();
        const raiz = document.getElementById('app-root');
        if (!raiz) return;
        raiz.innerHTML = '';
        this._vistaActual = config.vista;
        if (this._vistaActual.montar) await this._vistaActual.montar(raiz, params);
        store.actualizar('rutaActual', ruta);
        return;
      }
    }
    this._ir404();
  }

  _ir404() {
    const raiz = document.getElementById('app-root');
    if (raiz) raiz.innerHTML = `<div class="o-contenedor u-texto-centrado u-mt-4"><h1>404</h1><p>Página no encontrada</p></div>`;
  }

  irAtras() {
    window.history.back();
  }
}

window.router = new Router();
